# Mr. White — Security Specification & Threat Model

## 1. Data Invariants
1. **Zero Secret Leakage**: `rooms/{roomId}` MUST NEVER contain `secretWord`, `undercoverWord`, `rolesByUid`, `votesByUid`, or `secretCode`. Per-player secrets reside exclusively in `rooms/{roomId}/privatePlayers/{uid}`, room invite codes live in `rooms/{roomId}/privateMeta/invite`, and authoritative match state (`rolesByUid`, `votesByUid`, `settledMatches`) lives in server-only `rooms/{roomId}/privateState/current`.
2. **Server-Authoritative Progression & Settlement**: Clients cannot directly create, modify, or delete `rooms`, `privatePlayers`, `privateMeta`, `privateState`, `roomCodes`, `friendRequests`, or `friendships`. Every state transition is executed inside a Firestore Transaction by Firebase Cloud Functions (`firebase-admin`).
3. **Immutable XP, Level & Match Stats**: Users cannot self-award XP, inflate levels, spoof wins/hosted/played counts, or inject `isAdmin`/`role` privileges in `users/{uid}` or `publicProfiles/{uid}`.
4. **PII Isolation (Split Collection)**: Private user records (`users/{uid}`, containing `connectedAccounts`) are readable only by the owner (`request.auth.uid == userId`) or a verified admin. Social screens (`LeaderboardSection`, `FriendsSection`, `PlayerStatsModal`) read strictly from `publicProfiles/{uid}`.
5. **Private Room & Waiting Query Enforcement**: Listing `/rooms` is restricted to documents where `isPrivate == false && status == 'waiting'`. Private rooms or active matches cannot be enumerated via `list` queries.
6. **Master Gate Membership Isolation**: Accessing `rooms/{roomId}/privatePlayers/{playerUid}` requires `request.auth.uid == playerUid` AND active membership in `rooms/{roomId}.playerIds`.
7. **Admin Privilege Verification**: Admin access is never derived from client `localStorage` flags or hardcoded frontend passcodes. Verification relies on `admins/{uid}` + Firebase Custom Claims (`admin === true`) / verified bootstrapped admin email.
8. **Temporal Integrity & Strict Allowlists**: Client profile creation and updates require `updatedAt == request.time` (`serverTimestamp()`), bounded string/media lengths, and strict `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)` checks.

---

## 2. The "Dirty Dozen" Attack Payloads (Expected: `PERMISSION_DENIED`)
1. **Fake Profile XP Injection (`users/{uid}` update)**: `{ "xp": 99999, "level": 99, "updatedAt": <serverTimestamp> }` by owner -> **DENIED** (`xp`, `level` are immutable from client).
2. **Admin Escalation Shadow Field (`users/{uid}` create/update)**: `{ "uid": "<uid>", "displayName": "Hacker", "isAdmin": true, "xp": 0, "level": 1, ... }` -> **DENIED** (`keys().hasOnly` & `affectedKeys().hasOnly` reject `isAdmin`).
3. **Cross-User PII Read (`users/{victimUid}` get)**: Authenticated non-owner reads another user's `/users/{victimUid}` document -> **DENIED** (`request.auth.uid != userId`).
4. **User Directory Enumeration (`users` list)**: Authenticated user runs `getDocs(collection(db, 'users'))` -> **DENIED** (`allow list: if false`).
5. **Leaderboard XP Tampering (`publicProfiles/{uid}` update)**: Authenticated owner updates `publicProfiles/{uid}` with `{ "xp": 50000, "stats": { "wins": 500 } }` -> **DENIED**.
6. **Private Room Listing Leak (`rooms` list without filter)**: Client queries `collection(db, 'rooms')` or filters `where('isPrivate', '==', true)` -> **DENIED** (`isPrivate == false && status == 'waiting'` enforced).
7. **Private Room Unauthorized Get (`rooms/{privateRoomId}` get)**: Non-member authenticated user attempts `getDoc(doc(db, 'rooms', privateRoomId))` -> **DENIED**.
8. **Direct Room State Mutation (`rooms/{roomId}` update/create)**: Host or player writes directly to `rooms/{roomId}` (e.g., setting `gameState.winner` or `hostId`) -> **DENIED** (`allow create, update, delete: if false`).
9. **Cross-Player Secret Word Snooping (`rooms/{roomId}/privatePlayers/{otherUid}` get)**: Player reads another player's `privatePlayers` doc to learn who Mr. White / Undercover is -> **DENIED**.
10. **Non-Member Invite Code Snooping (`rooms/{roomId}/privateMeta/invite` get)**: User not in `rooms/{roomId}.playerIds` tries to read `privateMeta/invite` -> **DENIED**.
11. **Server Private State Snooping (`rooms/{roomId}/privateState/current` get)**: Any client tries to read `civilianWord` or `votesByUid` -> **DENIED**.
12. **Friend Request Forgery (`friendRequests/{id}` create/update)**: Attacker attempts to directly write `{ "fromId": "<victimUid>", "toId": "<attackerUid>", "status": "accepted" }` -> **DENIED** (`allow write: if false`).

---

## 3. Production App Check & Data Retention Controls
1. **Cloud Functions App Check**: All 26 callable endpoints use `getCallableOptions()` (`enforceAppCheck: resolveEnforceAppCheck()`). Deployed Cloud Functions fail closed (`true`) in production unless explicitly disabled via `ENFORCE_APP_CHECK=false` for local testing. Production frontend builds must set `VITE_FIREBASE_APPCHECK_SITE_KEY` (reCAPTCHA v3 site key).
2. **Cloud Firestore App Check (Separate Firebase Console Step)**: Cloud Functions `enforceAppCheck` does NOT automatically protect direct Firestore SDK reads (`users`, `publicProfiles`, `rooms`, `privatePlayers`, `friendRequests`, `friendships`). In Firebase Console -> **App Check** -> **APIs** -> **Cloud Firestore**, enable enforcement after verifying `VITE_FIREBASE_APPCHECK_SITE_KEY` is active on all deployed web origins (including App Hosting / custom domains) and unregister or register dev debug tokens safely without ever committing secrets.
3. **Rate Limit Data Retention (`rateLimits/{bucketId}`)**:
   - Every bucket writes `expiresAt` as a Firestore `Timestamp` (`Timestamp.fromMillis(windowStart + windowMs)`).
   - **Recommended Native TTL Policy** (on named database `ai-studio-379d796d-f978-4bae-a5f9-9fa5f7f43ac4`):
     ```bash
     gcloud firestore fields ttls update expiresAt \
       --collection-group=rateLimits \
       --database=ai-studio-379d796d-f978-4bae-a5f9-9fa5f7f43ac4 \
       --enable-ttl
     ```
   - **Fallback Scheduled Cleaner**: `cleanupExpiredRateLimits` runs every 60 minutes (requires Cloud Scheduler / Blaze billing when deployed) and deletes only buckets where `expiresAt <= now - 60_000`, guaranteeing active or boundary rate-limit windows are never removed.

