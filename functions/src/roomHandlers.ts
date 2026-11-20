import { randomInt } from 'crypto';
import { DbLike, DocRefLike, DocSnapLike, FunctionActionError, TxLike } from './errors';
import {
  ServerRoomPlayer,
  buildServerTurnOrder,
  evaluateOnlineWin,
  tallyVotesServer,
} from './gameLogic';
import {
  PlayerProfileEntry,
  PrivateGameStateDoc,
  applyMatchSettlementWrites,
  readPlayerProfileDocs,
} from './matchSettlement';
import {
  RATE_LIMITS,
  assertNotRateLimitBlocked,
  enforceRateLimit,
  evaluateRateLimitInTx,
  getRateLimitDocRef,
} from './rateLimit';

export interface RoomHandlerDeps {
  db: DbLike;
  serverTimestamp: () => any;
  now?: () => number;
  toTimestamp?: (ms: number) => any;
}

const ALLOWED_LANGUAGES = new Set(['ar', 'en', 'fr', 'es', 'de', 'tr', 'pt']);
const ALLOWED_CATEGORIES = new Set(['standard', 'animals', 'food', 'places', 'objects']);

function getCurrentTime(deps: RoomHandlerDeps): number {
  return deps.now ? deps.now() : Date.now();
}

function getRateDeps(deps: RoomHandlerDeps) {
  return { db: deps.db, now: deps.now, toTimestamp: deps.toTimestamp };
}

function assertSafeId(value: unknown, label = 'identifier'): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{2,128}$/.test(value.trim())) {
    throw new FunctionActionError('invalid-argument', `Invalid ${label}.`);
  }
  return value.trim();
}

function sanitizePlainText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function sanitizeRoomSettings(raw: any) {
  const maxPlayersNum = Number(raw?.maxPlayers ?? 8);
  const maxPlayers = Number.isFinite(maxPlayersNum)
    ? Math.max(3, Math.min(10, Math.round(maxPlayersNum)))
    : 8;

  const language =
    typeof raw?.language === 'string' && ALLOWED_LANGUAGES.has(raw.language)
      ? raw.language
      : 'ar';

  const category =
    typeof raw?.category === 'string' && ALLOWED_CATEGORIES.has(raw.category)
      ? raw.category
      : 'standard';

  const difficulty: 'easy' | 'hard' = raw?.difficulty === 'hard' ? 'hard' : 'easy';

  const turnNum = Number(raw?.turnDurationSeconds ?? 45);
  const turnDurationSeconds = Number.isFinite(turnNum)
    ? Math.max(15, Math.min(180, Math.round(turnNum)))
    : 45;

  const isPrivate = Boolean(raw?.isPrivate);

  return { maxPlayers, language, category, difficulty, turnDurationSeconds, isPrivate };
}

function generateRoomCode(): string {
  return String(randomInt(100000, 1000000));
}

async function resolveCallerPlayerInfo(
  db: DbLike,
  uid: string,
  authToken: any
): Promise<{ name: string; avatar: string }> {
  const [pubSnap, userSnap] = await Promise.all([
    db.collection('publicProfiles').doc(uid).get(),
    db.collection('users').doc(uid).get(),
  ]);
  const src = (pubSnap.exists ? pubSnap.data() : userSnap.exists ? userSnap.data() : null) || {};
  const rawName =
    (typeof src.displayName === 'string' && src.displayName.trim()) ||
    (typeof authToken?.name === 'string' && authToken.name.trim()) ||
    'لاعب جديد';
  const rawAvatar =
    (typeof src.photoURL === 'string' && src.photoURL) ||
    (typeof authToken?.picture === 'string' && authToken.picture) ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;
  return {
    name: rawName.slice(0, 40),
    avatar: rawAvatar.slice(0, 2097152),
  };
}

async function cleanupEmptyRoomDocs(db: DbLike, roomId: string): Promise<void> {
  const roomRef = db.collection('rooms').doc(roomId);
  const [privatePlayersSnap, metaSnap, stateSnap] = await Promise.all([
    roomRef.collection('privatePlayers').get(),
    roomRef.collection('privateMeta').doc('invite').get(),
    roomRef.collection('privateState').doc('current').get(),
  ]);

  const batch = db.batch();
  privatePlayersSnap.docs.forEach((d) => batch.delete(d.ref));
  if (metaSnap.exists) {
    const code = metaSnap.data()?.secretCode;
    if (typeof code === 'string' && code) {
      batch.delete(db.collection('roomCodes').doc(code));
    }
    batch.delete(metaSnap.ref!);
  }
  if (stateSnap.exists) {
    batch.delete(stateSnap.ref!);
  }
  batch.delete(roomRef);
  await batch.commit();
}

