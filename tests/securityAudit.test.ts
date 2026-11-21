import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESIGNATED_OWNER_EMAIL, executeCheckAdminStatus } from '../functions/src/adminPolicy';
import { getCallableOptions, resolveEnforceAppCheck } from '../functions/src/callableConfig';
import { DbLike, DocRefLike, TxLike } from '../functions/src/errors';
import {
  FORCE_RESOLVE_MIN_ELAPSED_MS,
  executeAdvanceTurn,
  executeBeginMatch,
  executeMarkRevealReady,
  executeNextMatch,
  executeProceedAfterVoteReveal,
  executeResolveVotes,
  executeReturnToLobby,
  executeStartRound,
  executeStartVoting,
  executeSubmitClue,
  executeSubmitMrWhiteGuess,
  executeSubmitVote,
} from '../functions/src/gameHandlers';
import {
  applyMatchSettlementWrites,
  readPlayerProfileDocs,
} from '../functions/src/matchSettlement';
import {
  executeCreateRoom,
  executeJoinRoom,
  executeKickPlayer,
  executePromoteHost,
  executeQuickJoinRoom,
  executeUpdateRoomSettings,
} from '../functions/src/roomHandlers';
import {
  executeAcceptFriendRequest,
  executeRemoveFriend,
  executeSendFriendRequest,
} from '../functions/src/socialHandlers';
import {
  RATE_LIMITS,
  RATE_LIMIT_CLEANUP_GRACE_MS,
  enforceRateLimit,
  executeCleanupExpiredRateLimits,
  readExpiryMs,
} from '../functions/src/rateLimit';
import { buildPublicProfileBackfill } from '../utils/profileBackfill';
import { SPECIAL_ROLES } from '../data/specialRoles';

/**
 * Lightweight transactional in-memory Firestore double matching DbLike / TxLike
 * so production backend handlers run verbatim under Vitest without emulator JRE.
 */
class InMemoryFirestore implements DbLike {
  private store = new Map<string, Record<string, any>>();
  private autoCounter = 0;
  public txCount = 0;

  setRaw(path: string, data: Record<string, any>) {
    this.store.set(path, structuredClone(data));
  }

  getRaw(path: string): Record<string, any> | undefined {
    const val = this.store.get(path);
    return val ? structuredClone(val) : undefined;
  }

  private applyDotPatch(target: Record<string, any>, patch: Record<string, any>) {
    for (const [k, v] of Object.entries(patch)) {
      if (!k.includes('.')) {
        target[k] = structuredClone(v);
      } else {
        const parts = k.split('.');
        let cursor: any = target;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') {
            cursor[parts[i]] = {};
          }
          cursor = cursor[parts[i]];
        }
        cursor[parts[parts.length - 1]] = structuredClone(v);
      }
    }
  }

  private makeDocRef(docPath: string): DocRefLike {
    const parts = docPath.split('/');
    const id = parts[parts.length - 1];
    return {
      id,
      collection: (subPath: string) => this.makeCollectionRef(`${docPath}/${subPath}`),
      get: async () => {
        const data = this.getRaw(docPath);
        return {
          exists: data !== undefined,
          id,
          ref: this.attachPath(this.makeDocRef(docPath), docPath),
          data: () => data,
        };
      },
    };
  }

  private matchesFilter(
    actual: unknown,
    op: string,
    expected: unknown
  ): boolean {
    if (op === '<=') {
      const actualIsNum = typeof actual === 'number';
      const expectedIsNum = typeof expected === 'number';
      if (actualIsNum && expectedIsNum) {
        return (actual as number) <= (expected as number);
      }
      if (!actualIsNum && !expectedIsNum) {
        const aMs = readExpiryMs(actual);
        const eMs = readExpiryMs(expected);
        return aMs > 0 && eMs > 0 && aMs <= eMs;
      }
      return false;
    }
    return actual === expected;
  }

  private makeCollectionRef(colPath: string) {
    const queryWith = (
      filters: Array<{ field: string; op: string; value: any }> = []
    ) => ({
      where: (field: string, op: string, value: any) =>
        queryWith([...filters, { field, op, value }]),
      limit: (n: number) => ({
        get: async () => this.queryDocs(colPath, filters, n),
      }),
      get: async () => this.queryDocs(colPath, filters),
    });

    return {
      doc: (id?: string) => {
        const docId = id || `auto_${++this.autoCounter}`;
        return this.makeDocRef(`${colPath}/${docId}`);
      },
      get: async () => this.queryDocs(colPath, []),
      where: (field: string, op: string, value: any) =>
        queryWith([{ field, op, value }]),
      limit: (n: number) => ({
        get: async () => this.queryDocs(colPath, [], n),
      }),
    };
  }

  private queryDocs(
    colPath: string,
    filters: Array<{ field: string; op: string; value: any }>,
    limitCount?: number
  ) {
    const prefix = `${colPath}/`;
    const docs: any[] = [];
    for (const [docPath, data] of this.store.entries()) {
      if (!docPath.startsWith(prefix)) continue;
      const remainder = docPath.slice(prefix.length);
      if (remainder.includes('/')) continue;
      if (filters.every((f) => this.matchesFilter(data[f.field], f.op, f.value))) {
        docs.push({
          exists: true,
          id: remainder,
          ref: this.attachPath(this.makeDocRef(docPath), docPath),
          data: () => structuredClone(data),
        });
        if (limitCount !== undefined && docs.length >= limitCount) {
          break;
        }
      }
    }
    return { docs };
  }

  private resolvePathFromRef(ref: DocRefLike): string {
    // DocRef id lookup helper via stored closure path: reconstruct using a symbol/property
    return (ref as any).__path;
  }

  collection(path: string) {
    const base = this.makeCollectionRef(path);
    return {
      ...base,
      doc: (id?: string) => {
        const docId = id || `auto_${++this.autoCounter}`;
        return this.attachPath(this.makeDocRef(`${path}/${docId}`), `${path}/${docId}`);
      },
    };
  }

  private attachPath(ref: DocRefLike, docPath: string): DocRefLike {
    const wrapped: any = {
      id: ref.id,
      __path: docPath,
      collection: (subPath: string) => {
        const subBase = this.makeCollectionRef(`${docPath}/${subPath}`);
        return {
          ...subBase,
          doc: (id?: string) => {
            const docId = id || `auto_${++this.autoCounter}`;
            return this.attachPath(
              this.makeDocRef(`${docPath}/${subPath}/${docId}`),
              `${docPath}/${subPath}/${docId}`
            );
          },
          get: async () => {
            const q = await subBase.get();
            return {
              docs: q.docs.map((d) => ({
                ...d,
                ref: this.attachPath(d.ref, `${docPath}/${subPath}/${d.id}`),
              })),
            };
          },
        };
      },
      get: async () => {
        const data = this.getRaw(docPath);
        return {
          exists: data !== undefined,
          id: ref.id,
          ref: wrapped,
          data: () => data,
        };
      },
    };
    return wrapped;
  }

  async runTransaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T> {
    this.txCount += 1;
    const staging = new Map<string, Record<string, any>>(
      Array.from(this.store.entries()).map(([k, v]) => [k, structuredClone(v)])
    );
    const ops: Array<() => void> = [];

    const readFromStaging = (docPath: string) => {
      const val = staging.get(docPath);
      return val ? structuredClone(val) : undefined;
    };

    const tx: TxLike = {
      get: async (ref) => {
        const p = this.resolvePathFromRef(ref);
        const data = readFromStaging(p);
        return {
          exists: data !== undefined,
          id: ref.id,
          ref,
          data: () => data,
        };
      },
      getAll: async (...refs) =>
        Promise.all(
          refs.map(async (ref) => {
            const p = this.resolvePathFromRef(ref);
            const data = readFromStaging(p);
            return {
              exists: data !== undefined,
              id: ref.id,
              ref,
              data: () => data,
            };
          })
        ),
      set: (ref, data) => {
        const p = this.resolvePathFromRef(ref);
        const clone = structuredClone(data);
        staging.set(p, clone);
        ops.push(() => this.store.set(p, clone));
      },
      update: (ref, patch) => {
        const p = this.resolvePathFromRef(ref);
        const existing = staging.get(p) || {};
        this.applyDotPatch(existing, patch);
        staging.set(p, existing);
        ops.push(() => {
          const cur = this.store.get(p) || {};
          this.applyDotPatch(cur, patch);
          this.store.set(p, cur);
        });
      },
      delete: (ref) => {
        const p = this.resolvePathFromRef(ref);
        staging.delete(p);
        ops.push(() => this.store.delete(p));
      },
    };

    const res = await fn(tx);
    for (const op of ops) op();
    return res;
  }

  batch() {
    const deletions: string[] = [];
    return {
      delete: (ref: DocRefLike) => {
        deletions.push(this.resolvePathFromRef(ref));
      },
      commit: async () => {
        for (const p of deletions) {
          this.store.delete(p);
        }
      },
    };
  }
}

