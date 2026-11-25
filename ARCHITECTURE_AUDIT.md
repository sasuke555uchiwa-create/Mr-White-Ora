# MR. WHITE — Architecture Audit (Phase 1)

This audit documents the pre-existing codebase architecture across **Local (Pass & Play)** and **Online Multiplayer**, identifies discrepancies and defects by severity, and records the Phase 1 & Phase 2 hardening changes implemented alongside deferred roadmap phases.

---

## 1. Local vs. Online Feature & Rule Parity Matrix

| System | Local (Pass & Play) | Online Multiplayer | Notes & Fairness Impact |
| :--- | :--- | :--- | :--- |
| **Main Roles** | `citizen`, `undercover`, `mrwhite` (`src/game/roleEngine.ts`) | `citizen`, `undercover`, `mrwhite` (`functions/src/gameLogic.ts`) | Role scaling aligns (`mrwhite` + scaled `undercover` at 5+/8+ players in Online; configurable in Local). |
| **Special Roles (8)** | Supported (`fool`, `boomerang`, `protector`, `justice`, `ghost`, `lovers`, `avenger`, `mr_meme`) | Intentionally disabled (`onlineClassicRolesNote` in `OnlineLobbyScreen` / `OnlineGameScreen`) | No false claims in UI; Phase 3+ can expand online special roles safely. |
| **Legacy `inspector` Role** | Defined in `types.ts`, `assetRegistry.ts`, `designSystem.ts`, `specialRoles.ts` — **not assigned in gameplay** | Not assigned | Preserved compatibility mappings (portrait, title, color token); **not advertised as playable**. |
| **Voting Modes** | Player chooses **Group Consensus** or **Individual Secret Vote** (`VotingScreen.tsx`) | Strictly **Server-Authoritative Secret Vote** (`submitVote` / `privateState.votesByUid`) | Local Group mode does not collect per-voter ballots; Case File explicitly labels Group mode as consensus rather than fabricating accuracy metrics. |
| **Match Scoring / XP** | Yanstar points (`2` Citizen, `6` Mr. White guess, `10` Undercover, `12` Mr. White survive, `+4` Mr. Joy) | `xpDelta = roundPoints * 10` (+20 XP Citizen accurate-vote bonus) | Authoritative server writes (`users`, `publicProfiles`) cannot be modified by clients. |
| **Shop Perks** | `extra_time` (`+15s` turn timer) active locally in `QuestionPhase.tsx` | Server-authoritative `room.turnDurationSeconds` only | Prevents pay-to-win advantages in competitive Online matches. |
| **Data Privacy** | Local-only device state + `localStorage` | Roles/words isolated in `rooms/{id}/privatePlayers/{uid}`; all secrets & ballots in `privateState/current` (`allow read, write: if false`) | App Check enforces fail-closed in deployed Cloud Functions (`callableConfig.ts`). |

---

## 2. Discovered Defects & Resolutions

| Severity | Issue | Location | Resolution |
| :--- | :--- | :--- | :--- |
| **Critical** | **Multi-round clue & vote history wiped on round transitions** (both Local and Online). Advancing to `nextRound` cleared `privateState.votesByUid` and `useOfflineMatch` `voteData`, and Online `gameState.clues` truncated at 80 entries. | `functions/src/gameHandlers.ts`, `functions/src/roomHandlers.ts`, `hooks/useOfflineMatch.ts` | **Fixed in Phase 1:** Added persistent `roundHistory`, `cluesHistory`, `matchEvents`, and `startedAtMs` on `privateState/current` (Online) and dedicated refs/snapshots in `useOfflineMatch` (Local) captured *before* per-round resets. |
| **Critical** | **Empty-room cleanup deletes `/rooms/{roomId}` subcollections**, which would destroy any online match report stored beneath a room. | `functions/src/roomHandlers.ts` (`cleanupEmptyRoomDocs`) | **Fixed in Phase 2:** Authoritative Online Case Files are persisted in top-level `/matchReports/{reportId}` atomically during `applyMatchSettlementWrites`, gated strictly to `participantIds` + admins post-match. |
| **High** | **Avenger eliminating Mr. White skipped `IMPOSTOR_GUESS` when `relatedWords` was empty** (e.g., custom word pairs without decoys), silently eliminating Mr. White despite `ImpostorGuessScreen` using free-text matching. | `hooks/useOfflineMatch.ts:315` | **Fixed in Phase 1:** Removed the `relatedWords.length > 0` gate so Mr. White always receives their last-chance guess when targeted by Mr. Avenger. |
| **Medium** | **Shield `specialAbilityUsed` flag updated `target.id` instead of `shieldHolderId`** in passive protection branch and lacked explicit protection event tracking. | `hooks/useOfflineMatch.ts:363-372` | **Fixed in Phase 1:** Explicitly updates `shieldResult.shieldHolderId` and logs `shield_block` events cleanly. |
| **Medium** | **External DiceBear SVG fallback URL** injected when an online player had no avatar photo, creating an unnecessary third-party image request. | `functions/src/roomHandlers.ts:102` | **Fixed in Phase 1:** Replaced external URL fallback with empty string `''`, letting `components/Avatar.tsx` render its deterministic local monogram avatar. |
| **Medium** | **Missing match start timestamp** prevented accurate match duration tracking in both Online and Local modes. | `functions/src/matchSettlement.ts`, `hooks/useOfflineMatch.ts` | **Fixed in Phase 1:** Added `startedAtMs` capture on round-1 start (`executeStartRound` / `initializeGame`). |
| **Low (Legacy)** | **`inspector` role assets/types exist without active mechanics.** | `types.ts`, `data/specialRoles.ts` | **Documented:** Preserved for backward asset/type compatibility; excluded from active role pools until designed & implemented cleanly. |