function cleanVotesForRemovedPlayer(
  votesByUid: Record<string, string> | undefined,
  removedUid: string
): Record<string, string> {
  const cleaned: Record<string, string> = {};
  Object.entries(votesByUid || {}).forEach(([voter, target]) => {
    if (voter !== removedUid && target !== removedUid) {
      cleaned[voter] = target;
    }
  });
  return cleaned;
}

/**
 * Shared transactional room member removal handler used by both leaveRoom and kickPlayer.
 * Ensures active-match state (votes, ready list, turn order, guesser, infiltrator counts,
 * win checks, and host migration) remains completely consistent without stale references.
 */
function applyMemberRemovalInTx(params: {
  deps: RoomHandlerDeps;
  tx: TxLike;
  roomRef: DocRefLike;
  roomSnap: DocSnapLike;
  privateStateRef: DocRefLike;
  privateStateSnap: DocSnapLike;
  profileMap: Map<string, PlayerProfileEntry>;
  targetUid: string;
  addToKicked: boolean;
}): { shouldDeleteRoom: boolean } {
  const {
    deps,
    tx,
    roomRef,
    roomSnap,
    privateStateRef,
    privateStateSnap,
    profileMap,
    targetUid,
    addToKicked,
  } = params;

  const data = roomSnap.data()!;
  const players: ServerRoomPlayer[] = Array.isArray(data.players) ? data.players : [];
  const remainingPlayers = players.filter((p) => p.uid !== targetUid);

  if (remainingPlayers.length === 0) {
    return { shouldDeleteRoom: true };
  }

  const privateState = privateStateSnap.exists
    ? (privateStateSnap.data() as PrivateGameStateDoc)
    : null;

  const extraUpdates: Record<string, any> = {};
  if (addToKicked) {
    extraUpdates.kickedPlayers = Array.from(
      new Set([...(Array.isArray(data.kickedPlayers) ? data.kickedPlayers : []), targetUid])
    );
  }
  if (data.hostId === targetUid) {
    const nextHost = remainingPlayers[0];
    extraUpdates.hostId = nextHost.uid;
    extraUpdates.hostName = nextHost.name;
    extraUpdates.hostAvatar = nextHost.avatar;
  }

  tx.delete(roomRef.collection('privatePlayers').doc(targetUid));

  const activePhase = data.gameState?.phase;
  const isActiveMatch =
    data.status === 'playing' &&
    Boolean(privateState) &&
    Boolean(activePhase) &&
    !['SETUP_PENDING', 'CATEGORY_SELECT', 'RESULT'].includes(activePhase);

  if (!isActiveMatch || !privateState) {
    tx.update(roomRef, {
      ...extraUpdates,
      players: remainingPlayers,
      playerIds: remainingPlayers.map((p) => p.uid),
      updatedAt: deps.serverTimestamp(),
    });
    return { shouldDeleteRoom: false };
  }

  const cleanedVotesByUid = cleanVotesForRemovedPlayer(privateState.votesByUid, targetUid);
  const cleanedPrivateState: PrivateGameStateDoc = {
    ...privateState,
    votesByUid: cleanedVotesByUid,
  };

  const winCheck = evaluateOnlineWin(remainingPlayers, cleanedPrivateState.rolesByUid);
  if (winCheck.isOver && winCheck.winner && winCheck.winReason) {
    applyMatchSettlementWrites({
      db: deps.db,
      serverTimestamp: deps.serverTimestamp,
      tx,
      roomRef,
      roomData: { ...data, ...extraUpdates },
      privateStateRef,
      privateState: cleanedPrivateState,
      players: remainingPlayers,
      profileMap,
      winner: winCheck.winner,
      winReason: winCheck.winReason,
      extraRoomUpdates: extraUpdates,
    });
    return { shouldDeleteRoom: false };
  }

  const gameState = { ...(data.gameState || {}) };
  const nowMs = getCurrentTime(deps);
  const turnDuration = Number(data.turnDurationSeconds || 45);
  const alivePlayers = remainingPlayers.filter((p) => !p.isEliminated);
  const aliveSet = new Set(alivePlayers.map((p) => p.uid));
  let shouldUpdatePrivateStateVotes =
    JSON.stringify(privateState.votesByUid || {}) !== JSON.stringify(cleanedVotesByUid);
  let privateStateRoundPatch: number | undefined;

  if (gameState.phase === 'REVEAL') {
    gameState.readyPlayers = (gameState.readyPlayers || []).filter((id: string) => id !== targetUid);
    if (gameState.readyPlayers.length >= remainingPlayers.length) {
      gameState.phase = 'PLAYING';
      gameState.round = 1;
      gameState.readyPlayers = [];
      gameState.turnOrder = buildServerTurnOrder(remainingPlayers, privateState.rolesByUid, 1);
      gameState.currentTurnIndex = 0;
      gameState.turnEndsAt = nowMs + turnDuration * 1000;
      gameState.turnsCompleted = false;
      gameState.clues = [];
    }
  } else if (gameState.phase === 'PLAYING' && !gameState.turnsCompleted) {
    const prevOrder: string[] = Array.isArray(gameState.turnOrder) ? gameState.turnOrder : [];
    const prevIndex = Number(gameState.currentTurnIndex || 0);
    const activeUid = prevOrder[prevIndex];
    const removedIdx = prevOrder.indexOf(targetUid);
    const filteredOrder = prevOrder.filter((id) => id !== targetUid && aliveSet.has(id));

    let nextIndex = prevIndex;
    if (removedIdx !== -1 && removedIdx < prevIndex) {
      nextIndex = Math.max(0, nextIndex - 1);
    }
    // Map pre-filter position onto filteredOrder by finding the first surviving item at or after prevIndex
    if (prevOrder.length > 0) {
      const candidateIdsAfter = prevOrder
        .slice(activeUid === targetUid ? prevIndex + 1 : prevIndex)
        .filter((id) => id !== targetUid && aliveSet.has(id));
      if (candidateIdsAfter.length === 0) {
        gameState.turnOrder = filteredOrder;
        gameState.currentTurnIndex = filteredOrder.length;
        gameState.turnsCompleted = true;
        gameState.turnEndsAt = null;
      } else {
        const nextSpeakerUid = candidateIdsAfter[0];
        const resolvedIndex = filteredOrder.indexOf(nextSpeakerUid);
        gameState.turnOrder = filteredOrder;
        gameState.currentTurnIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
        if (activeUid === targetUid) {
          gameState.turnEndsAt = nowMs + turnDuration * 1000;
        }
        gameState.turnsCompleted = false;
      }
    } else {
      gameState.turnOrder = filteredOrder;
      gameState.currentTurnIndex = Math.min(nextIndex, filteredOrder.length);
    }
  } else if (gameState.phase === 'VOTING') {
    const validVotedUids = Array.from(
      new Set(Object.keys(cleanedVotesByUid).filter((v) => aliveSet.has(v)))
    );
    gameState.votedUids = validVotedUids;

    if (alivePlayers.length > 0 && validVotedUids.length >= alivePlayers.length) {
      const tally = tallyVotesServer(cleanedVotesByUid, aliveSet);
      if (tally) {
        gameState.phase = 'REVEAL_VOTE_RESULT';
        gameState.mostVotedId = tally.mostVotedId;
        gameState.mostVotedRevealedRole = privateState.rolesByUid[tally.mostVotedId] || 'citizen';
        gameState.votersForEliminated = Object.entries(cleanedVotesByUid)
          .filter(([, target]) => target === tally.mostVotedId)
          .map(([voter]) => voter);
        gameState.tieBroken = tally.tieBroken;
      }
    }
  } else if (gameState.phase === 'REVEAL_VOTE_RESULT') {
    gameState.votersForEliminated = (gameState.votersForEliminated || []).filter(
      (id: string) => id !== targetUid
    );
    if (gameState.mostVotedId === targetUid) {
      const nextRound = Number(gameState.round || 1) + 1;
      gameState.phase = 'PLAYING';
      gameState.round = nextRound;
      gameState.turnOrder = buildServerTurnOrder(
        remainingPlayers,
        privateState.rolesByUid,
        nextRound
      );
      gameState.currentTurnIndex = 0;
      gameState.turnEndsAt = nowMs + turnDuration * 1000;
      gameState.turnsCompleted = false;
      gameState.votedUids = [];
      gameState.mostVotedId = null;
      gameState.mostVotedRevealedRole = null;
      gameState.votersForEliminated = [];
      gameState.votingStartedAt = null;
      gameState.tieBroken = false;
      shouldUpdatePrivateStateVotes = true;
      privateStateRoundPatch = nextRound;
    }
  } else if (gameState.phase === 'IMPOSTOR_GUESS') {
    if (gameState.guesserUid === targetUid || gameState.mostVotedId === targetUid) {
      const nextRound = Number(gameState.round || 1) + 1;
      gameState.phase = 'PLAYING';
      gameState.round = nextRound;
      gameState.turnOrder = buildServerTurnOrder(
        remainingPlayers,
        privateState.rolesByUid,
        nextRound
      );
      gameState.currentTurnIndex = 0;
      gameState.turnEndsAt = nowMs + turnDuration * 1000;
      gameState.turnsCompleted = false;
      gameState.votedUids = [];
      gameState.mostVotedId = null;
      gameState.mostVotedRevealedRole = null;
      gameState.votersForEliminated = [];
      gameState.guesserUid = null;
      gameState.votingStartedAt = null;
      gameState.tieBroken = false;
      shouldUpdatePrivateStateVotes = true;
      privateStateRoundPatch = nextRound;
    }
  }

  const isEasy = (gameState.difficulty || data.difficulty || 'easy') === 'easy';
  const aliveInfiltratorsCount = remainingPlayers.filter((p) => {
    if (p.isEliminated) return false;
    const r = privateState.rolesByUid[p.uid];
    return r === 'mrwhite' || r === 'undercover';
  }).length;
  const aliveMrWhiteCount = remainingPlayers.filter(
    (p) => !p.isEliminated && privateState.rolesByUid[p.uid] === 'mrwhite'
  ).length;
  const aliveUndercoverCount = remainingPlayers.filter(
    (p) => !p.isEliminated && privateState.rolesByUid[p.uid] === 'undercover'
  ).length;

  gameState.aliveInfiltratorsCount = aliveInfiltratorsCount;
  gameState.mrWhiteCount = isEasy ? aliveMrWhiteCount : null;
  gameState.undercoverCount = isEasy ? aliveUndercoverCount : null;

  if (shouldUpdatePrivateStateVotes) {
    tx.update(privateStateRef, {
      votesByUid: privateStateRoundPatch !== undefined ? {} : cleanedVotesByUid,
      ...(privateStateRoundPatch !== undefined ? { round: privateStateRoundPatch } : {}),
      updatedAt: deps.serverTimestamp(),
    });
  }

  tx.update(roomRef, {
    ...extraUpdates,
    players: remainingPlayers,
    playerIds: remainingPlayers.map((p) => p.uid),
    gameState,
    updatedAt: deps.serverTimestamp(),
  });

  return { shouldDeleteRoom: false };
}

