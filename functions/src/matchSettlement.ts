import { DbLike, DocRefLike, TxLike } from './errors';
import {
  OnlineRole,
  ServerRoomPlayer,
  calculateLevelFromXp,
  computePlayerOnlineReward,
  resolveOnlineWinningFaction,
} from './gameLogic';
import {
  ServerClueRecord,
  ServerMatchEvent,
  ServerRoundRecord,
  buildOnlineClassifiedCaseFile,
} from './caseFileBuilder';

export interface PrivateGameStateDoc {
  matchId: string;
  round: number;
  startedAtMs?: number;
  civilianWord: string;
  undercoverWord: string;
  decoys: string[];
  impostorIds: string[];
  undercoverIds: string[];
  rolesByUid: Record<string, OnlineRole>;
  rosterByUid?: Record<string, { name: string; avatar: string }>;
  votesByUid: Record<string, string>;
  cluesHistory?: ServerClueRecord[];
  roundHistory?: ServerRoundRecord[];
  matchEvents?: ServerMatchEvent[];
  settledMatches?: string[];
}

export type PlayerProfileEntry = {
  userExists: boolean;
  userData: any;
  pubExists: boolean;
  pubData: any;
};

export async function readPlayerProfileDocs(
  db: DbLike,
  tx: TxLike,
  uids: readonly string[]
): Promise<Map<string, PlayerProfileEntry>> {
  const uniqueUids = Array.from(new Set(uids));
  const refs = uniqueUids.flatMap((uid) => [
    db.collection('users').doc(uid),
    db.collection('publicProfiles').doc(uid),
  ]);

  const snaps = refs.length > 0 ? await tx.getAll(...refs) : [];
  const result = new Map<string, PlayerProfileEntry>();

  uniqueUids.forEach((uid, index) => {
    const userSnap = snaps[index * 2];
    const pubSnap = snaps[index * 2 + 1];
    result.set(uid, {
      userExists: Boolean(userSnap?.exists),
      userData: userSnap?.exists ? userSnap.data() : null,
      pubExists: Boolean(pubSnap?.exists),
      pubData: pubSnap?.exists ? pubSnap.data() : null,
    });
  });

  return result;
}

