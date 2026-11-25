import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DESIGNATED_OWNER_EMAIL, executeCheckAdminStatus } from '../functions/src/adminPolicy';
import { DbLike, DocRefLike, FunctionActionError, TxLike } from '../functions/src/errors';
import {
  executeBeginMatch,
  executeMarkRevealReady,
  executeProceedAfterVoteReveal,
  executeStartRound,
  executeStartVoting,
  executeSubmitClue,
  executeSubmitVote,
} from '../functions/src/gameHandlers';
import { executeCreateRoom, executeToggleReady } from '../functions/src/roomHandlers';
import { applyMatchSettlementWrites, readPlayerProfileDocs } from '../functions/src/matchSettlement';

class TestMemoryDb implements DbLike {
  private store = new Map<string, Record<string, any>>();
  private autoId = 0;

  setRaw(docPath: string, data: Record<string, any>) {
    this.store.set(docPath, structuredClone(data));
  }

  getRaw(docPath: string): Record<string, any> | undefined {
    const d = this.store.get(docPath);
    return d ? structuredClone(d) : undefined;
  }

  private applyPatch(target: Record<string, any>, patch: Record<string, any>) {
    for (const [key, val] of Object.entries(patch)) {
      if (!key.includes('.')) {
        target[key] = structuredClone(val);
      } else {
        const parts = key.split('.');
        let cursor: any = target;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') {
            cursor[parts[i]] = {};
          }
          cursor = cursor[parts[i]];
        }
        cursor[parts[parts.length - 1]] = structuredClone(val);
      }
    }
  }

  private makeDocRef(docPath: string): DocRefLike {
    const parts = docPath.split('/');
    const id = parts[parts.length - 1];
    const ref: any = {
      id,
      __path: docPath,
      collection: (sub: string) => this.makeCollectionRef(`${docPath}/${sub}`),
      get: async () => {
        const data = this.getRaw(docPath);
        return {
          exists: data !== undefined,
          id,
          ref,
          data: () => data,
        };
      },
    };
    return ref;
  }

  private makeCollectionRef(colPath: string) {
    const queryWith = (filters: Array<{ field: string; op: string; value: any }> = []) => ({
      where: (field: string, op: string, value: any) =>
        queryWith([...filters, { field, op, value }]),
      limit: (n: number) => ({
        get: async () => this.queryDocs(colPath, filters, n),
      }),
      get: async () => this.queryDocs(colPath, filters),
    });

    return {
      doc: (id?: string) => this.makeDocRef(`${colPath}/${id || `auto_${++this.autoId}`}`),
      get: async () => this.queryDocs(colPath, []),
      where: (field: string, op: string, value: any) => queryWith([{ field, op, value }]),
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
      if (filters.every((f) => data[f.field] === f.value)) {
        docs.push({
          exists: true,
          id: remainder,
          ref: this.makeDocRef(docPath),
          data: () => structuredClone(data),
        });
        if (limitCount !== undefined && docs.length >= limitCount) break;
      }
    }
    return { docs };
  }

  collection(colPath: string) {
    return this.makeCollectionRef(colPath);
  }

  async runTransaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T> {
    const staging = new Map<string, Record<string, any>>(
      Array.from(this.store.entries()).map(([k, v]) => [k, structuredClone(v)])
    );
    const ops: Array<() => void> = [];

    const tx: TxLike = {
      get: async (ref) => {
        const p = (ref as any).__path as string;
        const val = staging.get(p);
        return {
          exists: val !== undefined,
          id: ref.id,
          ref,
          data: () => (val ? structuredClone(val) : undefined),
        };
      },
      getAll: async (...refs) =>
        Promise.all(
          refs.map(async (ref) => {
            const p = (ref as any).__path as string;
            const val = staging.get(p);
            return {
              exists: val !== undefined,
              id: ref.id,
              ref,
              data: () => (val ? structuredClone(val) : undefined),
            };
          })
        ),
      set: (ref, data) => {
        const p = (ref as any).__path as string;
        const cloned = structuredClone(data);
        staging.set(p, cloned);
        ops.push(() => this.store.set(p, cloned));
      },
      update: (ref, patch) => {
        const p = (ref as any).__path as string;
        const cur = staging.get(p);
        if (!cur) throw new Error(`Missing doc for tx.update: ${p}`);
        const next = structuredClone(cur);
        this.applyPatch(next, patch);
        staging.set(p, next);
        ops.push(() => this.store.set(p, next));
      },
      delete: (ref) => {
        const p = (ref as any).__path as string;
        staging.delete(p);
        ops.push(() => this.store.delete(p));
      },
    };

    const out = await fn(tx);
    for (const apply of ops) apply();
    return out;
  }

  batch() {
    const ops: Array<() => void> = [];
    return {
      set: (ref: DocRefLike, data: Record<string, any>) => {
        const p = (ref as any).__path as string;
        ops.push(() => this.store.set(p, structuredClone(data)));
      },
      delete: (ref: DocRefLike) => {
        const p = (ref as any).__path as string;
        ops.push(() => this.store.delete(p));
      },
      commit: async () => {
        for (const apply of ops) apply();
      },
    };
  }
}