export async function executeCreateRoom(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  authToken: any,
  dataIn: any
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  await enforceRateLimit(getRateDeps(deps), uid, RATE_LIMITS.createRoom);
  const settings = sanitizeRoomSettings(dataIn || {});
  const hostInfo = await resolveCallerPlayerInfo(deps.db, uid, authToken);

  for (let attempt = 0; attempt < 5; attempt++) {
    const secretCode = generateRoomCode();
    const roomRef = deps.db.collection('rooms').doc();
    const codeRef = deps.db.collection('roomCodes').doc(secretCode);
    const metaRef = roomRef.collection('privateMeta').doc('invite');

    try {
      await deps.db.runTransaction(async (tx) => {
        const [codeSnap, userSnap, pubSnap] = await Promise.all([
          tx.get(codeRef),
          tx.get(deps.db.collection('users').doc(uid)),
          tx.get(deps.db.collection('publicProfiles').doc(uid)),
        ]);

        if (codeSnap.exists) {
          throw new Error('CODE_COLLISION');
        }

        const hostPlayer: ServerRoomPlayer = {
          uid,
          name: hostInfo.name,
          avatar: hostInfo.avatar,
          isReady: false,
          isEliminated: false,
          score: 0,
          revealedRole: null,
        };

        tx.set(roomRef, {
          id: roomRef.id,
          hostId: uid,
          hostName: hostInfo.name,
          hostAvatar: hostInfo.avatar,
          status: 'waiting',
          isPrivate: settings.isPrivate,
          hasSecretCode: true,
          maxPlayers: settings.maxPlayers,
          language: settings.language,
          category: settings.category,
          difficulty: settings.difficulty,
          turnDurationSeconds: settings.turnDurationSeconds,
          playerIds: [uid],
          players: [hostPlayer],
          kickedPlayers: [],
          messages: [],
          gameState: null,
          createdAt: deps.serverTimestamp(),
          updatedAt: deps.serverTimestamp(),
        });

        tx.set(metaRef, {
          secretCode,
          roomId: roomRef.id,
          createdAt: deps.serverTimestamp(),
        });

        tx.set(codeRef, {
          roomId: roomRef.id,
          hostId: uid,
          createdAt: deps.serverTimestamp(),
        });

        if (userSnap.exists) {
          const stats = userSnap.data()?.stats || {};
          tx.update(userSnap.ref!, {
            'stats.hosted': Number(stats.hosted || 0) + 1,
            updatedAt: deps.serverTimestamp(),
          });
        }
        if (pubSnap.exists) {
          const stats = pubSnap.data()?.stats || {};
          tx.update(pubSnap.ref!, {
            'stats.hosted': Number(stats.hosted || 0) + 1,
            updatedAt: deps.serverTimestamp(),
          });
        }
      });

      return { roomId: roomRef.id, secretCode };
    } catch (err: any) {
      if (err?.message === 'CODE_COLLISION') {
        continue;
      }
      throw err;
    }
  }

  throw new FunctionActionError('resource-exhausted', 'Could not allocate unique room code.');
}