export function applyMatchSettlementWrites(params: {
  db: DbLike;
  serverTimestamp: () => any;
  tx: TxLike;
  roomRef: DocRefLike;
  roomData: any;
  privateStateRef: DocRefLike;
  privateState: PrivateGameStateDoc;
  players: ServerRoomPlayer[];
  profileMap: Map<string, PlayerProfileEntry>;
  winner: 'citizens' | 'impostor';
  winReason: 'impostor_caught' | 'citizens_wrong_vote' | 'impostor_guessed';
  winningMrWhiteUid?: string | null;
  endedAtMs?: number;
  extraRoomUpdates?: Record<string, any>;
}) {
  const {
    db,
    serverTimestamp,
    tx,
    roomRef,
    roomData,
    privateStateRef,
    privateState,
    players,
    profileMap,
    winner,
    winReason,
    winningMrWhiteUid = null,
    endedAtMs = Date.now(),
    extraRoomUpdates = {},
  } = params;

  const alreadySettled = Array.isArray(privateState.settledMatches)
    ? privateState.settledMatches.includes(privateState.matchId)
    : false;

  const rewardsByUid: Record<string, { xpDelta: number; isWinner: boolean; roundPoints: number }> =
    {};

  const updatedPlayers: ServerRoomPlayer[] = players.map((p) => {
    const role = privateState.rolesByUid[p.uid] || 'citizen';
    const reward = computePlayerOnlineReward(
      p.uid,
      players,
      privateState.rolesByUid,
      privateState.votesByUid || {},
      winner,
      winReason,
      winningMrWhiteUid
    );
    rewardsByUid[p.uid] = reward;
    if (alreadySettled) {
      return { ...p, revealedRole: role };
    }
    return {
      ...p,
      score: (p.score || 0) + reward.xpDelta,
      revealedRole: role,
    };
  });

  const roomId = roomData.id || roomRef.id || 'room';
  const matchId = privateState.matchId || `match_${endedAtMs}`;
  const reportId = `${roomId}_${matchId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);

  const winnersByUid: Record<string, boolean> = {};
  if (!alreadySettled) {
    for (const p of players) {
      const { xpDelta, isWinner } = rewardsByUid[p.uid];
      winnersByUid[p.uid] = isWinner;
      const entry = profileMap.get(p.uid);
      if (!entry) continue;

      const baseUser = entry.userData || entry.pubData || {};
      const currentXp = Number(baseUser.xp || 0);
      const nextXp = currentXp + xpDelta;
      const nextLevel = calculateLevelFromXp(nextXp);
      const baseStats = baseUser.stats || {};
      const roleKey = privateState.rolesByUid[p.uid] || 'citizen';
      const prevRoleStats =
        baseStats.roleStats && typeof baseStats.roleStats === 'object' ? baseStats.roleStats : {};
      const prevRoleEntry = prevRoleStats[roleKey] || {};
      const nextRoleStats = {
        ...prevRoleStats,
        [roleKey]: {
          played: Number(prevRoleEntry.played || 0) + 1,
          wins: Number(prevRoleEntry.wins || 0) + (isWinner ? 1 : 0),
        },
      };
      const nextCurrentStreak = isWinner ? Number(baseStats.currentStreak || 0) + 1 : 0;
      const nextLongestStreak = Math.max(Number(baseStats.longestStreak || 0), nextCurrentStreak);
      const nextStats = {
        wins: Number(baseStats.wins || 0) + (isWinner ? 1 : 0),
        hosted: Number(baseStats.hosted || 0),
        played: Number(baseStats.played || 0) + 1,
        longestStreak: nextLongestStreak,
        currentStreak: nextCurrentStreak,
        roleStats: nextRoleStats,
      };

      const userRef = db.collection('users').doc(p.uid);
      const pubRef = db.collection('publicProfiles').doc(p.uid);

      if (entry.userExists) {
        tx.update(userRef, {
          xp: nextXp,
          level: nextLevel,
          stats: nextStats,
          updatedAt: serverTimestamp(),
        });
      }

      const displayName =
        (typeof baseUser.displayName === 'string' && baseUser.displayName) || p.name;
      const photoURL = (typeof baseUser.photoURL === 'string' && baseUser.photoURL) || p.avatar;

      if (entry.pubExists) {
        tx.update(pubRef, {
          displayName,
          photoURL,
          xp: nextXp,
          level: nextLevel,
          stats: nextStats,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(pubRef, {
          uid: p.uid,
          displayName,
          photoURL,
          xp: nextXp,
          level: nextLevel,
          stats: nextStats,
          updatedAt: serverTimestamp(),
        });
      }
    }

    const nextSettled = [...(privateState.settledMatches || []), privateState.matchId].slice(-20);
    tx.update(privateStateRef, {
      votesByUid: privateState.votesByUid || {},
      roundHistory: privateState.roundHistory || [],
      cluesHistory: privateState.cluesHistory || [],
      matchEvents: privateState.matchEvents || [],
      settledMatches: nextSettled,
      updatedAt: serverTimestamp(),
    });

    const cluesSource: ServerClueRecord[] =
      Array.isArray(privateState.cluesHistory) && privateState.cluesHistory.length > 0
        ? privateState.cluesHistory
        : Array.isArray(roomData.gameState?.clues)
        ? roomData.gameState.clues
        : [];

    const winningFaction = resolveOnlineWinningFaction(
      updatedPlayers,
      privateState.rolesByUid,
      winner,
      winReason
    );

    const caseFile = buildOnlineClassifiedCaseFile({
      reportId,
      roomId,
      matchId,
      startedAtMs: privateState.startedAtMs || endedAtMs,
      endedAtMs,
      language: typeof roomData.language === 'string' ? roomData.language : 'ar',
      category:
        typeof roomData.gameState?.category === 'string'
          ? roomData.gameState.category
          : typeof roomData.category === 'string'
          ? roomData.category
          : 'standard',
      difficulty:
        (roomData.gameState?.difficulty || roomData.difficulty) === 'hard' ? 'hard' : 'easy',
      winner,
      winningFaction,
      winReason,
      winningMrWhiteUid,
      civilianWord: privateState.civilianWord,
      undercoverWord: privateState.undercoverWord,
      rolesByUid: privateState.rolesByUid,
      rosterByUid: privateState.rosterByUid || {},
      players: updatedPlayers,
      rewardsByUid,
      clues: cluesSource,
      rounds: privateState.roundHistory || [],
      events: privateState.matchEvents || [],
    });

    const reportRef = db.collection('matchReports').doc(reportId);
    tx.set(reportRef, caseFile);
  } else {
    for (const p of players) {
      winnersByUid[p.uid] = rewardsByUid[p.uid].isWinner;
    }
  }

  const publicGameState = {
    ...(roomData.gameState || {}),
    phase: 'RESULT',
    winner,
    winReason,
    winningMrWhiteUid,
    caseFileReportId: reportId,
    turnEndsAt: null,
    guesserUid: null,
    revealedResult: {
      secretWord: privateState.civilianWord,
      undercoverWord: privateState.undercoverWord,
      impostorId: privateState.impostorIds[0] || null,
      undercoverIds: privateState.undercoverIds || [],
      rolesByUid: privateState.rolesByUid,
      votesByUid: privateState.votesByUid || {},
      winnersByUid,
    },
  };

  tx.update(roomRef, {
    ...extraRoomUpdates,
    players: updatedPlayers,
    playerIds: updatedPlayers.map((p) => p.uid),
    gameState: publicGameState,
    updatedAt: serverTimestamp(),
  });
}