function makePlayer(uid: string, overrides: Partial<any> = {}) {
  return {
    uid,
    name: uid,
    avatar: '',
    isReady: true,
    isEliminated: false,
    score: 0,
    revealedRole: null,
    ...overrides,
  };
}

function createDeps(db: InMemoryFirestore, nowMs = 1_700_000_000_000) {
  return {
    db,
    serverTimestamp: () => 'SERVER_TS',
    now: () => nowMs,
  };
}

describe('P0 & P1 Security Audit Regression Suite', () => {
  it('1. submitMrWhiteGuess wrong guess & forceEliminateMissing do NOT return secretWord; revealed only after RESULT phase', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);

    db.setRaw('rooms/r1', {
      id: 'r1',
      hostId: 'p1',
      status: 'playing',
      difficulty: 'easy',
      turnDurationSeconds: 45,
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')],
      gameState: {
        phase: 'IMPOSTOR_GUESS',
        matchId: 'm1',
        round: 1,
        guesserUid: 'p4',
        mostVotedId: 'p4',
      },
    });
    db.setRaw('rooms/r1/privateState/current', {
      matchId: 'm1',
      round: 1,
      civilianWord: 'قهوة',
      undercoverWord: 'شاي',
      decoys: [],
      impostorIds: ['p4'],
      undercoverIds: ['p3'],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'undercover', p4: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });

    // Normal wrong guess while undercover remains -> match continues
    const wrongRes = await executeSubmitMrWhiteGuess(deps, 'p4', {
      roomId: 'r1',
      guess: 'سيارة',
    });
    expect(wrongRes).toEqual({ isCorrect: false });
    expect((wrongRes as any).secretWord).toBeUndefined();

    const afterWrongRoom = db.getRaw('rooms/r1')!;
    expect(afterWrongRoom.gameState.phase).toBe('PLAYING');
    expect(afterWrongRoom.gameState.revealedResult).toBeUndefined();

    // Now test host forceEliminateMissing when Mr. White disconnected
    db.setRaw('rooms/r2', {
      id: 'r2',
      hostId: 'p1',
      status: 'playing',
      difficulty: 'easy',
      turnDurationSeconds: 45,
      playerIds: ['p1', 'p2', 'p3'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      gameState: {
        phase: 'IMPOSTOR_GUESS',
        matchId: 'm2',
        round: 1,
        guesserUid: 'p4_gone',
        mostVotedId: 'p4_gone',
      },
    });
    db.setRaw('rooms/r2/privateState/current', {
      matchId: 'm2',
      round: 1,
      civilianWord: 'تفاح',
      undercoverWord: 'كمثرى',
      decoys: [],
      impostorIds: ['p4_gone'],
      undercoverIds: ['p3'],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'undercover', p4_gone: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });

    const forceRes = await executeSubmitMrWhiteGuess(deps, 'p1', {
      roomId: 'r2',
      guess: '',
      forceEliminateMissing: true,
    });
    expect(forceRes).toEqual({ isCorrect: false });
    expect((forceRes as any).secretWord).toBeUndefined();
    expect(db.getRaw('rooms/r2')!.gameState.phase).toBe('PLAYING');

    // Correct guess returns ONLY { isCorrect: true }, and public RESULT state reveals secretWord
    db.setRaw('rooms/r3', {
      id: 'r3',
      hostId: 'p1',
      status: 'playing',
      difficulty: 'easy',
      turnDurationSeconds: 45,
      playerIds: ['p1', 'p2', 'p3'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      gameState: {
        phase: 'IMPOSTOR_GUESS',
        matchId: 'm3',
        round: 1,
        guesserUid: 'p3',
        mostVotedId: 'p3',
      },
    });
    db.setRaw('rooms/r3/privateState/current', {
      matchId: 'm3',
      round: 1,
      civilianWord: 'أسد',
      undercoverWord: 'نمر',
      decoys: [],
      impostorIds: ['p3'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });

    const winRes = await executeSubmitMrWhiteGuess(deps, 'p3', {
      roomId: 'r3',
      guess: 'أسد',
    });
    expect(winRes).toEqual({ isCorrect: true });
    expect((winRes as any).secretWord).toBeUndefined();
    const afterWinRoom = db.getRaw('rooms/r3')!;
    expect(afterWinRoom.gameState.phase).toBe('RESULT');
    expect(afterWinRoom.gameState.revealedResult.secretWord).toBe('أسد');
  });

  it('2. Admin lifecycle grants active admin, revokes stale claim on inactive/deleted doc & owner deactivation', async () => {
    const db = new InMemoryFirestore();
    const claimsStore = new Map<string, Record<string, any>>();
    const adminAuth = {
      getUser: async (uid: string) => ({ customClaims: claimsStore.get(uid) || {} }),
      setCustomUserClaims: async (uid: string, claims: Record<string, any> | null) => {
        claimsStore.set(uid, claims || {});
      },
    };

    // Active admin without claim -> granted
    db.setRaw('admins/admin1', { active: true });
    claimsStore.set('admin1', { role: 'user' });
    const granted = await executeCheckAdminStatus(
      { db, adminAuth },
      { uid: 'admin1', token: { email: 'a@test.com' } }
    );
    expect(granted).toEqual({ isAdmin: true, shouldRefreshToken: true, claimUpdated: true });
    expect(claimsStore.get('admin1')?.admin).toBe(true);

    // Inactive admin with stale claim -> REVOKED and token refresh requested
    db.setRaw('admins/admin1', { active: false });
    const revokedInactive = await executeCheckAdminStatus(
      { db, adminAuth },
      { uid: 'admin1', token: { admin: true, email: 'a@test.com' } }
    );
    expect(revokedInactive).toEqual({
      isAdmin: false,
      shouldRefreshToken: true,
      claimUpdated: true,
    });
    expect(claimsStore.get('admin1')?.admin).toBeUndefined();

    // Deleted admin doc with stale claim -> REVOKED
    const db2 = new InMemoryFirestore();
    claimsStore.set('admin2', { admin: true });
    const revokedDeleted = await executeCheckAdminStatus(
      { db: db2, adminAuth },
      { uid: 'admin2', token: { admin: true, email: 'b@test.com' } }
    );
    expect(revokedDeleted).toEqual({
      isAdmin: false,
      shouldRefreshToken: true,
      claimUpdated: true,
    });
    expect(claimsStore.get('admin2')?.admin).toBeUndefined();

    // Designated owner works when verified and not deactivated, and is denied if admins/{uid}.active === false
    claimsStore.set('owner1', { admin: true });
    const ownerOk = await executeCheckAdminStatus(
      { db: db2, adminAuth },
      {
        uid: 'owner1',
        token: { admin: true, email: DESIGNATED_OWNER_EMAIL, email_verified: true },
      }
    );
    expect(ownerOk).toEqual({ isAdmin: true, shouldRefreshToken: false, claimUpdated: false });

    db2.setRaw('admins/owner1', { active: false });
    const ownerRevoked = await executeCheckAdminStatus(
      { db: db2, adminAuth },
      {
        uid: 'owner1',
        token: { admin: true, email: DESIGNATED_OWNER_EMAIL, email_verified: true },
      }
    );
    expect(ownerRevoked).toEqual({
      isAdmin: false,
      shouldRefreshToken: true,
      claimUpdated: true,
    });
  });

  it('3, 4, 5. Match transition enforcement for beginMatch, startRound, nextMatch, and returnToLobby', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);

    db.setRaw('rooms/r1', {
      id: 'r1',
      hostId: 'p1',
      status: 'waiting',
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      playerIds: ['p1', 'p2', 'p3'],
      gameState: null,
    });

    // Cannot call startRound, nextMatch, or returnToLobby while waiting
    await expect(executeStartRound(deps, 'p1', { roomId: 'r1' })).rejects.toThrow();
    await expect(executeNextMatch(deps, 'p1', { roomId: 'r1' })).rejects.toThrow();
    await expect(executeReturnToLobby(deps, 'p1', { roomId: 'r1' })).rejects.toThrow();

    // beginMatch succeeds from waiting
    await executeBeginMatch(deps, 'p1', { roomId: 'r1' });
    expect(db.getRaw('rooms/r1')!.gameState.phase).toBe('SETUP_PENDING');

    // Duplicate beginMatch rejected
    await expect(executeBeginMatch(deps, 'p1', { roomId: 'r1' })).rejects.toThrow();

    // startRound succeeds in SETUP_PENDING
    await executeStartRound(deps, 'p1', { roomId: 'r1' });
    expect(db.getRaw('rooms/r1')!.gameState.phase).toBe('REVEAL');

    // Host cannot call startRound again during REVEAL/PLAYING to reroll secret words/roles
    await expect(executeStartRound(deps, 'p1', { roomId: 'r1' })).rejects.toThrow();
    await expect(executeNextMatch(deps, 'p1', { roomId: 'r1' })).rejects.toThrow();
    await expect(executeReturnToLobby(deps, 'p1', { roomId: 'r1' })).rejects.toThrow();

    // Force room to RESULT -> both nextMatch and returnToLobby are now allowed
    const r = db.getRaw('rooms/r1')!;
    r.gameState.phase = 'RESULT';
    db.setRaw('rooms/r1', r);

    await executeNextMatch(deps, 'p1', { roomId: 'r1' });
    expect(db.getRaw('rooms/r1')!.gameState.phase).toBe('SETUP_PENDING');

    // From SETUP_PENDING returnToLobby is allowed and resets privatePlayers
    await executeReturnToLobby(deps, 'p1', { roomId: 'r1' });
    expect(db.getRaw('rooms/r1')!.status).toBe('waiting');
    expect(db.getRaw('rooms/r1')!.gameState).toBeNull();
  });

  it('6. Private room join requires valid invite code even when roomId is supplied; preserves public & reconnection', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);

    const priv = await executeCreateRoom(deps, 'host', { name: 'Host' }, { isPrivate: true });
    const pub = await executeCreateRoom(deps, 'host2', { name: 'Host2' }, { isPrivate: false });

    // Private room reject without secretCode even with roomId
    await expect(
      executeJoinRoom(deps, 'intruder', { name: 'Intruder' }, { roomId: priv.roomId })
    ).rejects.toThrow(/invitation code/i);

    // Private room reject with wrong secretCode
    await expect(
      executeJoinRoom(
        deps,
        'intruder',
        { name: 'Intruder' },
        { roomId: priv.roomId, secretCode: '000000' }
      )
    ).rejects.toThrow();

    // Private room join succeeds with valid secretCode
    const joinedPriv = await executeJoinRoom(
      deps,
      'friend',
      { name: 'Friend' },
      { roomId: priv.roomId, secretCode: priv.secretCode }
    );
    expect(joinedPriv).toEqual({ success: true, roomId: priv.roomId });

    // Existing member reconnection succeeds without needing code even after match starts
    const roomPriv = db.getRaw(`rooms/${priv.roomId}`)!;
    roomPriv.status = 'playing';
    db.setRaw(`rooms/${priv.roomId}`, roomPriv);
    const reconn = await executeJoinRoom(deps, 'friend', { name: 'Friend' }, { roomId: priv.roomId });
    expect(reconn).toEqual({ success: true, roomId: priv.roomId, alreadyJoined: true });

    // Public room join with roomId and quickJoin work without secretCode
    const qj = await executeQuickJoinRoom(deps, 'guest', { name: 'Guest' });
    expect(qj).toEqual({ success: true, roomId: pub.roomId });
  });

  it('7. kickPlayer during active match cleans votes, turnOrder/index, privatePlayers, and settles win condition', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);

    // Scenario A: Kick during VOTING cleans pending vote and triggers remaining tally
    db.setRaw('rooms/rk1', {
      id: 'rk1',
      hostId: 'p1',
      status: 'playing',
      difficulty: 'easy',
      turnDurationSeconds: 45,
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')],
      kickedPlayers: [],
      gameState: {
        phase: 'VOTING',
        matchId: 'mk1',
        round: 1,
        votedUids: ['p1', 'p2'],
      },
    });
    db.setRaw('rooms/rk1/privatePlayers/p3', { uid: 'p3', role: 'citizen' });
    db.setRaw('rooms/rk1/privateState/current', {
      matchId: 'mk1',
      round: 1,
      civilianWord: 'قمر',
      undercoverWord: 'شمس',
      decoys: [],
      impostorIds: ['p4'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'citizen', p4: 'mrwhite' },
      votesByUid: { p1: 'p4', p2: 'p4', p4: 'p3' },
      settledMatches: [],
    });

    await executeKickPlayer(deps, 'p1', { roomId: 'rk1', targetUid: 'p3' });
    const rk1 = db.getRaw('rooms/rk1')!;
    expect(rk1.playerIds).toEqual(['p1', 'p2', 'p4']);
    expect(rk1.kickedPlayers).toContain('p3');
    expect(db.getRaw('rooms/rk1/privatePlayers/p3')).toBeUndefined();
    // Wait: p4's vote for p3 was purged, p1 & p2 voted for p4 (2/3 alive -> stays VOTING with clean votedUids=['p1','p2'])
    expect(rk1.gameState.votedUids).toEqual(['p1', 'p2']);
    expect(db.getRaw('rooms/rk1/privateState/current')!.votesByUid).toEqual({ p1: 'p4', p2: 'p4' });

    // Scenario B: Kicking last infiltrator triggers win settlement to RESULT
    await executeKickPlayer(deps, 'p1', { roomId: 'rk1', targetUid: 'p4' });
    const settled = db.getRaw('rooms/rk1')!;
    expect(settled.gameState.phase).toBe('RESULT');
    expect(settled.gameState.winner).toBe('citizens');
    expect(settled.gameState.revealedResult.secretWord).toBe('قمر');

    // Scenario C: Kicking speaker in PLAYING adjusts turnOrder & currentTurnIndex accurately
    db.setRaw('rooms/rk2', {
      id: 'rk2',
      hostId: 'p1',
      status: 'playing',
      difficulty: 'easy',
      turnDurationSeconds: 45,
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')],
      kickedPlayers: [],
      gameState: {
        phase: 'PLAYING',
        matchId: 'mk2',
        round: 1,
        turnOrder: ['p1', 'p2', 'p3', 'p4'],
        currentTurnIndex: 1,
        turnEndsAt: 1_700_000_045_000,
        turnsCompleted: false,
      },
    });
    db.setRaw('rooms/rk2/privateState/current', {
      matchId: 'mk2',
      round: 1,
      civilianWord: 'بحر',
      undercoverWord: 'نهر',
      decoys: [],
      impostorIds: ['p4'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'citizen', p4: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });

    await executeKickPlayer(deps, 'p1', { roomId: 'rk2', targetUid: 'p2' });
    const rk2 = db.getRaw('rooms/rk2')!;
    expect(rk2.gameState.turnOrder).toEqual(['p1', 'p3', 'p4']);
    expect(rk2.gameState.turnOrder[rk2.gameState.currentTurnIndex]).toBe('p3');
  });

  it('8. Non-member advanceTurn rejected even when active speaker absent or timer expired; duplicate calls are idempotent', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db, 1_700_000_100_000);

    db.setRaw('rooms/rt1', {
      id: 'rt1',
      hostId: 'p1',
      status: 'playing',
      turnDurationSeconds: 45,
      playerIds: ['p1', 'p2', 'p3'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      gameState: {
        phase: 'PLAYING',
        round: 1,
        turnOrder: ['missing_uid', 'p2', 'p3'],
        currentTurnIndex: 0,
        turnEndsAt: 1_700_000_010_000, // already expired
        turnsCompleted: false,
        clues: [],
      },
    });

    // Non-member rejected even with absent active speaker and expired timer
    await expect(
      executeAdvanceTurn(deps, 'outsider', { roomId: 'rt1', reason: 'timeout', expectedTurnIndex: 0 })
    ).rejects.toThrow(/Only room members/i);

    // Host advances turn index 0 -> 1
    await executeAdvanceTurn(deps, 'p1', {
      roomId: 'rt1',
      reason: 'skip',
      expectedTurnIndex: 0,
    });
    expect(db.getRaw('rooms/rt1')!.gameState.currentTurnIndex).toBe(1);

    // Duplicate concurrent advanceTurn with stale expectedTurnIndex=0 does NOT advance index 1 -> 2
    await executeAdvanceTurn(deps, 'p2', {
      roomId: 'rt1',
      reason: 'skip',
      expectedTurnIndex: 0,
    });
    expect(db.getRaw('rooms/rt1')!.gameState.currentTurnIndex).toBe(1);
  });

  it('9. Duplicate submitVote and duplicate startVoting/resolveVotes are strictly blocked', async () => {
    const db = new InMemoryFirestore();
    let currentNow = 1_700_000_000_000;
    const deps = {
      db,
      serverTimestamp: () => 'SERVER_TS',
      now: () => currentNow,
    };

    db.setRaw('rooms/rv1', {
      id: 'rv1',
      hostId: 'p1',
      status: 'playing',
      playerIds: ['p1', 'p2', 'p3'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      gameState: {
        phase: 'PLAYING',
        matchId: 'mv1',
        round: 1,
        turnOrder: ['p1', 'p2', 'p3'],
        currentTurnIndex: 2,
        turnsCompleted: true,
      },
    });
    db.setRaw('rooms/rv1/privateState/current', {
      matchId: 'mv1',
      round: 1,
      civilianWord: 'كتاب',
      undercoverWord: 'دفتر',
      decoys: [],
      impostorIds: ['p3'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });

    await executeStartVoting(deps, 'p1', { roomId: 'rv1' });
    await expect(executeStartVoting(deps, 'p1', { roomId: 'rv1' })).rejects.toThrow();

    await executeSubmitVote(deps, 'p1', { roomId: 'rv1', suspectUid: 'p3' });
    // Duplicate vote from same player blocked
    await expect(
      executeSubmitVote(deps, 'p1', { roomId: 'rv1', suspectUid: 'p2' })
    ).rejects.toThrow(/already voted/i);

    await executeSubmitVote(deps, 'p2', { roomId: 'rv1', suspectUid: 'p3' });
    currentNow += FORCE_RESOLVE_MIN_ELAPSED_MS + 100;

    await executeResolveVotes(deps, 'p1', { roomId: 'rv1' });
    // Duplicate resolveVotes blocked after phase transitioned to REVEAL_VOTE_RESULT
    await expect(executeResolveVotes(deps, 'p1', { roomId: 'rv1' })).rejects.toThrow();
  });

  it('10 & 11. Backfills missing publicProfiles from existing users/{uid} without zeroing stats & preserves local Special Roles', () => {
    const existingUser = {
      displayName: 'Veteran',
      photoURL: 'https://example.com/a.png',
      xp: 480,
      level: 5,
      stats: {
        wins: 14,
        hosted: 6,
        played: 22,
        longestStreak: 4,
        currentStreak: 2,
        roleStats: {
          mrwhite: { played: 5, wins: 3 },
          citizen: { played: 12, wins: 9 },
        },
      },
    };

    const synced = buildPublicProfileBackfill('vet_1', existingUser);
    expect(synced.xp).toBe(480);
    expect(synced.level).toBe(5);
    expect(synced.stats).toEqual(existingUser.stats);

    // Local Pass & Play Special Roles remain preserved
    expect(SPECIAL_ROLES.length).toBeGreaterThanOrEqual(8);
  });

  it('12. executeStartVoting rejects incomplete clues/non-host & executeResolveVotes enforces early quorum + 15s elapsed rule', async () => {
    const db = new InMemoryFirestore();
    let currentNow = 1_700_000_000_000;
    const deps = {
      db,
      serverTimestamp: () => 'SERVER_TS',
      now: () => currentNow,
    };

    db.setRaw('rooms/rv2', {
      id: 'rv2',
      hostId: 'p1',
      status: 'playing',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')],
      gameState: {
        phase: 'PLAYING',
        matchId: 'mv2',
        round: 1,
        turnOrder: ['p1', 'p2', 'p3', 'p4'],
        currentTurnIndex: 0,
        turnsCompleted: false,
      },
    });
    db.setRaw('rooms/rv2/privateState/current', {
      matchId: 'mv2',
      round: 1,
      civilianWord: 'شمس',
      undercoverWord: 'قمر',
      decoys: [],
      impostorIds: ['p4'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'citizen', p4: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });

    // Cannot skip clues even as host
    await expect(executeStartVoting(deps, 'p1', { roomId: 'rv2' })).rejects.toThrow(
      /finish their turns/i
    );

    // Mark turns completed; non-host still rejected
    const rPlaying = db.getRaw('rooms/rv2')!;
    rPlaying.gameState.turnsCompleted = true;
    db.setRaw('rooms/rv2', rPlaying);
    await expect(executeStartVoting(deps, 'p2', { roomId: 'rv2' })).rejects.toThrow(
      /Only host/i
    );

    // Host starts voting after clues complete -> stamps votingStartedAt
    await executeStartVoting(deps, 'p1', { roomId: 'rv2' });
    expect(db.getRaw('rooms/rv2')!.gameState.phase).toBe('VOTING');
    expect(db.getRaw('rooms/rv2')!.gameState.votingStartedAt).toBe(currentNow);

    // 1 vote only (below majority=3 for 4 alive) + 20s elapsed -> still rejected
    await executeSubmitVote(deps, 'p1', { roomId: 'rv2', suspectUid: 'p4' });
    currentNow += 20_000;
    await expect(executeResolveVotes(deps, 'p1', { roomId: 'rv2' })).rejects.toThrow(
      /At least 3 alive votes/i
    );

    // Reset clock window relative to votingStartedAt test: add 2 more votes (3/4 = majority) at +5s -> rejected before 15s
    const rv2 = db.getRaw('rooms/rv2')!;
    rv2.gameState.votingStartedAt = currentNow - 5_000;
    db.setRaw('rooms/rv2', rv2);
    await executeSubmitVote(deps, 'p2', { roomId: 'rv2', suspectUid: 'p4' });
    await executeSubmitVote(deps, 'p3', { roomId: 'rv2', suspectUid: 'p4' });
    await expect(executeResolveVotes(deps, 'p1', { roomId: 'rv2' })).rejects.toThrow(
      /minimum voting window/i
    );

    // Once >= 15s elapsed and quorum reached -> forced resolution succeeds
    currentNow += 11_000;
    await executeResolveVotes(deps, 'p1', { roomId: 'rv2' });
    const afterResolve = db.getRaw('rooms/rv2')!;
    expect(afterResolve.gameState.phase).toBe('REVEAL_VOTE_RESULT');
    expect(afterResolve.gameState.mostVotedId).toBe('p4');
    expect(afterResolve.gameState.votingStartedAt).toBeNull();
  });

  it('13. Rejects stale matchId/round transitions & clears privateState secrets on returnToLobby while keeping settledMatches', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);

    db.setRaw('rooms/rs1', {
      id: 'rs1',
      hostId: 'p1',
      status: 'playing',
      playerIds: ['p1', 'p2', 'p3'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      gameState: {
        phase: 'REVEAL_VOTE_RESULT',
        matchId: 'new_match',
        round: 2,
        mostVotedId: 'p3',
        mostVotedRevealedRole: 'citizen',
      },
    });
    db.setRaw('rooms/rs1/privateState/current', {
      matchId: 'old_match',
      round: 1,
      civilianWord: 'بحر',
      undercoverWord: 'نهر',
      decoys: [],
      impostorIds: ['p2'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'mrwhite', p3: 'citizen' },
      votesByUid: {},
      settledMatches: ['old_match'],
    });

    await expect(
      executeProceedAfterVoteReveal(deps, 'p1', { roomId: 'rs1' })
    ).rejects.toThrow(/Stale/i);

    // Synchronize state -> returnToLobby allowed from RESULT & wipes sensitive secrets
    const rs = db.getRaw('rooms/rs1')!;
    rs.gameState.phase = 'RESULT';
    rs.gameState.matchId = 'old_match';
    rs.gameState.round = 1;
    db.setRaw('rooms/rs1', rs);

    await executeReturnToLobby(deps, 'p1', { roomId: 'rs1' });
    const wipedPriv = db.getRaw('rooms/rs1/privateState/current')!;
    expect(wipedPriv.civilianWord).toBe('');
    expect(wipedPriv.undercoverWord).toBe('');
    expect(wipedPriv.rolesByUid).toEqual({});
    expect(wipedPriv.settledMatches).toEqual(['old_match']);
  });

  it('14. Social friend handlers enforce lifecycle, target validation, and composite IDs > 128 chars', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);
    const longAlice = 'a'.repeat(100);
    const longBob = 'b'.repeat(100);

    db.setRaw(`publicProfiles/${longAlice}`, { uid: longAlice, displayName: 'AliceLong' });
    db.setRaw(`publicProfiles/${longBob}`, { uid: longBob, displayName: 'BobLong' });

    await expect(
      executeSendFriendRequest(deps, longAlice, { toId: longAlice })
    ).rejects.toThrow(/yourself/i);

    const sent = await executeSendFriendRequest(deps, longAlice, { toId: longBob });
    expect(sent.success).toBe(true);
    expect(sent.requestId).toBe(`${longAlice}_${longBob}`);
    expect(sent.requestId!.length).toBe(201);

    // Sender cannot accept own outgoing request
    await expect(
      executeAcceptFriendRequest(deps, longAlice, { requestId: sent.requestId })
    ).rejects.toThrow(/Only the recipient/i);

    const accepted = await executeAcceptFriendRequest(deps, longBob, {
      requestId: sent.requestId,
    });
    expect(accepted.success).toBe(true);

    const removed = await executeRemoveFriend(deps, longAlice, { friendUid: longBob });
    expect(removed.success).toBe(true);
  });

  it('15. Transactional rate limiter blocks abusive bursts and resets after window expiration', async () => {
    const db = new InMemoryFirestore();
    let currentNow = 1_700_000_000_000;
    const deps = { db, now: () => currentNow };
    const uid = 'burst_user';

    for (let i = 0; i < RATE_LIMITS.createRoom.maxRequests; i += 1) {
      await enforceRateLimit(deps, uid, RATE_LIMITS.createRoom);
    }

    await expect(
      enforceRateLimit(deps, uid, RATE_LIMITS.createRoom)
    ).rejects.toThrow(/Rate limit exceeded/i);

    // Once window elapses, quota resets cleanly
    currentNow += RATE_LIMITS.createRoom.windowMs + 10;
    await expect(enforceRateLimit(deps, uid, RATE_LIMITS.createRoom)).resolves.toBeUndefined();
  });

  it('16. App Check fails closed in Cloud Functions prod, honors overrides, and every callable uses shared options', () => {
    // Deployed Cloud Functions runtime without explicit env flag -> fail closed (true)
    expect(resolveEnforceAppCheck({ K_SERVICE: 'createRoom' })).toBe(true);
    expect(resolveEnforceAppCheck({ FUNCTION_TARGET: 'createRoom' })).toBe(true);
    // Explicit override always honored
    expect(resolveEnforceAppCheck({ K_SERVICE: 'createRoom', ENFORCE_APP_CHECK: 'false' })).toBe(
      false
    );
    expect(resolveEnforceAppCheck({ FUNCTIONS_EMULATOR: 'true', ENFORCE_APP_CHECK: 'true' })).toBe(
      true
    );
    // Local emulator / Vitest defaults to false
    expect(resolveEnforceAppCheck({ FUNCTIONS_EMULATOR: 'true' })).toBe(false);
    expect(resolveEnforceAppCheck({ NODE_ENV: 'test', VITEST: 'true' })).toBe(false);

    // Shared callable options always expose enforceAppCheck boolean
    const opts = getCallableOptions();
    expect(typeof opts.enforceAppCheck).toBe('boolean');

    // Every exported onCall across all callable modules must use callableOpts / getCallableOptions()
    const callableFiles = [
      'functions/src/adminFunctions.ts',
      'functions/src/roomFunctions.ts',
      'functions/src/gameFunctions.ts',
      'functions/src/socialFunctions.ts',
    ];
    for (const relPath of callableFiles) {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
      const onCallMatches = src.match(/onCall\s*\(/g) || [];
      const sharedOptMatches = src.match(/onCall\s*\(\s*(?:callableOpts|getCallableOptions\()/g) || [];
      expect(onCallMatches.length).toBeGreaterThan(0);
      expect(sharedOptMatches.length).toBe(onCallMatches.length);
    }

    // Never commit private debug tokens or secrets in tracked example env files
    const rootExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
    expect(rootExample).not.toMatch(/APPCHECK_DEBUG_TOKEN\s*=\s*["']?[0-9a-f-]{12,}/i);
    const fnExample = fs.readFileSync(path.resolve(process.cwd(), 'functions/.env.example'), 'utf8');
    expect(fnExample).toMatch(/ENFORCE_APP_CHECK\s*=\s*true/);
  });

  it('17. Rate limits protect newly covered endpoints (updateRoomSettings, promoteHost, startVoting, advanceTurn, markRevealReady)', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);

    db.setRaw('rooms/r_rl', {
      id: 'r_rl',
      hostId: 'p1',
      status: 'waiting',
      difficulty: 'medium',
      turnDurationSeconds: 45,
      isPublic: true,
      playerIds: ['p1', 'p2', 'p3'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      gameState: {
        phase: 'LOBBY',
        matchId: '',
        round: 1,
        turnOrder: [],
        currentTurnIndex: 0,
        turnsCompleted: false,
      },
    });

    // updateRoomSettings
    for (let i = 0; i < RATE_LIMITS.updateRoomSettings.maxRequests; i++) {
      await executeUpdateRoomSettings(deps, 'p1', {
        roomId: 'r_rl',
        difficulty: i % 2 === 0 ? 'easy' : 'hard',
      });
    }
    await expect(
      executeUpdateRoomSettings(deps, 'p1', { roomId: 'r_rl', difficulty: 'medium' })
    ).rejects.toThrow(/Rate limit exceeded/i);

    // promoteHost (always called by p1 by resetting hostId='p1' between iterations)
    for (let i = 0; i < RATE_LIMITS.promoteHost.maxRequests; i++) {
      const cur = db.getRaw('rooms/r_rl')!;
      cur.hostId = 'p1';
      db.setRaw('rooms/r_rl', cur);
      await executePromoteHost(deps, 'p1', { roomId: 'r_rl', targetUid: 'p2' });
    }
    const curPromote = db.getRaw('rooms/r_rl')!;
    curPromote.hostId = 'p1';
    db.setRaw('rooms/r_rl', curPromote);
    await expect(
      executePromoteHost(deps, 'p1', { roomId: 'r_rl', targetUid: 'p2' })
    ).rejects.toThrow(/Rate limit exceeded/i);

    // Switch room to REVEAL and test markRevealReady
    const roomReveal = db.getRaw('rooms/r_rl')!;
    roomReveal.hostId = 'p1';
    roomReveal.status = 'playing';
    roomReveal.gameState = {
      phase: 'REVEAL',
      matchId: 'm_rl',
      round: 1,
      turnOrder: ['p1', 'p2', 'p3'],
      currentTurnIndex: 0,
      turnsCompleted: false,
      readyPlayers: [],
    };
    db.setRaw('rooms/r_rl', roomReveal);
    db.setRaw('rooms/r_rl/privateState/current', {
      matchId: 'm_rl',
      round: 1,
      civilianWord: 'قمر',
      undercoverWord: 'نجم',
      decoys: [],
      impostorIds: ['p3'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });

    for (let i = 0; i < RATE_LIMITS.markRevealReady.maxRequests; i++) {
      // Clear readyPlayers before each call so calls aren't short-circuited by idempotency
      const cur = db.getRaw('rooms/r_rl')!;
      cur.gameState.readyPlayers = [];
      db.setRaw('rooms/r_rl', cur);
      await executeMarkRevealReady(deps, 'p1', { roomId: 'r_rl' });
    }
    const curReveal = db.getRaw('rooms/r_rl')!;
    curReveal.gameState.readyPlayers = [];
    db.setRaw('rooms/r_rl', curReveal);
    await expect(executeMarkRevealReady(deps, 'p1', { roomId: 'r_rl' })).rejects.toThrow(
      /Rate limit exceeded/i
    );

    // Switch room to PLAYING to verify advanceTurn and startVoting rate limits
    const roomPlaying = db.getRaw('rooms/r_rl')!;
    roomPlaying.gameState = {
      phase: 'PLAYING',
      matchId: 'm_rl',
      round: 1,
      turnOrder: ['p1', 'p2', 'p3'],
      currentTurnIndex: 0,
      turnsCompleted: false,
    };
    db.setRaw('rooms/r_rl', roomPlaying);

    for (let i = 0; i < RATE_LIMITS.advanceTurn.maxRequests; i++) {
      const cur = db.getRaw('rooms/r_rl')!;
      cur.gameState.currentTurnIndex = 0;
      cur.gameState.turnsCompleted = false;
      db.setRaw('rooms/r_rl', cur);
      await executeAdvanceTurn(deps, 'p1', { roomId: 'r_rl', expectedTurnIndex: 0 });
    }
    const curAdv = db.getRaw('rooms/r_rl')!;
    curAdv.gameState.currentTurnIndex = 0;
    curAdv.gameState.turnsCompleted = false;
    db.setRaw('rooms/r_rl', curAdv);
    await expect(
      executeAdvanceTurn(deps, 'p1', { roomId: 'r_rl', expectedTurnIndex: 0 })
    ).rejects.toThrow(/Rate limit exceeded/i);

    // startVoting exhausted for p1
    for (let i = 0; i < RATE_LIMITS.startVoting.maxRequests; i++) {
      const cur = db.getRaw('rooms/r_rl')!;
      cur.gameState.phase = 'PLAYING';
      cur.gameState.turnsCompleted = true;
      db.setRaw('rooms/r_rl', cur);
      await executeStartVoting(deps, 'p1', { roomId: 'r_rl' });
    }
    const curVote = db.getRaw('rooms/r_rl')!;
    curVote.gameState.phase = 'PLAYING';
    curVote.gameState.turnsCompleted = true;
    db.setRaw('rooms/r_rl', curVote);
    await expect(executeStartVoting(deps, 'p1', { roomId: 'r_rl' })).rejects.toThrow(
      /Rate limit exceeded/i
    );
  });

  it('18. Handlers execute single-tx rate checking, skip quota on idempotent no-ops, and fast-fail exhausted bursts with 0 transactions', async () => {
    const db = new InMemoryFirestore();
    const deps = createDeps(db);

    db.setRaw('rooms/r_opt', {
      id: 'r_opt',
      hostId: 'p1',
      status: 'waiting',
      playerIds: ['p1', 'p2', 'p3'],
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      gameState: {
        phase: 'LOBBY',
        matchId: '',
        round: 1,
        turnOrder: [],
        currentTurnIndex: 0,
        turnsCompleted: false,
      },
    });

    // Single transaction per in-room action
    const txBefore = db.txCount;
    await executeUpdateRoomSettings(deps, 'p1', { roomId: 'r_opt', difficulty: 'hard' });
    expect(db.txCount - txBefore).toBe(1);

    // Exhaust promoteHost bucket for p1 cleanly, then ensure warm cache blocks subsequent calls with 0 Firestore transactions
    for (let i = 0; i < RATE_LIMITS.promoteHost.maxRequests; i++) {
      const cur = db.getRaw('rooms/r_opt')!;
      cur.hostId = 'p1';
      db.setRaw('rooms/r_opt', cur);
      await executePromoteHost(deps, 'p1', { roomId: 'r_opt', targetUid: 'p2' });
    }
    const curExhaust = db.getRaw('rooms/r_opt')!;
    curExhaust.hostId = 'p1';
    db.setRaw('rooms/r_opt', curExhaust);
    // First over-limit call detects exhaustion in tx and populates exhausted cache
    await expect(
      executePromoteHost(deps, 'p1', { roomId: 'r_opt', targetUid: 'p2' })
    ).rejects.toThrow(/Rate limit exceeded/i);

    const txBeforeBlocked = db.txCount;
    await expect(
      executePromoteHost(deps, 'p1', { roomId: 'r_opt', targetUid: 'p2' })
    ).rejects.toThrow(/Rate limit exceeded/i);
    expect(db.txCount).toBe(txBeforeBlocked);

    // Switch room to active REVEAL to verify idempotent duplicate markRevealReady consumes 0 quota
    db.setRaw('rooms/r_opt', {
      ...db.getRaw('rooms/r_opt'),
      hostId: 'p1',
      status: 'playing',
      gameState: {
        phase: 'REVEAL',
        matchId: 'm_opt',
        round: 1,
        turnOrder: ['p1', 'p2', 'p3'],
        currentTurnIndex: 0,
        turnsCompleted: false,
        readyPlayers: ['p2'],
      },
    });
    db.setRaw('rooms/r_opt/privateState/current', {
      matchId: 'm_opt',
      round: 1,
      civilianWord: 'قمر',
      undercoverWord: 'نجم',
      decoys: [],
      impostorIds: ['p3'],
      undercoverIds: [],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'mrwhite' },
      votesByUid: {},
      settledMatches: [],
    });
    await executeMarkRevealReady(deps, 'p2', { roomId: 'r_opt' });
    expect(db.getRaw('rateLimits/markRevealReady_p2')).toBeUndefined();

    // Idempotent stale expectedTurnIndex on advanceTurn consumes 0 quota
    const rPlay = db.getRaw('rooms/r_opt')!;
    rPlay.gameState.phase = 'PLAYING';
    rPlay.gameState.currentTurnIndex = 1;
    db.setRaw('rooms/r_opt', rPlay);
    await executeAdvanceTurn(deps, 'p1', { roomId: 'r_opt', expectedTurnIndex: 0 });
    expect(db.getRaw('rateLimits/advanceTurn_p1')).toBeUndefined();
  });

  it('19. Rate limit expiresAt stores Timestamp/Date and scheduled cleanup deletes expired records while keeping active & grace records', async () => {
    const db = new InMemoryFirestore();
    let currentNow = 1_700_000_000_000;
    const deps = { db, now: () => currentNow };

    await enforceRateLimit(deps, 'ttl_user', RATE_LIMITS.createRoom);
    const activeBucket = db.getRaw('rateLimits/createRoom_ttl_user')!;
    expect(typeof activeBucket.expiresAt).not.toBe('number');
    expect(readExpiryMs(activeBucket.expiresAt)).toBe(
      currentNow + RATE_LIMITS.createRoom.windowMs
    );

    // Seed: (1) old Timestamp expired > grace, (2) legacy numeric expired > grace,
    // (3) Timestamp expired only 10s ago (inside 60s grace), (4) active future Timestamp
    db.setRaw('rateLimits/expired_ts', {
      uid: 'u1',
      action: 'joinRoom',
      windowStart: currentNow - 300_000,
      count: 3,
      expiresAt: new Date(currentNow - RATE_LIMIT_CLEANUP_GRACE_MS - 5_000),
    });
    db.setRaw('rateLimits/expired_legacy_num', {
      uid: 'u2',
      action: 'joinRoom',
      windowStart: currentNow - 300_000,
      count: 2,
      expiresAt: currentNow - RATE_LIMIT_CLEANUP_GRACE_MS - 1_000,
    });
    db.setRaw('rateLimits/within_grace_ts', {
      uid: 'u3',
      action: 'joinRoom',
      windowStart: currentNow - 70_000,
      count: 1,
      expiresAt: new Date(currentNow - 10_000),
    });

    const cleanupRes = await executeCleanupExpiredRateLimits({ db, now: () => currentNow });
    expect(cleanupRes.deletedCount).toBe(2);

    expect(db.getRaw('rateLimits/expired_ts')).toBeUndefined();
    expect(db.getRaw('rateLimits/expired_legacy_num')).toBeUndefined();
    expect(db.getRaw('rateLimits/within_grace_ts')).toBeDefined();
    expect(db.getRaw('rateLimits/createRoom_ttl_user')).toBeDefined();
  });

  it('20. Cloud Functions Node 22 runtime, named DB mapping, and frontend-to-backend callable exports stay in parity', () => {
    const fnPkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'functions/package.json'), 'utf8')
    );
    expect(fnPkg.engines?.node).toBe('22');

    const fbJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'firebase.json'), 'utf8')
    );
    const dbConfig = Array.isArray(fbJson.firestore) ? fbJson.firestore[0] : fbJson.firestore;
    expect(dbConfig.database).toBe('ai-studio-379d796d-f978-4bae-a5f9-9fa5f7f43ac4');

    const indexSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'functions/src/index.ts'),
      'utf8'
    );
    expect(indexSrc).toContain('cleanupExpiredRateLimits');

    const frontendFiles = [
      'utils/onlineRoomService.ts',
      'utils/friendService.ts',
      'contexts/AuthContext.tsx',
    ];
    const calledNames = new Set<string>();
    for (const rel of frontendFiles) {
      const src = fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
      for (const m of src.matchAll(/callFn<[^>]*>\(\s*'([a-zA-Z0-9_]+)'/g)) {
        calledNames.add(m[1]);
      }
      for (const m of src.matchAll(/httpsCallable<[^>]*>\(\s*functions\s*,\s*'([a-zA-Z0-9_]+)'/g)) {
        calledNames.add(m[1]);
      }
    }

    expect(calledNames.size).toBeGreaterThanOrEqual(20);
    for (const fnName of calledNames) {
      expect(indexSrc).toMatch(new RegExp(`\\b${fnName}\\b`));
    }
  });

  it('21. Online match writes /matchReports/{reportId} only on RESULT, preserves multi-round ballots & >80 clues, and stays idempotent', async () => {
    const db = new InMemoryFirestore();
    let currentNow = 1_710_000_000_000;
    const deps = { db, serverTimestamp: () => 'SERVER_TS', now: () => currentNow };

    const uids = ['p1', 'p2', 'p3', 'p4', 'p5'];
    for (const u of uids) {
      db.setRaw(`users/${u}`, {
        uid: u,
        displayName: `Agent_${u}`,
        photoURL: '',
        xp: 100,
        level: 1,
        stats: { wins: 0, played: 0, hosted: 0, currentStreak: 0, longestStreak: 0, roleStats: {} },
      });
      db.setRaw(`publicProfiles/${u}`, {
        uid: u,
        displayName: `Agent_${u}`,
        photoURL: '',
        xp: 100,
        level: 1,
        stats: { wins: 0, played: 0, hosted: 0, currentStreak: 0, longestStreak: 0, roleStats: {} },
      });
    }

    db.setRaw('rooms/r_cf1', {
      id: 'r_cf1',
      code: 'CF100',
      hostId: 'p1',
      status: 'waiting',
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      turnDurationSeconds: 45,
      players: uids.map((u) => ({
        uid: u,
        name: `Agent_${u}`,
        avatar: '',
        isReady: true,
        isEliminated: false,
        score: 0,
      })),
      playerIds: [...uids],
      gameState: null,
    });

    await executeBeginMatch(deps, 'p1', { roomId: 'r_cf1' });
    await executeStartRound(deps, 'p1', { roomId: 'r_cf1' });
    for (const u of uids) {
      await executeMarkRevealReady(deps, u, { roomId: 'r_cf1' });
    }

    const roomAfterReveal = db.getRaw('rooms/r_cf1')!;
    const privAfterReveal = db.getRaw('rooms/r_cf1/privateState/current')!;
    const matchId = roomAfterReveal.gameState.matchId as string;
    const expectedReportId = `r_cf1_${matchId}`;

    // No match report may exist before RESULT
    expect(db.getRaw(`matchReports/${expectedReportId}`)).toBeUndefined();

    // Seed 82 historical clues on both public (sliced to 80) and privateState.cluesHistory
    // before running real Round 1 & Round 2 submitClue calls, verifying >80 preservation.
    const preClues = Array.from({ length: 82 }, (_, idx) => ({
      id: `seed_c_${idx + 1}`,
      uid: uids[idx % uids.length],
      name: `Agent_${uids[idx % uids.length]}`,
      avatar: '',
      text: `historical clue ${idx + 1}`,
      round: 1,
    }));
    roomAfterReveal.gameState.clues = preClues.slice(-80);
    privAfterReveal.cluesHistory = [...preClues];
    db.setRaw('rooms/r_cf1', roomAfterReveal);
    db.setRaw('rooms/r_cf1/privateState/current', privAfterReveal);

    // Force deterministic roles so Round 1 eliminates a Citizen and Round 2 eliminates Mr. White
    privAfterReveal.rolesByUid = {
      p1: 'citizen',
      p2: 'citizen',
      p3: 'citizen',
      p4: 'citizen',
      p5: 'mrwhite',
    };
    privAfterReveal.impostorIds = ['p5'];
    privAfterReveal.undercoverIds = [];
    db.setRaw('rooms/r_cf1/privateState/current', privAfterReveal);

    // Round 1: submit real clue for every turn in turnOrder, then start voting and vote out p4 (citizen)
    for (const turnUid of roomAfterReveal.gameState.turnOrder as string[]) {
      await executeSubmitClue(deps, turnUid, {
        roomId: 'r_cf1',
        text: turnUid === roomAfterReveal.gameState.turnOrder[0] ? 'R1 verified clue' : `R1 clue ${turnUid}`,
      });
    }

    await executeStartVoting(deps, 'p1', { roomId: 'r_cf1' });
    await executeSubmitVote(deps, 'p1', { roomId: 'r_cf1', suspectUid: 'p4' });
    await executeSubmitVote(deps, 'p2', { roomId: 'r_cf1', suspectUid: 'p4' });
    await executeSubmitVote(deps, 'p3', { roomId: 'r_cf1', suspectUid: 'p4' });
    currentNow += FORCE_RESOLVE_MIN_ELAPSED_MS + 1_000;
    await executeResolveVotes(deps, 'p1', { roomId: 'r_cf1' });
    expect(db.getRaw(`matchReports/${expectedReportId}`)).toBeUndefined();

    await executeProceedAfterVoteReveal(deps, 'p1', { roomId: 'r_cf1' });
    const roomR2 = db.getRaw('rooms/r_cf1')!;
    expect(roomR2.gameState.phase).toBe('PLAYING');
    expect(roomR2.gameState.round).toBe(2);
    expect(db.getRaw(`matchReports/${expectedReportId}`)).toBeUndefined();

    // Round 2: submit real clues for all remaining alive players, then vote out p5 (mrwhite) and miss guess -> RESULT
    currentNow += 5_000;
    for (const turnUid of roomR2.gameState.turnOrder as string[]) {
      await executeSubmitClue(deps, turnUid, {
        roomId: 'r_cf1',
        text: turnUid === roomR2.gameState.turnOrder[0] ? 'R2 verified clue' : `R2 clue ${turnUid}`,
      });
    }
    await executeStartVoting(deps, 'p1', { roomId: 'r_cf1' });

    await executeSubmitVote(deps, 'p1', { roomId: 'r_cf1', suspectUid: 'p5' });
    await executeSubmitVote(deps, 'p2', { roomId: 'r_cf1', suspectUid: 'p5' });
    await executeSubmitVote(deps, 'p3', { roomId: 'r_cf1', suspectUid: 'p5' });
    currentNow += FORCE_RESOLVE_MIN_ELAPSED_MS + 1_000;
    await executeResolveVotes(deps, 'p1', { roomId: 'r_cf1' });
    await executeProceedAfterVoteReveal(deps, 'p1', { roomId: 'r_cf1' });

    expect(db.getRaw('rooms/r_cf1')!.gameState.phase).toBe('IMPOSTOR_GUESS');
    expect(db.getRaw(`matchReports/${expectedReportId}`)).toBeUndefined();

    currentNow += 10_000;
    await executeSubmitMrWhiteGuess(deps, 'p5', {
      roomId: 'r_cf1',
      guess: '__definitely_wrong_secret_guess__',
    });

    const settledRoom = db.getRaw('rooms/r_cf1')!;
    expect(settledRoom.gameState.phase).toBe('RESULT');
    expect(settledRoom.gameState.caseFileReportId).toBe(expectedReportId);

    const report = db.getRaw(`matchReports/${expectedReportId}`)!;
    expect(report).toBeDefined();
    expect(report.mode).toBe('online');
    expect(report.reportId).toBe(expectedReportId);
    expect(report.operationCode).toMatch(/^OP-\d{4}$/);
    expect(report.winner).toBe('citizens');
    expect(report.participantIds).toEqual(expect.arrayContaining(uids));
    expect(report.roundCount).toBe(2);
    expect(report.rounds.length).toBe(2);

    // Public gameState.clues is capped at 80, while privateState + matchReport preserve all 91 clues (82 seeded + 5 R1 + 4 R2)
    expect(settledRoom.gameState.clues.length).toBe(80);
    const totalReportClues =
      report.rounds[0].clues.length + report.rounds[1].clues.length;
    expect(totalReportClues).toBe(91);
    expect(report.rounds[0].clues.some((c: any) => c.text === 'R1 verified clue')).toBe(true);
    expect(report.rounds[1].clues.some((c: any) => c.text === 'R2 verified clue')).toBe(true);

    // Verify Mr. White guess record + GHOST_PROTOCOL not_applicable in Online Classic
    expect(report.rounds[1].mrWhiteGuess?.guess).toBe('__definitely_wrong_secret_guess__');
    expect(report.rounds[1].mrWhiteGuess?.isCorrect).toBe(false);
    const ghostAward = report.awards.find((a: any) => a.awardId === 'GHOST_PROTOCOL');
    expect(ghostAward?.status).toBe('not_applicable');

    // Idempotency check: re-running applyMatchSettlementWrites on same matchId does not duplicate XP or overwrite report
    const p1XpBefore = db.getRaw('users/p1')!.xp;
    await db.runTransaction(async (tx) => {
      const roomSnap = await tx.get(db.collection('rooms').doc('r_cf1'));
      const privSnap = await tx.get(db.collection('rooms').doc('r_cf1').collection('privateState').doc('current'));
      const rData = roomSnap.data()!;
      const pState = privSnap.data()! as any;
      const profMap = await readPlayerProfileDocs(
        db,
        tx,
        rData.players.map((p: any) => p.uid)
      );
      applyMatchSettlementWrites({
        db,
        serverTimestamp: () => 'SERVER_TS',
        tx,
        roomRef: db.collection('rooms').doc('r_cf1'),
        roomData: rData,
        privateStateRef: db.collection('rooms').doc('r_cf1').collection('privateState').doc('current'),
        privateState: pState,
        players: rData.players,
        profileMap: profMap,
        winner: 'citizens',
        winReason: 'impostor_caught',
        endedAtMs: currentNow + 5000,
      });
    });
    expect(db.getRaw('users/p1')!.xp).toBe(p1XpBefore);
    expect(db.getRaw(`matchReports/${expectedReportId}`)!.endedAtMs).toBe(currentNow);
  });

  it('22. Mid-match player kick preserves departed player dossier, participantIds access, and player_departed event in matchReports', async () => {
    const db = new InMemoryFirestore();
    const nowMs = 1_710_100_000_000;
    const deps = { db, serverTimestamp: () => 'SERVER_TS', now: () => nowMs };

    const uids = ['p1', 'p2', 'p3', 'p4'];
    for (const u of uids) {
      db.setRaw(`users/${u}`, {
        uid: u,
        displayName: `Op_${u}`,
        photoURL: '',
        xp: 50,
        level: 1,
        stats: { wins: 0, played: 0, hosted: 0, currentStreak: 0, longestStreak: 0, roleStats: {} },
      });
      db.setRaw(`publicProfiles/${u}`, {
        uid: u,
        displayName: `Op_${u}`,
        photoURL: '',
        xp: 50,
        level: 1,
        stats: { wins: 0, played: 0, hosted: 0, currentStreak: 0, longestStreak: 0, roleStats: {} },
      });
    }

    db.setRaw('rooms/r_cf_kick', {
      id: 'r_cf_kick',
      code: 'CFK01',
      hostId: 'p1',
      status: 'playing',
      language: 'en',
      category: 'animals',
      difficulty: 'easy',
      players: uids.map((u) => ({
        uid: u,
        name: `Op_${u}`,
        avatar: '',
        isReady: true,
        isEliminated: false,
        score: 0,
      })),
      playerIds: [...uids],
      gameState: {
        phase: 'VOTING',
        matchId: 'm_kick_1',
        round: 1,
        category: 'animals',
        difficulty: 'easy',
        turnOrder: [...uids],
        currentTurnIndex: 0,
        turnsCompleted: true,
        clues: [],
        votedUids: [],
        votingStartedAt: nowMs - 20_000,
      },
    });
    db.setRaw('rooms/r_cf_kick/privateState/current', {
      matchId: 'm_kick_1',
      round: 1,
      startedAtMs: nowMs - 60_000,
      civilianWord: 'Lion',
      undercoverWord: 'Tiger',
      decoys: [],
      impostorIds: [],
      undercoverIds: ['p4'],
      rolesByUid: { p1: 'citizen', p2: 'citizen', p3: 'citizen', p4: 'undercover' },
      rosterByUid: {
        p1: { name: 'Op_p1', avatar: '' },
        p2: { name: 'Op_p2', avatar: '' },
        p3: { name: 'Op_p3', avatar: '' },
        p4: { name: 'Op_p4', avatar: '' },
      },
      votesByUid: {},
      cluesHistory: [],
      roundHistory: [],
      matchEvents: [],
      settledMatches: [],
    });

    // Kick citizen p3 mid-match
    await executeKickPlayer(deps, 'p1', { roomId: 'r_cf_kick', targetUid: 'p3' });
    expect(db.getRaw('rooms/r_cf_kick')!.gameState.phase).toBe('VOTING');

    // Remaining citizens vote out undercover p4 -> resolve votes -> proceed -> triggers settlement & matchReport
    await executeSubmitVote(deps, 'p1', { roomId: 'r_cf_kick', suspectUid: 'p4' });
    await executeSubmitVote(deps, 'p2', { roomId: 'r_cf_kick', suspectUid: 'p4' });
    await executeResolveVotes(deps, 'p1', { roomId: 'r_cf_kick' });
    await executeProceedAfterVoteReveal(deps, 'p1', { roomId: 'r_cf_kick' });

    const report = db.getRaw('matchReports/r_cf_kick_m_kick_1')!;
    expect(report).toBeDefined();
    expect(report.participantIds).toContain('p3');
    const kickedDossier = report.players.find((p: any) => p.uid === 'p3');
    expect(kickedDossier).toBeDefined();
    expect(kickedDossier.survived).toBe(false);
    expect(
      report.specialEvents.some((ev: any) => ev.type === 'player_departed' && ev.targetId === 'p3')
    ).toBe(true);
  });
});