export async function executeJoinRoom(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  authToken: any,
  dataIn: { roomId?: unknown; secretCode?: unknown }
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  await enforceRateLimit(getRateDeps(deps), uid, RATE_LIMITS.joinRoom);

  const rawRoomId = typeof dataIn?.roomId === 'string' ? dataIn.roomId.trim() : '';
  const rawCode = typeof dataIn?.secretCode === 'string' ? dataIn.secretCode.trim() : '';

  let targetRoomId = rawRoomId;
  if (!targetRoomId && rawCode) {
    if (!/^\d{4,8}$/.test(rawCode)) {
      throw new FunctionActionError('invalid-argument', 'Invalid room code format.');
    }
    const codeSnap = await deps.db.collection('roomCodes').doc(rawCode).get();
    if (!codeSnap.exists) {
      return { success: false, reason: 'roomNotFound' };
    }
    targetRoomId = codeSnap.data()?.roomId || '';
  }

  targetRoomId = assertSafeId(targetRoomId, 'room ID');

  const callerInfo = await resolveCallerPlayerInfo(deps.db, uid, authToken);
  const roomRef = deps.db.collection('rooms').doc(targetRoomId);
  const inviteRef = roomRef.collection('privateMeta').doc('invite');

  return deps.db.runTransaction(async (tx) => {
    const [snap, inviteSnap] = await Promise.all([tx.get(roomRef), tx.get(inviteRef)]);
    if (!snap.exists) {
      return { success: false, reason: 'roomNotFound' };
    }

    const data = snap.data()!;
    const kickedPlayers: string[] = Array.isArray(data.kickedPlayers) ? data.kickedPlayers : [];
    if (kickedPlayers.includes(uid)) {
      return { success: false, reason: 'kickedFromRoom' };
    }

    const players: ServerRoomPlayer[] = Array.isArray(data.players) ? data.players : [];
    const alreadyInRoom = players.some((p) => p.uid === uid);
    if (alreadyInRoom) {
      return { success: true, roomId: targetRoomId, alreadyJoined: true };
    }

    const inviteSecret = inviteSnap.exists ? inviteSnap.data()?.secretCode : undefined;
    if (data.isPrivate === true) {
      if (!rawCode || typeof inviteSecret !== 'string' || rawCode !== inviteSecret) {
        throw new FunctionActionError(
          'permission-denied',
          'Valid invitation code required to join a private room.'
        );
      }
    } else if (rawCode && typeof inviteSecret === 'string' && rawCode !== inviteSecret) {
      throw new FunctionActionError('permission-denied', 'Invalid room invite code.');
    }

    if (data.status !== 'waiting') {
      return { success: false, reason: 'matchAlreadyStarted' };
    }

    if (players.length >= Number(data.maxPlayers || 8)) {
      return { success: false, reason: 'roomFull' };
    }

    const nextPlayer: ServerRoomPlayer = {
      uid,
      name: callerInfo.name,
      avatar: callerInfo.avatar,
      isReady: false,
      isEliminated: false,
      score: 0,
      revealedRole: null,
    };

    const nextPlayers = [...players, nextPlayer];
    const nextPlayerIds = Array.from(new Set(nextPlayers.map((p) => p.uid)));

    tx.update(roomRef, {
      players: nextPlayers,
      playerIds: nextPlayerIds,
      updatedAt: deps.serverTimestamp(),
    });

    return { success: true, roomId: targetRoomId };
  });
}

