/**
 * Firestore Security Rules Test Suite (Dirty Dozen Attack Payloads + Positive Access Checks)
 *
 * Run locally with Firebase Firestore Emulator (requires Java JRE):
 *   firebase emulators:exec --only firestore "npx vitest run firestore.rules.test.ts"
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

const PROJECT_ID = 'mercurial-yew-f6tp2';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', 'alice'), {
        uid: 'alice',
        displayName: 'Alice',
        photoURL: '',
        xp: 100,
        level: 2,
        stats: { wins: 1, hosted: 1, played: 2, longestStreak: 1 },
        connectedAccounts: { google: true, apple: false },
      });
      await setDoc(doc(db, 'publicProfiles', 'alice'), {
        uid: 'alice',
        displayName: 'Alice',
        photoURL: '',
        xp: 100,
        level: 2,
        stats: { wins: 1, hosted: 1, played: 2, longestStreak: 1 },
        updatedAt: new Date(),
      });
      await setDoc(doc(db, 'users', 'bob'), {
        uid: 'bob',
        displayName: 'Bob',
        photoURL: '',
        xp: 50,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 1, longestStreak: 0 },
        connectedAccounts: { google: true, apple: false },
      });
      await setDoc(doc(db, 'rooms', 'room_private'), {
        hostId: 'alice',
        isPrivate: true,
        status: 'waiting',
        playerIds: ['alice'],
        players: [{ uid: 'alice', name: 'Alice' }],
      });
      await setDoc(doc(db, 'rooms', 'room_public'), {
        hostId: 'alice',
        isPrivate: false,
        status: 'waiting',
        playerIds: ['alice'],
        players: [{ uid: 'alice', name: 'Alice' }],
      });
      await setDoc(doc(db, 'rooms', 'room_private', 'privatePlayers', 'alice'), {
        uid: 'alice',
        role: 'mrwhite',
        word: '',
      });
      await setDoc(doc(db, 'rooms', 'room_private', 'privateMeta', 'invite'), {
        secretCode: '123456',
      });
      await setDoc(doc(db, 'rooms', 'room_private', 'privateState', 'current'), {
        civilianWord: 'قهوة',
        undercoverWord: 'شاي',
      });
      await setDoc(doc(db, 'friendRequests', 'alice_bob'), {
        fromId: 'alice',
        toId: 'bob',
        status: 'pending',
      });
      await setDoc(doc(db, 'friendships', 'alice_bob'), {
        user1: 'alice',
        user2: 'bob',
      });
      await setDoc(doc(db, 'rateLimits', 'createRoom_alice'), {
        uid: 'alice',
        action: 'createRoom',
        windowStart: Date.now(),
        count: 1,
        expiresAt: Date.now() + 60_000,
      });
      await setDoc(doc(db, 'matchReports', 'room_private_match_1'), {
        schemaVersion: 1,
        reportId: 'room_private_match_1',
        operationCode: 'OP-4210',
        mode: 'online',
        roomId: 'room_private',
        matchId: 'match_1',
        endedAtMs: Date.now(),
        winner: 'citizens',
        participantIds: ['alice', 'bob'],
        players: [],
        rounds: [],
        awards: [],
      });
    });
  });

  const aliceDb = () =>
    testEnv.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true }).firestore();
  const bobDb = () =>
    testEnv.authenticatedContext('bob', { email: 'bob@example.com', email_verified: true }).firestore();

  // --- Dirty Dozen Attack Payloads ---
  it('1. DENIES fake profile XP injection on users/{uid}', async () => {
    await assertFails(
      updateDoc(doc(aliceDb(), 'users', 'alice'), {
        xp: 99999,
        level: 99,
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('2. DENIES admin escalation shadow field isAdmin on user profile create/update', async () => {
    const charlieDb = testEnv
      .authenticatedContext('charlie', { email: 'charlie@example.com', email_verified: true })
      .firestore();
    await assertFails(
      setDoc(doc(charlieDb, 'users', 'charlie'), {
        uid: 'charlie',
        displayName: 'Hacker',
        photoURL: '',
        xp: 0,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
        connectedAccounts: { google: true, apple: false },
        isAdmin: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('3. DENIES cross-user PII read on users/{victimUid}', async () => {
    await assertFails(getDoc(doc(bobDb(), 'users', 'alice')));
  });

  it('4. DENIES listing users directory', async () => {
    await assertFails(getDocs(collection(bobDb(), 'users')));
  });

  it('5. DENIES leaderboard XP/stats tampering on publicProfiles/{uid}', async () => {
    await assertFails(
      updateDoc(doc(aliceDb(), 'publicProfiles', 'alice'), {
        xp: 50000,
        stats: { wins: 500, hosted: 0, played: 0, longestStreak: 0 },
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('6. DENIES listing private rooms or unfiltered rooms queries', async () => {
    await assertFails(getDocs(collection(bobDb(), 'rooms')));
    await assertFails(getDocs(query(collection(bobDb(), 'rooms'), where('isPrivate', '==', true))));
  });

  it('7. DENIES non-member reading private room', async () => {
    await assertFails(getDoc(doc(bobDb(), 'rooms', 'room_private')));
  });

  it('8. DENIES direct client room mutations', async () => {
    await assertFails(
      updateDoc(doc(aliceDb(), 'rooms', 'room_private'), {
        status: 'finished',
      })
    );
  });

  it('9. DENIES cross-player privatePlayers secret word snooping', async () => {
    await assertFails(getDoc(doc(bobDb(), 'rooms', 'room_private', 'privatePlayers', 'alice')));
  });

  it('10. DENIES non-member privateMeta/invite snooping', async () => {
    await assertFails(getDoc(doc(bobDb(), 'rooms', 'room_private', 'privateMeta', 'invite')));
  });

  it('11. DENIES client access to server-only privateState', async () => {
    await assertFails(getDoc(doc(aliceDb(), 'rooms', 'room_private', 'privateState', 'current')));
  });

  it('12. DENIES direct client friendRequests forgery', async () => {
    await assertFails(
      setDoc(doc(bobDb(), 'friendRequests', 'alice_bob'), {
        fromId: 'alice',
        toId: 'bob',
        status: 'accepted',
      })
    );
  });

  // --- Positive Functional Verification ---
  it('ALLOWS verified owner to create and safely update own profile with serverTimestamp', async () => {
    const charlieDb = testEnv
      .authenticatedContext('charlie', { email: 'charlie@example.com', email_verified: true })
      .firestore();
    await assertSucceeds(
      setDoc(doc(charlieDb, 'users', 'charlie'), {
        uid: 'charlie',
        displayName: 'Charlie',
        photoURL: '',
        xp: 0,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
        connectedAccounts: { google: true, apple: false },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(aliceDb(), 'users', 'alice'), {
        displayName: 'Alice Updated',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('ALLOWS room member to read own privatePlayers doc and signed-in users to list public waiting rooms', async () => {
    await assertSucceeds(getDoc(doc(aliceDb(), 'rooms', 'room_private', 'privatePlayers', 'alice')));
    await assertSucceeds(getDoc(doc(aliceDb(), 'rooms', 'room_private', 'privateMeta', 'invite')));
    await assertSucceeds(
      getDocs(
        query(
          collection(bobDb(), 'rooms'),
          where('isPrivate', '==', false),
          where('status', '==', 'waiting')
        )
      )
    );
  });

  // --- Admin Lifecycle & Public Profile Backfill Tests ---
  it('ALLOWS active admin doc ({ active: true }) to read user docs and DENIES inactive or deleted admin docs', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins', 'bob'), { active: true });
    });
    await assertSucceeds(getDoc(doc(bobDb(), 'users', 'alice')));

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins', 'bob'), { active: false });
    });
    await assertFails(getDoc(doc(bobDb(), 'users', 'alice')));

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = doc(ctx.firestore(), 'admins', 'bob');
      await (await import('firebase/firestore')).deleteDoc(snap);
    });
    await assertFails(getDoc(doc(bobDb(), 'users', 'alice')));
  });

  it('ALLOWS missing publicProfiles/{uid} backfill matching users/{uid} but DENIES forged XP/stats', async () => {
    await assertSucceeds(
      setDoc(doc(bobDb(), 'publicProfiles', 'bob'), {
        uid: 'bob',
        displayName: 'Bob',
        photoURL: '',
        xp: 50,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 1, longestStreak: 0 },
        updatedAt: serverTimestamp(),
      })
    );

    const bobForgeDb = testEnv
      .authenticatedContext('bob2', { email: 'bob2@example.com', email_verified: true })
      .firestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'bob2'), {
        uid: 'bob2',
        displayName: 'Bob2',
        photoURL: '',
        xp: 50,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 1, longestStreak: 0 },
        connectedAccounts: { google: true, apple: false },
      });
    });
    await assertFails(
      setDoc(doc(bobForgeDb, 'publicProfiles', 'bob2'), {
        uid: 'bob2',
        displayName: 'Bob2',
        photoURL: '',
        xp: 99999,
        level: 50,
        stats: { wins: 500, hosted: 0, played: 1, longestStreak: 0 },
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('ALLOWS signed-in leaderboard query on publicProfiles with xp >= 0 and DENIES unfiltered or unauthenticated queries', async () => {
    await assertSucceeds(
      getDocs(
        query(
          collection(bobDb(), 'publicProfiles'),
          where('xp', '>=', 0),
          orderBy('xp', 'desc'),
          limit(10)
        )
      )
    );

    await assertFails(getDocs(collection(bobDb(), 'publicProfiles')));
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      getDocs(
        query(
          collection(unauthDb, 'publicProfiles'),
          where('xp', '>=', 0),
          orderBy('xp', 'desc'),
          limit(10)
        )
      )
    );
  });

  it('ALLOWS participant reads on friendRequests & friendships, DENIES outsiders/writes, and DENIES rateLimits access', async () => {
    const charlieDb = testEnv
      .authenticatedContext('charlie', { email: 'charlie@example.com', email_verified: true })
      .firestore();

    await assertSucceeds(getDoc(doc(aliceDb(), 'friendRequests', 'alice_bob')));
    await assertSucceeds(getDoc(doc(bobDb(), 'friendships', 'alice_bob')));

    await assertFails(getDoc(doc(charlieDb, 'friendRequests', 'alice_bob')));
    await assertFails(getDoc(doc(charlieDb, 'friendships', 'alice_bob')));
    await assertFails(
      setDoc(doc(aliceDb(), 'friendships', 'alice_charlie'), {
        user1: 'alice',
        user2: 'charlie',
      })
    );

    await assertFails(getDoc(doc(aliceDb(), 'rateLimits', 'createRoom_alice')));
    await assertFails(
      setDoc(doc(aliceDb(), 'rateLimits', 'createRoom_alice'), {
        uid: 'alice',
        action: 'createRoom',
        count: 0,
      })
    );
  });

  it('ALLOWS matchReports participant get & filtered list, ALLOWS admin get, and DENIES outsiders, unauth, and client writes', async () => {
    const charlieDb = testEnv
      .authenticatedContext('charlie', { email: 'charlie@example.com', email_verified: true })
      .firestore();
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(aliceDb(), 'matchReports', 'room_private_match_1')));
    await assertSucceeds(
      getDocs(
        query(
          collection(bobDb(), 'matchReports'),
          where('participantIds', 'array-contains', 'bob'),
          orderBy('endedAtMs', 'desc')
        )
      )
    );

    await assertFails(getDoc(doc(charlieDb, 'matchReports', 'room_private_match_1')));
    await assertFails(getDoc(doc(unauthDb, 'matchReports', 'room_private_match_1')));
    await assertFails(getDocs(collection(aliceDb(), 'matchReports')));
    await assertFails(
      setDoc(doc(aliceDb(), 'matchReports', 'forged_report'), {
        reportId: 'forged_report',
        participantIds: ['alice'],
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb(), 'matchReports', 'room_private_match_1'), {
        winner: 'impostor',
      })
    );

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'admins', 'charlie'), { active: true });
    });
    await assertSucceeds(getDoc(doc(charlieDb, 'matchReports', 'room_private_match_1')));
  });

  it('DENIES unverified email accounts creating/updating users, direct admins/roomCodes access, non-participant matchReports list, and client deletes', async () => {
    const unverifiedDb = testEnv
      .authenticatedContext('dave', { email: 'dave@example.com', email_verified: false })
      .firestore();

    await assertFails(
      setDoc(doc(unverifiedDb, 'users', 'dave'), {
        uid: 'dave',
        displayName: 'Dave',
        photoURL: '',
        xp: 0,
        level: 1,
        stats: { wins: 0, hosted: 0, played: 0, longestStreak: 0 },
        connectedAccounts: { google: true, apple: false },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    await assertFails(setDoc(doc(aliceDb(), 'admins', 'alice'), { active: true }));
    await assertFails(getDocs(collection(aliceDb(), 'admins')));
    await assertFails(getDoc(doc(aliceDb(), 'roomCodes', '123456')));
    await assertFails(
      setDoc(doc(aliceDb(), 'roomCodes', '654321'), { roomId: 'room_private', hostId: 'alice' })
    );

    const charlieDb = testEnv
      .authenticatedContext('charlie', { email: 'charlie@example.com', email_verified: true })
      .firestore();
    await assertFails(
      getDocs(
        query(
          collection(charlieDb, 'matchReports'),
          where('participantIds', 'array-contains', 'bob')
        )
      )
    );

    await assertFails(deleteDoc(doc(aliceDb(), 'users', 'alice')));
    await assertFails(deleteDoc(doc(aliceDb(), 'publicProfiles', 'alice')));
    await assertFails(deleteDoc(doc(aliceDb(), 'rooms', 'room_private')));
    await assertFails(deleteDoc(doc(aliceDb(), 'matchReports', 'room_private_match_1')));
  });
});