describe('Firebase Security Rules Static Boundary Verification', () => {
  const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

  it('enforces global default deny and blocks direct client writes on privileged collections', () => {
    expect(rulesText).toMatch(/match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
    expect(rulesText).toMatch(/match \/roomCodes\/\{code\} \{\s*allow read, write: if false;/);
    expect(rulesText).toMatch(/match \/rateLimits\/\{limitId\} \{\s*allow read, write: if false;/);
    expect(rulesText).toMatch(/match \/privateState\/\{docId\} \{\s*allow read, write: if false;/);
    expect(rulesText).toMatch(/match \/admins\/\{userId\}[\s\S]*allow list, write: if false;/);
  });

  it('locks xp, level, and stats against client modification on users and publicProfiles', () => {
    expect(rulesText).toContain('incoming().xp == existing().xp');
    expect(rulesText).toContain('incoming().level == existing().level');
    expect(rulesText).toContain('incoming().stats == existing().stats');
    expect(rulesText).toMatch(/match \/users\/\{userId\}[\s\S]*allow delete: if false;/);
    expect(rulesText).toMatch(/match \/publicProfiles\/\{userId\}[\s\S]*allow delete: if false;/);
  });

  it('enforces participant-only access on matchReports and denies client writes', () => {
    expect(rulesText).toMatch(
      /match \/matchReports\/\{reportId\}[\s\S]*request\.auth\.uid in existing\(\)\.participantIds[\s\S]*allow create, update, delete: if false;/
    );
  });
});

describe('Online Multiplayer & Backend Security Regression Boundaries', () => {
  it('never leaks words, full role maps, live ballots, or invite codes on public rooms/{roomId} before RESULT', async () => {
    const db = new TestMemoryDb();
    let nowMs = 1_710_500_000_000;
    const deps = { db, serverTimestamp: () => 'SERVER_TS', now: () => nowMs };

    const uids = ['host_1', 'p2', 'p3', 'p4'];
    for (const u of uids) {
      db.setRaw(`users/${u}`, {
        uid: u,
        displayName: `Agent_${u}`,
        photoURL: '',
        xp: 0,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
      });
      db.setRaw(`publicProfiles/${u}`, {
        uid: u,
        displayName: `Agent_${u}`,
        photoURL: '',
        xp: 0,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
      });
    }

    const { roomId } = await executeCreateRoom(
      deps,
      'host_1',
      { name: 'Agent_host_1' },
      { maxPlayers: 6, language: 'en', category: 'standard', difficulty: 'hard', isPrivate: true }
    );

    const roomDoc = db.getRaw(`rooms/${roomId}`)!;
    expect(roomDoc.secretCode).toBeUndefined();
    expect(roomDoc.hasSecretCode).toBe(true);

    // Add 3 more players and mark ready
    const curRoom = db.getRaw(`rooms/${roomId}`)!;
    db.setRaw(`rooms/${roomId}`, {
      ...curRoom,
      playerIds: uids,
      players: uids.map((u) => ({
        uid: u,
        name: `Agent_${u}`,
        avatar: '',
        isReady: false,
        isEliminated: false,
        score: 0,
        revealedRole: null,
      })),
    });
    for (const u of uids) {
      nowMs += 1_000;
      await executeToggleReady(deps, u, { roomId });
    }

    await executeBeginMatch(deps, 'host_1', { roomId });
    await executeStartRound(deps, 'host_1', { roomId });

    const revealRoom = db.getRaw(`rooms/${roomId}`)!;
    // Zero secret leakage on public room doc
    expect(revealRoom.civilianWord).toBeUndefined();
    expect(revealRoom.undercoverWord).toBeUndefined();
    expect(revealRoom.gameState.civilianWord).toBeUndefined();
    expect(revealRoom.gameState.secretWord).toBeUndefined();
    expect(revealRoom.gameState.rolesByUid).toBeUndefined();
    expect(revealRoom.gameState.votesByUid).toBeUndefined();
    expect(revealRoom.gameState.revealedResult).toBeNull();
    // Hard mode hides exact infiltrator breakdown on public room
    expect(revealRoom.gameState.mrWhiteCount).toBeNull();
    expect(revealRoom.gameState.undercoverCount).toBeNull();

    // Check privatePlayers docs isolation & hard-mode masking
    const privState = db.getRaw(`rooms/${roomId}/privateState/current`)!;
    for (const u of uids) {
      const privPlayer = db.getRaw(`rooms/${roomId}/privatePlayers/${u}`)!;
      const trueRole = privState.rolesByUid[u];
      expect(privPlayer).toBeDefined();
      if (trueRole === 'mrwhite') {
        expect(privPlayer.secretWord).toBeNull();
        expect(privPlayer.role).toBe('mrwhite');
      } else {
        expect(privPlayer.secretWord).toBe(
          trueRole === 'undercover' ? privState.undercoverWord : privState.civilianWord
        );
        // Hard mode masks citizen vs undercover as 'hidden'
        expect(privPlayer.role).toBe('hidden');
      }
    }

    // Complete reveal -> PLAYING -> check turn authorization
    for (const u of uids) {
      nowMs += 500;
      await executeMarkRevealReady(deps, u, { roomId });
    }
    const playingRoom = db.getRaw(`rooms/${roomId}`)!;
    expect(playingRoom.gameState.phase).toBe('PLAYING');
    const firstSpeaker = playingRoom.gameState.turnOrder[0];
    const nonSpeaker = uids.find((u) => u !== firstSpeaker)!;

    await expect(
      executeSubmitClue(deps, nonSpeaker, { roomId, text: 'Out of turn clue' })
    ).rejects.toMatchObject<Partial<FunctionActionError>>({ code: 'permission-denied' });

    for (const speaker of playingRoom.gameState.turnOrder) {
      nowMs += 500;
      await executeSubmitClue(deps, speaker, { roomId, text: `Clue_${speaker}` });
    }

    await executeStartVoting(deps, 'host_1', { roomId });
    // Self-vote and non-member vote must fail
    await expect(
      executeSubmitVote(deps, 'host_1', { roomId, suspectUid: 'host_1' })
    ).rejects.toMatchObject<Partial<FunctionActionError>>({ code: 'invalid-argument' });
    await expect(
      executeSubmitVote(deps, 'intruder_99', { roomId, suspectUid: 'p2' })
    ).rejects.toMatchObject<Partial<FunctionActionError>>({ code: 'permission-denied' });
  });

  it('requires verified email for designated owner admin access and revokes stale claims', async () => {
    const db = new TestMemoryDb();
    let claims: Record<string, any> = { admin: true };
    const adminAuth = {
      getUser: async () => ({ customClaims: claims }),
      setCustomUserClaims: async (_uid: string, next: Record<string, any> | null) => {
        claims = next || {};
      },
    };

    const unverifiedOwner = await executeCheckAdminStatus(
      { db, adminAuth },
      {
        uid: 'owner_1',
        token: { email: DESIGNATED_OWNER_EMAIL, email_verified: false, admin: true },
      }
    );
    expect(unverifiedOwner.isAdmin).toBe(false);
    expect(unverifiedOwner.claimUpdated).toBe(true);
    expect(claims.admin).toBeUndefined();

    const verifiedOwner = await executeCheckAdminStatus(
      { db, adminAuth },
      {
        uid: 'owner_1',
        token: { email: DESIGNATED_OWNER_EMAIL, email_verified: true, admin: false },
      }
    );
    expect(verifiedOwner.isAdmin).toBe(true);
    expect(verifiedOwner.claimUpdated).toBe(true);
    expect(claims.admin).toBe(true);
  });

  it('enforces idempotent settlement via settledMatches guard without double XP or duplicate reports', async () => {
    const db = new TestMemoryDb();
    const nowMs = 1_710_600_000_000;
    const uids = ['u1', 'u2', 'u3'];
    for (const u of uids) {
      db.setRaw(`users/${u}`, {
        uid: u,
        displayName: u,
        photoURL: '',
        xp: 0,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
      });
      db.setRaw(`publicProfiles/${u}`, {
        uid: u,
        displayName: u,
        photoURL: '',
        xp: 0,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
      });
    }

    db.setRaw('rooms/r_idem', {
      id: 'r_idem',
      hostId: 'u1',
      status: 'playing',
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      players: uids.map((u) => ({
        uid: u,
        name: u,
        avatar: '',
        isReady: true,
        isEliminated: false,
        score: 0,
        revealedRole: null,
      })),
      playerIds: uids,
      gameState: {
        phase: 'REVEAL_VOTE_RESULT',
        matchId: 'm_idem_1',
        round: 1,
        mostVotedId: 'u3',
        votersForEliminated: ['u1', 'u2'],
      },
    });
    db.setRaw('rooms/r_idem/privateState/current', {
      matchId: 'm_idem_1',
      round: 1,
      startedAtMs: nowMs - 25_000,
      civilianWord: 'Book',
      undercoverWord: 'Notebook',
      decoys: [],
      impostorIds: [],
      undercoverIds: ['u3'],
      rolesByUid: { u1: 'citizen', u2: 'citizen', u3: 'undercover' },
      votesByUid: { u1: 'u3', u2: 'u3', u3: 'u1' },
      cluesHistory: [],
      roundHistory: [],
      matchEvents: [],
      settledMatches: [],
    });

    await executeProceedAfterVoteReveal(
      { db, serverTimestamp: () => 'SERVER_TS', now: () => nowMs },
      'u1',
      { roomId: 'r_idem' }
    );

    const firstXp = db.getRaw('users/u1')!.xp;
    expect(firstXp).toBeGreaterThan(0);
    expect(db.getRaw('matchReports/r_idem_m_idem_1')).toBeDefined();

    // Replay settlement directly — settledMatches must block duplicate XP/report overwrite
    await db.runTransaction(async (tx) => {
      const rSnap = await tx.get(db.collection('rooms').doc('r_idem'));
      const pSnap = await tx.get(
        db.collection('rooms').doc('r_idem').collection('privateState').doc('current')
      );
      const profMap = await readPlayerProfileDocs(db, tx, uids);
      applyMatchSettlementWrites({
        db,
        serverTimestamp: () => 'SERVER_TS',
        tx,
        roomRef: db.collection('rooms').doc('r_idem'),
        roomData: rSnap.data()!,
        privateStateRef: db
          .collection('rooms')
          .doc('r_idem')
          .collection('privateState')
          .doc('current'),
        privateState: pSnap.data() as any,
        players: rSnap.data()!.players,
        profileMap: profMap,
        winner: 'citizens',
        winReason: 'impostor_caught',
        endedAtMs: nowMs + 10_000,
      });
    });

    expect(db.getRaw('users/u1')!.xp).toBe(firstXp);
    expect(db.getRaw('matchReports/r_idem_m_idem_1')!.endedAtMs).toBe(nowMs);
  });
});