export async function executeQuickJoinRoom(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  authToken: any
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  await enforceRateLimit(getRateDeps(deps), uid, RATE_LIMITS.quickJoinRoom);
  const callerInfo = await resolveCallerPlayerInfo(deps.db, uid, authToken);

  const candidatesSnap = await deps.db
    .collection('rooms')
    .where('isPrivate', '==', false)
    .where('status', '==', 'waiting')
    .limit(25)
    .get();

  const sortedRooms = candidatesSnap.docs
    .map((d) => ({ id: d.id, data: d.data() as Record<string, any> | undefined }))
    .filter(({ data }) => {
      const players: any[] = Array.isArray(data?.players) ? data.players : [];
      const kicked: string[] = Array.isArray(data?.kickedPlayers) ? data.kickedPlayers : [];
      return !kicked.includes(uid) && players.length < Number(data?.maxPlayers || 8);
    })
    .sort((a, b) => (b.data?.players?.length || 0) - (a.data?.players?.length || 0));

  for (const candidate of sortedRooms) {
    const roomRef = deps.db.collection('rooms').doc(candidate.id);
    const joined = await deps.db.runTransaction(async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists) return false;
      const data = snap.data()!;
      if (data.status !== 'waiting' || data.isPrivate) return false;
      const kicked: string[] = Array.isArray(data.kickedPlayers) ? data.kickedPlayers : [];
      if (kicked.includes(uid)) return false;
      const players: ServerRoomPlayer[] = Array.isArray(data.players) ? data.players : [];
      if (players.some((p) => p.uid === uid)) return true;
      if (players.length >= Number(data.maxPlayers || 8)) return false;

      const nextPlayers = [
        ...players,
        {
          uid,
          name: callerInfo.name,
          avatar: callerInfo.avatar,
          isReady: false,
          isEliminated: false,
          score: 0,
          revealedRole: null,
        },
      ];
      tx.update(roomRef, {
        players: nextPlayers,
        playerIds: nextPlayers.map((p) => p.uid),
        updatedAt: deps.serverTimestamp(),
      });
      return true;
    });

    if (joined) {
      return { success: true, roomId: candidate.id };
    }
  }

  return { success: false, roomId: null };
}