---

## 3. Security & Integrity Boundaries Preserved

1. **Zero Mid-Match Information Leakage**: `/matchReports/{reportId}` is created *exclusively* inside `applyMatchSettlementWrites` when a match reaches `RESULT`. It is never written or readable while a match is in progress.
2. **Idempotent Settlement Guard**: `alreadySettled` (`privateState.settledMatches.includes(privateState.matchId)`) guarantees a match writes XP, profile stats, and `/matchReports/{reportId}` at most once.
3. **Rule Hardening**: `/matchReports/{reportId}` allows `get` only for `request.auth.uid in existing().participantIds || isAdmin()`, `list` only when constrained to `request.auth.uid in existing().participantIds`, and denies all client creates/updates/deletes (`allow create, update, delete: if false`).
4. **Honest Metrics (No Fabricated Data)**: When a Local Pass & Play match uses Group Consensus Vote or verbal clues without typed entries, vote accuracy is explicitly flagged as `insufficient_data` rather than fabricated.

---

## 4. Phase 4: Quality Gate, Automated Testing & CI Hardening

### 4.1 Quality Gate Scripts & Tooling Separation

Root `package.json` separates verification into independent, composable scripts:
- `npm run typecheck` — Full TypeScript validation (`tsc --noEmit`). Requires Cloud Functions dependencies (`npm --prefix functions ci`) because root security/regression tests directly import `functions/src/*`.
- `npm run lint` — Genuine ESLint 10 source validation via `eslint.config.mjs` (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and service worker globals for `public/sw.js`), completely isolated from `eslint.rules.config.mjs`.
- `npm run lint:rules` — Dedicated Firestore Security Rules linting (`eslint -c eslint.rules.config.mjs firestore.rules` using `@firebase/eslint-plugin-security-rules`).
- `npm run test:unit` — Runs all Vitest suites under `tests/` (`securityAudit.test.ts`, `securityRegression.test.ts`, `caseFileEngine.test.ts`, `caseFileArchiveValidation.test.tsx`, `gameEngine.test.ts`, `gameplayRegression.test.tsx`, `gameStatistics.test.ts`, `storageService.test.ts`, `pwaAndAssets.test.ts`).
- `npm run test:firestore` — Executes `firestore.rules.test.ts` inside the local Firebase Firestore Emulator (`firebase emulators:exec --only firestore`). **Prerequisite:** Java JRE 21+ must be installed on the host.
- `npm run build` — Production Vite bundle build (`vite build`).
- `npm run check` — Runs `typecheck`, `lint`, `lint:rules`, `test:unit`, and `build` sequentially.

### 4.2 Phase 4 Audit Findings & Hardening Changes

| Category | Finding | Resolution / Status |
| :--- | :--- | :--- |
| **Lint Misconfiguration** | Root `"lint"` previously ran `tsc --noEmit` rather than source linting, leaving `no-empty`, `prefer-const`, `no-useless-assignment`, and React Hook violations unchecked. | Added `eslint.config.mjs`, restored `"lint": "eslint ."`, added `"typecheck": "tsc --noEmit"`, and resolved 13 source lint errors across `ProfileScreen.tsx`, `QuestionPhase.tsx`, `src/game/roleEngine.ts`, `src/game/statsEngine.ts`, and `tests/securityAudit.test.ts`. |
| **Typecheck Dependency** | Root tests import `functions/src/*`; without `functions/node_modules`, `tsc --noEmit` fails on `firebase-functions/v2/https`. | Verified `npm --prefix functions ci && npm --prefix functions run build` and wired `functions ci` + `build` into `.github/workflows/quality.yml` ahead of `npm run check`. |
| **Firestore DB Config Mismatch** | `firebase.json` specifies `firestore.database = "ai-studio-379d796d-f978-4bae-a5f9-9fa5f7f43ac4"`, whereas `firebase-applet-config.json` points to `firestoreDatabaseId = "ai-studio-mrwhite3chatgptf-ce9cfaac-be2e-4b0e-83fe-da0bb6f3d0b2"` and `firestore.rules.test.ts` uses `PROJECT_ID = 'mercurial-yew-f6tp2'`. | Documented without mutating active deployment configs; verify alignment before running `firebase deploy --only firestore:rules`. |
| **Local Emulator Prerequisite** | `firebase` CLI is installed, but headless containers without a Java JRE cannot boot the Firestore Emulator for `npm run test:firestore`. | Wired `.github/workflows/quality.yml` with `actions/setup-java@v4` (Temurin Java 21) so `firestore.rules.test.ts` executes automatically in CI on every push/PR to `main`. |
| **Regression Coverage** | `useOfflineMatch` special-role flows, Case File / Archive UI contracts, PWA precache / `assetRegistry` integrity, and Web Audio sound branches lacked automated regression gates. | Added `tests/gameplayRegression.test.tsx`, `tests/caseFileArchiveValidation.test.tsx`, `tests/securityRegression.test.ts`, `tests/pwaAndAssets.test.ts`, and targeted `deleteDoc`/unverified-user/list denials in `firestore.rules.test.ts`. |