export async function executeLeaveRoom(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  dataIn: { roomId?: unknown }
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  const roomId = typeof dataIn?.roomId === 'string' ? dataIn.roomId.trim() : '';
  if (!roomId) return { success: true };

  const roomRef = deps.db.collection('rooms').doc(roomId);
  const privateStateRef = roomRef.collection('privateState').doc('current');

  const result = await deps.db.runTransaction(async (tx) => {
    const [roomSnap, privateStateSnap] = await Promise.all([
      tx.get(roomRef),
      tx.get(privateStateRef),
    ]);
    if (!roomSnap.exists) return { shouldDeleteRoom: false };

    const data = roomSnap.data()!;
    const players: ServerRoomPlayer[] = Array.isArray(data.players) ? data.players : [];
    const remainingPlayers = players.filter((p) => p.uid !== uid);

    let profileMap = new Map<string, PlayerProfileEntry>();
    if (
      remainingPlayers.length > 0 &&
      data.status === 'playing' &&
      privateStateSnap.exists &&
      data.gameState?.phase &&
      !['SETUP_PENDING', 'CATEGORY_SELECT', 'RESULT'].includes(data.gameState.phase)
    ) {
      profileMap = await readPlayerProfileDocs(
        deps.db,
        tx,
        remainingPlayers.map((p) => p.uid)
      );
    }

    return applyMemberRemovalInTx({
      deps,
      tx,
      roomRef,
      roomSnap,
      privateStateRef,
      privateStateSnap,
      profileMap,
      targetUid: uid,
      addToKicked: false,
    });
  });

  if (result.shouldDeleteRoom) {
    await cleanupEmptyRoomDocs(deps.db, roomId);
  }

  return { success: true };
}

export async function executeKickPlayer(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  dataIn: { roomId?: unknown; targetUid?: unknown }
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  const roomId = assertSafeId(dataIn?.roomId, 'roomId');
  const targetUid = assertSafeId(dataIn?.targetUid, 'targetUid');
  if (targetUid === uid) {
    throw new FunctionActionError('invalid-argument', 'Invalid kick parameters.');
  }
  const rateDeps = getRateDeps(deps);
  assertNotRateLimitBlocked(rateDeps, uid, RATE_LIMITS.kickPlayer);

  const roomRef = deps.db.collection('rooms').doc(roomId);
  const privateStateRef = roomRef.collection('privateState').doc('current');
  const rateLimitRef = getRateLimitDocRef(deps.db, uid, RATE_LIMITS.kickPlayer);
  const nowMs = getCurrentTime(deps);

  const result = await deps.db.runTransaction(async (tx) => {
    const [roomSnap, privateStateSnap, rateSnap] = await Promise.all([
      tx.get(roomRef),
      tx.get(privateStateRef),
      tx.get(rateLimitRef),
    ]);
    if (!roomSnap.exists) throw new FunctionActionError('not-found', 'Room not found.');
    const data = roomSnap.data()!;
    if (data.hostId !== uid) {
      throw new FunctionActionError('permission-denied', 'Only host can kick players.');
    }

    const players: ServerRoomPlayer[] = Array.isArray(data.players) ? data.players : [];
    if (!players.some((p) => p.uid === targetUid)) {
      throw new FunctionActionError('not-found', 'Target player is not in this room.');
    }
    const remainingPlayers = players.filter((p) => p.uid !== targetUid);

    let profileMap = new Map<string, PlayerProfileEntry>();
    if (
      remainingPlayers.length > 0 &&
      data.status === 'playing' &&
      privateStateSnap.exists &&
      data.gameState?.phase &&
      !['SETUP_PENDING', 'CATEGORY_SELECT', 'RESULT'].includes(data.gameState.phase)
    ) {
      profileMap = await readPlayerProfileDocs(
        deps.db,
        tx,
        remainingPlayers.map((p) => p.uid)
      );
    }

    const nextRateDoc = evaluateRateLimitInTx(
      rateDeps,
      uid,
      RATE_LIMITS.kickPlayer,
      rateSnap.exists,
      rateSnap.exists ? rateSnap.data() : undefined,
      nowMs
    );
    tx.set(rateLimitRef, nextRateDoc);

    return applyMemberRemovalInTx({
      deps,
      tx,
      roomRef,
      roomSnap,
      privateStateRef,
      privateStateSnap,
      profileMap,
      targetUid,
      addToKicked: true,
    });
  });

  if (result.shouldDeleteRoom) {
    await cleanupEmptyRoomDocs(deps.db, roomId);
  }

  return { success: true };
}

export async function executeUpdateRoomSettings(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  dataIn: any
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  const roomId = assertSafeId(dataIn?.roomId, 'roomId');
  const rateDeps = getRateDeps(deps);
  assertNotRateLimitBlocked(rateDeps, uid, RATE_LIMITS.updateRoomSettings);

  const settings = sanitizeRoomSettings(dataIn || {});
  const roomRef = deps.db.collection('rooms').doc(roomId);
  const rateLimitRef = getRateLimitDocRef(deps.db, uid, RATE_LIMITS.updateRoomSettings);
  const nowMs = getCurrentTime(deps);

  await deps.db.runTransaction(async (tx) => {
    const [snap, rateSnap] = await Promise.all([tx.get(roomRef), tx.get(rateLimitRef)]);
    if (!snap.exists) throw new FunctionActionError('not-found', 'Room not found.');
    const data = snap.data()!;
    if (data.hostId !== uid) {
      throw new FunctionActionError('permission-denied', 'Only host can edit room settings.');
    }
    if (data.status !== 'waiting') {
      throw new FunctionActionError(
        'failed-precondition',
        'Cannot edit settings during active game.'
      );
    }

    const nextRateDoc = evaluateRateLimitInTx(
      rateDeps,
      uid,
      RATE_LIMITS.updateRoomSettings,
      rateSnap.exists,
      rateSnap.exists ? rateSnap.data() : undefined,
      nowMs
    );

    const playerCount = Array.isArray(data.players) ? data.players.length : 1;
    const safeMax = Math.max(Math.max(3, playerCount), settings.maxPlayers);

    tx.set(rateLimitRef, nextRateDoc);
    tx.update(roomRef, {
      maxPlayers: safeMax,
      language: settings.language,
      category: settings.category,
      difficulty: settings.difficulty,
      turnDurationSeconds: settings.turnDurationSeconds,
      isPrivate: settings.isPrivate,
      updatedAt: deps.serverTimestamp(),
    });
  });

  return { success: true };
}

export async function executePromoteHost(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  dataIn: { roomId?: unknown; targetUid?: unknown }
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  const roomId = assertSafeId(dataIn?.roomId, 'roomId');
  const targetUid = assertSafeId(dataIn?.targetUid, 'targetUid');
  if (targetUid === uid) {
    throw new FunctionActionError('invalid-argument', 'Invalid promoteHost parameters.');
  }
  const rateDeps = getRateDeps(deps);
  assertNotRateLimitBlocked(rateDeps, uid, RATE_LIMITS.promoteHost);

  const roomRef = deps.db.collection('rooms').doc(roomId);
  const rateLimitRef = getRateLimitDocRef(deps.db, uid, RATE_LIMITS.promoteHost);
  const nowMs = getCurrentTime(deps);

  await deps.db.runTransaction(async (tx) => {
    const [snap, rateSnap] = await Promise.all([tx.get(roomRef), tx.get(rateLimitRef)]);
    if (!snap.exists) throw new FunctionActionError('not-found', 'Room not found.');
    const data = snap.data()!;
    if (data.hostId !== uid) {
      throw new FunctionActionError('permission-denied', 'Only current host can promote.');
    }
    const targetPlayer = (data.players || []).find((p: ServerRoomPlayer) => p.uid === targetUid);
    if (!targetPlayer) {
      throw new FunctionActionError('not-found', 'Target player not in room.');
    }

    const nextRateDoc = evaluateRateLimitInTx(
      rateDeps,
      uid,
      RATE_LIMITS.promoteHost,
      rateSnap.exists,
      rateSnap.exists ? rateSnap.data() : undefined,
      nowMs
    );

    tx.set(rateLimitRef, nextRateDoc);
    tx.update(roomRef, {
      hostId: targetPlayer.uid,
      hostName: targetPlayer.name,
      hostAvatar: targetPlayer.avatar,
      updatedAt: deps.serverTimestamp(),
    });
  });

  return { success: true };
}

export async function executeToggleReady(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  dataIn: { roomId?: unknown }
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  const roomId = assertSafeId(dataIn?.roomId, 'roomId');
  const rateDeps = getRateDeps(deps);
  assertNotRateLimitBlocked(rateDeps, uid, RATE_LIMITS.toggleReady);

  const roomRef = deps.db.collection('rooms').doc(roomId);
  const rateLimitRef = getRateLimitDocRef(deps.db, uid, RATE_LIMITS.toggleReady);
  const nowMs = getCurrentTime(deps);

  await deps.db.runTransaction(async (tx) => {
    const [snap, rateSnap] = await Promise.all([tx.get(roomRef), tx.get(rateLimitRef)]);
    if (!snap.exists) throw new FunctionActionError('not-found', 'Room not found.');
    const data = snap.data()!;
    if (data.status !== 'waiting') {
      throw new FunctionActionError('failed-precondition', 'Match is already active.');
    }

    const players: ServerRoomPlayer[] = Array.isArray(data.players) ? data.players : [];
    const idx = players.findIndex((p) => p.uid === uid);
    if (idx === -1) {
      throw new FunctionActionError('permission-denied', 'You are not a member of this room.');
    }

    const nextRateDoc = evaluateRateLimitInTx(
      rateDeps,
      uid,
      RATE_LIMITS.toggleReady,
      rateSnap.exists,
      rateSnap.exists ? rateSnap.data() : undefined,
      nowMs
    );

    const updatedPlayers = players.map((p) =>
      p.uid === uid ? { ...p, isReady: !p.isReady } : p
    );

    tx.set(rateLimitRef, nextRateDoc);
    tx.update(roomRef, {
      players: updatedPlayers,
      updatedAt: deps.serverTimestamp(),
    });
  });

  return { success: true };
}

export async function executeSendRoomChat(
  deps: RoomHandlerDeps,
  uid: string | undefined,
  dataIn: { roomId?: unknown; text?: unknown }
) {
  if (!uid) throw new FunctionActionError('unauthenticated', 'Authentication required.');
  const roomId = assertSafeId(dataIn?.roomId, 'roomId');
  const text = sanitizePlainText(dataIn?.text, 200);
  if (!text) {
    throw new FunctionActionError('invalid-argument', 'Invalid chat message.');
  }
  const rateDeps = getRateDeps(deps);
  assertNotRateLimitBlocked(rateDeps, uid, RATE_LIMITS.sendRoomChat);

  const roomRef = deps.db.collection('rooms').doc(roomId);
  const rateLimitRef = getRateLimitDocRef(deps.db, uid, RATE_LIMITS.sendRoomChat);
  const nowMs = getCurrentTime(deps);
  const nowIso = new Date(nowMs).toISOString();

  await deps.db.runTransaction(async (tx) => {
    const [snap, rateSnap] = await Promise.all([tx.get(roomRef), tx.get(rateLimitRef)]);
    if (!snap.exists) throw new FunctionActionError('not-found', 'Room not found.');
    const data = snap.data()!;
    const players: ServerRoomPlayer[] = Array.isArray(data.players) ? data.players : [];
    const member = players.find((p) => p.uid === uid);
    if (!member) {
      throw new FunctionActionError('permission-denied', 'Only room members can send messages.');
    }

    const nextRateDoc = evaluateRateLimitInTx(
      rateDeps,
      uid,
      RATE_LIMITS.sendRoomChat,
      rateSnap.exists,
      rateSnap.exists ? rateSnap.data() : undefined,
      nowMs
    );

    const existing = Array.isArray(data.messages) ? data.messages : [];
    const msg = {
      id: `${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: uid,
      senderName: member.name,
      text,
      timestamp: nowIso,
    };
    tx.set(rateLimitRef, nextRateDoc);
    tx.update(roomRef, {
      messages: [...existing, msg].slice(-60),
      updatedAt: deps.serverTimestamp(),
    });
  });

  return { success: true };
}
