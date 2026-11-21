"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORCE_RESOLVE_MIN_ELAPSED_MS = void 0;
exports.getRequiredMajorityVotes = getRequiredMajorityVotes;
exports.executeBeginMatch = executeBeginMatch;
exports.executeStartRound = executeStartRound;
exports.executeMarkRevealReady = executeMarkRevealReady;
exports.executeSubmitClue = executeSubmitClue;
exports.executeAdvanceTurn = executeAdvanceTurn;
exports.executeStartVoting = executeStartVoting;
exports.executeSubmitVote = executeSubmitVote;
exports.executeResolveVotes = executeResolveVotes;
exports.executeProceedAfterVoteReveal = executeProceedAfterVoteReveal;
exports.executeSubmitMrWhiteGuess = executeSubmitMrWhiteGuess;
exports.executeReturnToLobby = executeReturnToLobby;
exports.executeNextMatch = executeNextMatch;
const crypto_1 = require("crypto");
const errors_1 = require("./errors");
const gameLogic_1 = require("./gameLogic");
const matchSettlement_1 = require("./matchSettlement");
const rateLimit_1 = require("./rateLimit");
const wordData_1 = require("./wordData");
exports.FORCE_RESOLVE_MIN_ELAPSED_MS = 15_000;
function getRequiredMajorityVotes(aliveCount) {
    if (aliveCount <= 1)
        return Math.max(0, aliveCount);
    return Math.min(aliveCount, Math.max(2, Math.floor(aliveCount / 2) + 1));
}
function getCurrentTime(deps) {
    return deps.now ? deps.now() : Date.now();
}
function getRateDeps(deps) {
    return { db: deps.db, now: deps.now, toTimestamp: deps.toTimestamp };
}
function assertSafeId(value, label) {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{2,128}$/.test(value.trim())) {
        throw new errors_1.FunctionActionError('invalid-argument', `Invalid ${label}.`);
    }
    return value.trim();
}
function sanitizePlainText(value, maxLen) {
    if (typeof value !== 'string')
        return '';
    return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}
function assertMatchStateSync(gameState, privateState) {
    if (gameState.matchId && privateState.matchId && gameState.matchId !== privateState.matchId) {
        throw new errors_1.FunctionActionError('failed-precondition', 'Stale match state detected.');
    }
    const pubRound = Number(gameState.round || 1);
    const privRound = Number(privateState.round || 1);
    if (pubRound !== privRound) {
        throw new errors_1.FunctionActionError('failed-precondition', 'Stale round state detected.');
    }
}
function buildNextTurnPatch(gameState, players, turnDurationSeconds, currentTimeMs, extraClue) {
    const aliveSet = new Set(players.filter((p) => !p.isEliminated).map((p) => p.uid));
    const turnOrder = Array.isArray(gameState.turnOrder) ? gameState.turnOrder : [];
    const currentIndex = Number(gameState.currentTurnIndex || 0);
    let nextIdx = currentIndex + 1;
    while (nextIdx < turnOrder.length && !aliveSet.has(turnOrder[nextIdx])) {
        nextIdx += 1;
    }
    const existingClues = Array.isArray(gameState.clues) ? gameState.clues : [];
    const clues = extraClue ? [...existingClues, extraClue].slice(-80) : existingClues;
    if (nextIdx >= turnOrder.length) {
        return {
            ...gameState,
            clues,
            turnsCompleted: true,
            turnEndsAt: null,
        };
    }
    return {
        ...gameState,
        clues,
        currentTurnIndex: nextIdx,
        turnEndsAt: currentTimeMs + turnDurationSeconds * 1000,
        turnsCompleted: false,
    };
}
async function executeBeginMatch(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.beginMatch);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.beginMatch);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [snap, rateSnap] = await Promise.all([tx.get(roomRef), tx.get(rateLimitRef)]);
        if (!snap.exists)
            throw new errors_1.FunctionActionError('not-found', 'Room not found.');
        const data = snap.data();
        const players = Array.isArray(data.players) ? data.players : [];
        if (data.hostId !== uid || !players.some((p) => p.uid === uid)) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can start the match.');
        }
        if (data.status !== 'waiting' || data.gameState) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Match can only begin from a waiting room.');
        }
        if (players.length < 3) {
            throw new errors_1.FunctionActionError('failed-precondition', 'At least 3 players required.');
        }
        const allReady = players.every((p) => p.isReady || p.uid === data.hostId);
        if (!allReady) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Not all players are ready.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.beginMatch, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        tx.update(roomRef, {
            status: 'playing',
            gameState: {
                phase: 'SETUP_PENDING',
            },
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeStartRound(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.startRound);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.startRound);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [roomSnap, prevPrivateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!roomSnap.exists)
            throw new errors_1.FunctionActionError('not-found', 'Room not found.');
        const data = roomSnap.data();
        const players = Array.isArray(data.players) ? data.players : [];
        if (data.hostId !== uid || !players.some((p) => p.uid === uid)) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can start a round.');
        }
        const phase = data.gameState?.phase;
        if (data.status !== 'playing' || (phase !== 'SETUP_PENDING' && phase !== 'CATEGORY_SELECT')) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Round can only be started during SETUP_PENDING.');
        }
        if (players.length < 3) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Need at least 3 players.');
        }
        const language = typeof data.language === 'string' ? data.language : 'ar';
        const category = typeof data.category === 'string' ? data.category : 'standard';
        const difficulty = data.difficulty === 'hard' ? 'hard' : 'easy';
        const { civilianWord, undercoverWord, decoys } = (0, wordData_1.pickServerWordPair)(language, category);
        const playerUids = players.map((p) => p.uid);
        const rolesByUid = (0, gameLogic_1.assignServerRoles)(playerUids);
        const impostorIds = playerUids.filter((id) => rolesByUid[id] === 'mrwhite');
        const undercoverIds = playerUids.filter((id) => rolesByUid[id] === 'undercover');
        const matchId = (0, crypto_1.randomUUID)();
        const prevSettled = prevPrivateSnap.exists
            ? prevPrivateSnap.data()?.settledMatches || []
            : [];
        const rosterByUid = Object.fromEntries(players.map((p) => [p.uid, { name: p.name, avatar: p.avatar || '' }]));
        const privateState = {
            matchId,
            round: 1,
            startedAtMs: nowMs,
            civilianWord,
            undercoverWord,
            decoys,
            impostorIds,
            undercoverIds,
            rolesByUid,
            rosterByUid,
            votesByUid: {},
            cluesHistory: [],
            roundHistory: [],
            matchEvents: [],
            settledMatches: prevSettled,
        };
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.startRound, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        tx.set(privateStateRef, {
            ...privateState,
            updatedAt: deps.serverTimestamp(),
        });
        for (const p of players) {
            const actualRole = rolesByUid[p.uid] || 'citizen';
            const assignedWord = actualRole === 'mrwhite'
                ? null
                : actualRole === 'undercover'
                    ? undercoverWord
                    : civilianWord;
            const visiblePrivateRole = actualRole === 'mrwhite'
                ? 'mrwhite'
                : difficulty === 'hard'
                    ? 'hidden'
                    : actualRole;
            const privPlayerRef = roomRef.collection('privatePlayers').doc(p.uid);
            tx.set(privPlayerRef, {
                uid: p.uid,
                matchId,
                round: 1,
                role: visiblePrivateRole,
                secretWord: assignedWord,
                updatedAt: deps.serverTimestamp(),
            });
        }
        const resetPlayers = players.map((p) => ({
            uid: p.uid,
            name: p.name,
            avatar: p.avatar,
            isReady: p.isReady,
            isEliminated: false,
            score: p.score || 0,
            revealedRole: null,
        }));
        tx.update(roomRef, {
            status: 'playing',
            players: resetPlayers,
            playerIds: playerUids,
            gameState: {
                phase: 'REVEAL',
                matchId,
                round: 1,
                category,
                difficulty,
                infiltratorsCount: impostorIds.length + undercoverIds.length,
                aliveInfiltratorsCount: impostorIds.length + undercoverIds.length,
                mrWhiteCount: difficulty === 'easy' ? impostorIds.length : null,
                undercoverCount: difficulty === 'easy' ? undercoverIds.length : null,
                readyPlayers: [],
                turnOrder: [],
                currentTurnIndex: 0,
                turnEndsAt: null,
                turnsCompleted: false,
                clues: [],
                votedUids: [],
                votingStartedAt: null,
                mostVotedId: null,
                mostVotedRevealedRole: null,
                votersForEliminated: [],
                tieBroken: false,
                guesserUid: null,
                winner: null,
                winReason: null,
                winningMrWhiteUid: null,
                revealedResult: null,
            },
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeMarkRevealReady(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.markRevealReady);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.markRevealReady);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [roomSnap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!roomSnap.exists || !privateSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Active match not found.');
        }
        const data = roomSnap.data();
        const players = Array.isArray(data.players) ? data.players : [];
        if (!players.some((p) => p.uid === uid)) {
            throw new errors_1.FunctionActionError('permission-denied', 'Not a member of this room.');
        }
        if (data.status !== 'playing') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Match is not active.');
        }
        const gameState = data.gameState || {};
        if (gameState.phase !== 'REVEAL') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Reveal phase is not active.');
        }
        const privateState = privateSnap.data();
        assertMatchStateSync(gameState, privateState);
        const existingReady = Array.isArray(gameState.readyPlayers)
            ? gameState.readyPlayers
            : [];
        if (existingReady.includes(uid)) {
            return; // Idempotent duplicate ready confirmation: skip writes and quota
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.markRevealReady, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        const readySet = new Set(existingReady);
        readySet.add(uid);
        const readyPlayers = Array.from(readySet);
        tx.set(rateLimitRef, nextRateDoc);
        if (readyPlayers.length >= players.length) {
            const turnDuration = Number(data.turnDurationSeconds || 45);
            const turnOrder = (0, gameLogic_1.buildServerTurnOrder)(players, privateState.rolesByUid, 1);
            tx.update(roomRef, {
                gameState: {
                    ...gameState,
                    phase: 'PLAYING',
                    round: 1,
                    readyPlayers: [],
                    turnOrder,
                    currentTurnIndex: 0,
                    turnEndsAt: nowMs + turnDuration * 1000,
                    turnsCompleted: false,
                    votingStartedAt: null,
                    clues: [],
                },
                updatedAt: deps.serverTimestamp(),
            });
        }
        else {
            tx.update(roomRef, {
                'gameState.readyPlayers': readyPlayers,
                updatedAt: deps.serverTimestamp(),
            });
        }
    });
    return { success: true };
}
async function executeSubmitClue(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const text = sanitizePlainText(dataIn?.text, 80);
    if (!text) {
        throw new errors_1.FunctionActionError('invalid-argument', 'Clue text is required.');
    }
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.submitClue);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.submitClue);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [snap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!snap.exists)
            throw new errors_1.FunctionActionError('not-found', 'Room not found.');
        const data = snap.data();
        if (data.status !== 'playing') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Match is not active.');
        }
        const gameState = data.gameState || {};
        if (gameState.phase !== 'PLAYING' || gameState.turnsCompleted) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Not currently accepting clues.');
        }
        const players = Array.isArray(data.players) ? data.players : [];
        const speaker = players.find((p) => p.uid === uid && !p.isEliminated);
        if (!speaker) {
            throw new errors_1.FunctionActionError('permission-denied', 'Eliminated or non-member cannot speak.');
        }
        const turnOrder = Array.isArray(gameState.turnOrder) ? gameState.turnOrder : [];
        const currentIndex = Number(gameState.currentTurnIndex || 0);
        if (turnOrder.length === 0 ||
            currentIndex < 0 ||
            currentIndex >= turnOrder.length ||
            turnOrder[currentIndex] !== uid) {
            throw new errors_1.FunctionActionError('permission-denied', 'It is not your turn to speak.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.submitClue, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        const clue = {
            id: `${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
            uid: speaker.uid,
            name: speaker.name,
            avatar: speaker.avatar,
            text,
            round: Number(gameState.round || 1),
            skipped: false,
        };
        const nextGameState = buildNextTurnPatch(gameState, players, Number(data.turnDurationSeconds || 45), nowMs, clue);
        tx.set(rateLimitRef, nextRateDoc);
        if (privateSnap.exists) {
            const prevClues = Array.isArray(privateSnap.data()?.cluesHistory)
                ? privateSnap.data().cluesHistory
                : [];
            tx.update(privateStateRef, {
                cluesHistory: [...prevClues, clue],
                updatedAt: deps.serverTimestamp(),
            });
        }
        tx.update(roomRef, {
            gameState: nextGameState,
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeAdvanceTurn(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const reason = dataIn?.reason === 'timeout' ? 'timeout' : 'skip';
    const expectedTurnIndex = typeof dataIn?.expectedTurnIndex === 'number' &&
        Number.isInteger(dataIn.expectedTurnIndex) &&
        dataIn.expectedTurnIndex >= 0
        ? dataIn.expectedTurnIndex
        : null;
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.advanceTurn);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.advanceTurn);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [snap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!snap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Room not found.');
        }
        const data = snap.data();
        const players = Array.isArray(data.players) ? data.players : [];
        const isMember = players.some((p) => p.uid === uid);
        if (!isMember) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only room members can advance turns.');
        }
        const gameState = data.gameState || {};
        if (data.status !== 'playing' || gameState.phase !== 'PLAYING') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Turns can only advance during PLAYING.');
        }
        if (gameState.turnsCompleted) {
            return; // Already completed all turns (idempotent: 0 writes)
        }
        const currentIndex = Number(gameState.currentTurnIndex || 0);
        if (expectedTurnIndex !== null && expectedTurnIndex !== currentIndex) {
            return; // Already advanced by another client (idempotent: 0 writes)
        }
        const turnOrder = Array.isArray(gameState.turnOrder) ? gameState.turnOrder : [];
        const activeUid = turnOrder[currentIndex];
        const activePlayer = players.find((p) => p.uid === activeUid && !p.isEliminated);
        const isHost = data.hostId === uid;
        const isSpeaker = Boolean(activePlayer) && activeUid === uid;
        const isTimedOut = typeof gameState.turnEndsAt === 'number' && nowMs >= gameState.turnEndsAt - 1000;
        if (activePlayer) {
            if (!isHost && !isSpeaker && !isTimedOut) {
                throw new errors_1.FunctionActionError('permission-denied', 'Cannot skip another player before timer expires.');
            }
        }
        else if (!isHost && !isTimedOut) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can advance an absent speaker turn before timer expires.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.advanceTurn, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        const language = typeof data.language === 'string' ? data.language : 'ar';
        const labelText = reason === 'timeout'
            ? language === 'ar'
                ? '(انتهى الوقت)'
                : '(Timed out)'
            : language === 'ar'
                ? '(تم التخطي)'
                : '(Skipped)';
        const extraClue = activePlayer
            ? {
                id: `${nowMs}-skip`,
                uid: activePlayer.uid,
                name: activePlayer.name,
                avatar: activePlayer.avatar,
                text: labelText,
                round: Number(gameState.round || 1),
                skipped: true,
            }
            : undefined;
        const nextGameState = buildNextTurnPatch(gameState, players, Number(data.turnDurationSeconds || 45), nowMs, extraClue);
        tx.set(rateLimitRef, nextRateDoc);
        if (extraClue && privateSnap.exists) {
            const prevClues = Array.isArray(privateSnap.data()?.cluesHistory)
                ? privateSnap.data().cluesHistory
                : [];
            tx.update(privateStateRef, {
                cluesHistory: [...prevClues, extraClue],
                updatedAt: deps.serverTimestamp(),
            });
        }
        tx.update(roomRef, {
            gameState: nextGameState,
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeStartVoting(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.startVoting);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.startVoting);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [roomSnap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!roomSnap.exists || !privateSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Active match not found.');
        }
        const data = roomSnap.data();
        const players = Array.isArray(data.players) ? data.players : [];
        if (!players.some((p) => p.uid === uid) || data.hostId !== uid) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can start voting.');
        }
        const gameState = data.gameState || {};
        if (data.status !== 'playing' || gameState.phase !== 'PLAYING') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Voting can only start from active PLAYING phase.');
        }
        if (gameState.turnsCompleted !== true) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Cannot start voting before all active players finish their turns.');
        }
        const privateState = privateSnap.data();
        assertMatchStateSync(gameState, privateState);
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.startVoting, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        tx.update(privateStateRef, {
            votesByUid: {},
            updatedAt: deps.serverTimestamp(),
        });
        tx.update(roomRef, {
            gameState: {
                ...gameState,
                phase: 'VOTING',
                votingStartedAt: nowMs,
                readyPlayers: [],
                votedUids: [],
                turnEndsAt: null,
                tieBroken: false,
                mostVotedId: null,
                mostVotedRevealedRole: null,
                votersForEliminated: [],
            },
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeSubmitVote(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const suspectUid = assertSafeId(dataIn?.suspectUid, 'suspectUid');
    if (suspectUid === uid) {
        throw new errors_1.FunctionActionError('invalid-argument', 'Invalid vote target.');
    }
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.submitVote);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.submitVote);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [roomSnap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!roomSnap.exists || !privateSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Active match not found.');
        }
        const data = roomSnap.data();
        const gameState = data.gameState || {};
        if (data.status !== 'playing' || gameState.phase !== 'VOTING') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Voting is not active.');
        }
        const players = Array.isArray(data.players) ? data.players : [];
        const alivePlayers = players.filter((p) => !p.isEliminated);
        const aliveUids = new Set(alivePlayers.map((p) => p.uid));
        if (!aliveUids.has(uid) || !aliveUids.has(suspectUid)) {
            throw new errors_1.FunctionActionError('permission-denied', 'Both voter and target must be alive room members.');
        }
        const privateState = privateSnap.data();
        assertMatchStateSync(gameState, privateState);
        const existingVotes = privateState.votesByUid || {};
        if (Object.prototype.hasOwnProperty.call(existingVotes, uid)) {
            throw new errors_1.FunctionActionError('failed-precondition', 'You have already voted in this round.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.submitVote, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        const votesByUid = { ...existingVotes, [uid]: suspectUid };
        const votedUids = Array.from(new Set(Object.keys(votesByUid).filter((v) => aliveUids.has(v))));
        tx.set(rateLimitRef, nextRateDoc);
        tx.update(privateStateRef, {
            votesByUid,
            updatedAt: deps.serverTimestamp(),
        });
        if (votedUids.length >= alivePlayers.length) {
            const tally = (0, gameLogic_1.tallyVotesServer)(votesByUid, aliveUids);
            if (tally) {
                const revealedRole = privateState.rolesByUid[tally.mostVotedId] || 'citizen';
                const votersForEliminated = Object.entries(votesByUid)
                    .filter(([, target]) => target === tally.mostVotedId)
                    .map(([voter]) => voter);
                tx.update(roomRef, {
                    gameState: {
                        ...gameState,
                        phase: 'REVEAL_VOTE_RESULT',
                        votingStartedAt: null,
                        votedUids,
                        mostVotedId: tally.mostVotedId,
                        mostVotedRevealedRole: revealedRole,
                        votersForEliminated,
                        tieBroken: tally.tieBroken,
                    },
                    updatedAt: deps.serverTimestamp(),
                });
                return;
            }
        }
        tx.update(roomRef, {
            'gameState.votedUids': votedUids,
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeResolveVotes(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.resolveVotes);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.resolveVotes);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [roomSnap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!roomSnap.exists || !privateSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Active match not found.');
        }
        const data = roomSnap.data();
        const players = Array.isArray(data.players) ? data.players : [];
        if (!players.some((p) => p.uid === uid) || data.hostId !== uid) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can force resolve votes.');
        }
        const gameState = data.gameState || {};
        if (data.status !== 'playing' || gameState.phase !== 'VOTING') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Votes can only be resolved during VOTING phase.');
        }
        const privateState = privateSnap.data();
        assertMatchStateSync(gameState, privateState);
        const aliveUids = new Set(players.filter((p) => !p.isEliminated).map((p) => p.uid));
        const votesByUid = privateState.votesByUid || {};
        const validVoterCount = Object.keys(votesByUid).filter((voterUid) => aliveUids.has(voterUid) && aliveUids.has(votesByUid[voterUid])).length;
        const allVoted = aliveUids.size > 0 && validVoterCount >= aliveUids.size;
        if (!allVoted) {
            const requiredMajority = getRequiredMajorityVotes(aliveUids.size);
            if (validVoterCount < requiredMajority) {
                throw new errors_1.FunctionActionError('failed-precondition', `At least ${requiredMajority} alive votes are required for early vote resolution.`);
            }
            const votingStartedAt = typeof gameState.votingStartedAt === 'number' ? gameState.votingStartedAt : null;
            if (votingStartedAt === null ||
                nowMs - votingStartedAt < exports.FORCE_RESOLVE_MIN_ELAPSED_MS) {
                throw new errors_1.FunctionActionError('failed-precondition', 'Cannot force resolve votes before the minimum voting window has elapsed.');
            }
        }
        const tally = (0, gameLogic_1.tallyVotesServer)(votesByUid, aliveUids);
        if (!tally) {
            throw new errors_1.FunctionActionError('failed-precondition', 'No valid votes cast yet.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.resolveVotes, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        const revealedRole = privateState.rolesByUid[tally.mostVotedId] || 'citizen';
        const votersForEliminated = Object.entries(votesByUid)
            .filter(([, target]) => target === tally.mostVotedId)
            .map(([voter]) => voter);
        tx.set(rateLimitRef, nextRateDoc);
        tx.update(roomRef, {
            gameState: {
                ...gameState,
                phase: 'REVEAL_VOTE_RESULT',
                votingStartedAt: null,
                mostVotedId: tally.mostVotedId,
                mostVotedRevealedRole: revealedRole,
                votersForEliminated,
                tieBroken: tally.tieBroken,
            },
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeProceedAfterVoteReveal(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.proceedAfterVoteReveal);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.proceedAfterVoteReveal);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [roomSnap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!roomSnap.exists || !privateSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Active match not found.');
        }
        const data = roomSnap.data();
        const players = Array.isArray(data.players) ? data.players : [];
        if (!players.some((p) => p.uid === uid) || data.hostId !== uid) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can proceed.');
        }
        const gameState = data.gameState || {};
        if (data.status !== 'playing' ||
            gameState.phase !== 'REVEAL_VOTE_RESULT' ||
            !gameState.mostVotedId) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Can only proceed from REVEAL_VOTE_RESULT phase.');
        }
        const privateState = privateSnap.data();
        assertMatchStateSync(gameState, privateState);
        const targetUid = gameState.mostVotedId;
        const targetPlayer = players.find((p) => p.uid === targetUid && !p.isEliminated);
        if (!targetPlayer) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Voted player is no longer active in this match.');
        }
        const targetRole = privateState.rolesByUid[targetUid] || 'citizen';
        if (targetRole === 'mrwhite') {
            const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.proceedAfterVoteReveal, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
            tx.set(rateLimitRef, nextRateDoc);
            tx.update(roomRef, {
                gameState: {
                    ...gameState,
                    phase: 'IMPOSTOR_GUESS',
                    guesserUid: targetUid,
                },
                updatedAt: deps.serverTimestamp(),
            });
            return;
        }
        const updatedPlayers = players.map((p) => p.uid === targetUid ? { ...p, isEliminated: true, revealedRole: targetRole } : p);
        const profileMap = await (0, matchSettlement_1.readPlayerProfileDocs)(deps.db, tx, updatedPlayers.map((p) => p.uid));
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.proceedAfterVoteReveal, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        const roundNum = Number(gameState.round || privateState.round || 1);
        const roundRecord = {
            round: roundNum,
            votesByUid: { ...(privateState.votesByUid || {}) },
            mostVotedUid: targetUid,
            votersForEliminated: Array.isArray(gameState.votersForEliminated)
                ? gameState.votersForEliminated
                : [],
            tieBroken: Boolean(gameState.tieBroken),
            eliminatedUid: targetUid,
            eliminatedRole: targetRole,
            mrWhiteGuess: null,
        };
        const nextRoundHistory = [...(privateState.roundHistory || []), roundRecord];
        const nextMatchEvents = [
            ...(privateState.matchEvents || []),
            {
                id: `elim-r${roundNum}-${targetUid}`,
                round: roundNum,
                type: 'player_eliminated',
                actorId: targetUid,
                actorName: targetPlayer.name,
                targetId: targetUid,
                targetName: targetPlayer.name,
                outcome: targetRole,
                timestampMs: nowMs,
            },
        ];
        const nextPrivateState = {
            ...privateState,
            roundHistory: nextRoundHistory,
            matchEvents: nextMatchEvents,
        };
        const winCheck = (0, gameLogic_1.evaluateOnlineWin)(updatedPlayers, privateState.rolesByUid);
        if (winCheck.isOver && winCheck.winner && winCheck.winReason) {
            (0, matchSettlement_1.applyMatchSettlementWrites)({
                db: deps.db,
                serverTimestamp: deps.serverTimestamp,
                tx,
                roomRef,
                roomData: data,
                privateStateRef,
                privateState: nextPrivateState,
                players: updatedPlayers,
                profileMap,
                winner: winCheck.winner,
                winReason: winCheck.winReason,
                endedAtMs: nowMs,
            });
            return;
        }
        const nextRound = Number(gameState.round || 1) + 1;
        const turnOrder = (0, gameLogic_1.buildServerTurnOrder)(updatedPlayers, privateState.rolesByUid, nextRound);
        const turnDuration = Number(data.turnDurationSeconds || 45);
        const aliveInfiltratorsCount = updatedPlayers.filter((p) => {
            if (p.isEliminated)
                return false;
            const r = privateState.rolesByUid[p.uid];
            return r === 'mrwhite' || r === 'undercover';
        }).length;
        const aliveMrWhiteCount = updatedPlayers.filter((p) => !p.isEliminated && privateState.rolesByUid[p.uid] === 'mrwhite').length;
        const aliveUndercoverCount = updatedPlayers.filter((p) => !p.isEliminated && privateState.rolesByUid[p.uid] === 'undercover').length;
        const isEasy = (gameState.difficulty || data.difficulty || 'easy') === 'easy';
        tx.update(privateStateRef, {
            round: nextRound,
            votesByUid: {},
            roundHistory: nextRoundHistory,
            matchEvents: nextMatchEvents,
            updatedAt: deps.serverTimestamp(),
        });
        tx.update(roomRef, {
            players: updatedPlayers,
            gameState: {
                ...gameState,
                phase: 'PLAYING',
                round: nextRound,
                aliveInfiltratorsCount,
                mrWhiteCount: isEasy ? aliveMrWhiteCount : null,
                undercoverCount: isEasy ? aliveUndercoverCount : null,
                turnOrder,
                currentTurnIndex: 0,
                turnEndsAt: nowMs + turnDuration * 1000,
                turnsCompleted: false,
                votingStartedAt: null,
                votedUids: [],
                mostVotedId: null,
                mostVotedRevealedRole: null,
                votersForEliminated: [],
                tieBroken: false,
            },
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeSubmitMrWhiteGuess(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const guess = sanitizePlainText(dataIn?.guess, 80);
    const forceEliminateMissing = Boolean(dataIn?.forceEliminateMissing);
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.submitMrWhiteGuess);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.submitMrWhiteGuess);
    const nowMs = getCurrentTime(deps);
    return deps.db.runTransaction(async (tx) => {
        const [roomSnap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!roomSnap.exists || !privateSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Active match not found.');
        }
        const data = roomSnap.data();
        const gameState = data.gameState || {};
        if (data.status !== 'playing' || gameState.phase !== 'IMPOSTOR_GUESS') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Not currently in guess phase.');
        }
        const privateState = privateSnap.data();
        assertMatchStateSync(gameState, privateState);
        const guesserUid = gameState.guesserUid || gameState.mostVotedId || '';
        if (!guesserUid || privateState.rolesByUid[guesserUid] !== 'mrwhite') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Invalid Mr. White guesser state.');
        }
        const players = Array.isArray(data.players) ? data.players : [];
        const guesserStillInRoom = players.some((p) => p.uid === guesserUid);
        if (forceEliminateMissing) {
            if (data.hostId !== uid || !players.some((p) => p.uid === uid) || guesserStillInRoom) {
                throw new errors_1.FunctionActionError('permission-denied', 'Force eliminate is only allowed by host when guesser is absent.');
            }
        }
        else if (uid !== guesserUid || !guesserStillInRoom) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only caught Mr. White can submit the guess.');
        }
        const isCorrect = !forceEliminateMissing && (0, wordData_1.isMrWhiteGuessMatch)(guess, privateState.civilianWord);
        const profileMap = await (0, matchSettlement_1.readPlayerProfileDocs)(deps.db, tx, players.map((p) => p.uid));
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.submitMrWhiteGuess, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        const guesserPlayer = players.find((p) => p.uid === guesserUid);
        const guesserName = guesserPlayer?.name || privateState.rosterByUid?.[guesserUid]?.name || guesserUid;
        const roundNum = Number(gameState.round || privateState.round || 1);
        const roundRecord = {
            round: roundNum,
            votesByUid: { ...(privateState.votesByUid || {}) },
            mostVotedUid: guesserUid,
            votersForEliminated: Array.isArray(gameState.votersForEliminated)
                ? gameState.votersForEliminated
                : [],
            tieBroken: Boolean(gameState.tieBroken),
            eliminatedUid: isCorrect ? null : guesserUid,
            eliminatedRole: isCorrect ? null : 'mrwhite',
            mrWhiteGuess: {
                uid: guesserUid,
                name: guesserName,
                ...(forceEliminateMissing ? {} : { guess }),
                isCorrect,
                forcedMissing: forceEliminateMissing,
            },
        };
        const nextRoundHistory = [...(privateState.roundHistory || []), roundRecord];
        const nextMatchEvents = [
            ...(privateState.matchEvents || []),
            {
                id: `mw-guess-r${roundNum}-${guesserUid}`,
                round: roundNum,
                type: 'mr_white_guess',
                actorId: guesserUid,
                actorName: guesserName,
                outcome: isCorrect ? 'correct' : forceEliminateMissing ? 'forced_missing' : 'incorrect',
                timestampMs: nowMs,
            },
            ...(!isCorrect
                ? [
                    {
                        id: `elim-r${roundNum}-${guesserUid}`,
                        round: roundNum,
                        type: 'player_eliminated',
                        actorId: guesserUid,
                        actorName: guesserName,
                        targetId: guesserUid,
                        targetName: guesserName,
                        outcome: 'mrwhite',
                        timestampMs: nowMs,
                    },
                ]
                : []),
        ];
        const nextPrivateState = {
            ...privateState,
            roundHistory: nextRoundHistory,
            matchEvents: nextMatchEvents,
        };
        if (isCorrect) {
            (0, matchSettlement_1.applyMatchSettlementWrites)({
                db: deps.db,
                serverTimestamp: deps.serverTimestamp,
                tx,
                roomRef,
                roomData: data,
                privateStateRef,
                privateState: nextPrivateState,
                players,
                profileMap,
                winner: 'impostor',
                winReason: 'impostor_guessed',
                winningMrWhiteUid: guesserUid,
                endedAtMs: nowMs,
            });
            return { isCorrect: true };
        }
        const updatedPlayers = players.map((p) => p.uid === guesserUid
            ? { ...p, isEliminated: true, revealedRole: 'mrwhite' }
            : p);
        const winCheck = (0, gameLogic_1.evaluateOnlineWin)(updatedPlayers, privateState.rolesByUid);
        if (winCheck.isOver && winCheck.winner && winCheck.winReason) {
            (0, matchSettlement_1.applyMatchSettlementWrites)({
                db: deps.db,
                serverTimestamp: deps.serverTimestamp,
                tx,
                roomRef,
                roomData: data,
                privateStateRef,
                privateState: nextPrivateState,
                players: updatedPlayers,
                profileMap,
                winner: winCheck.winner,
                winReason: winCheck.winReason,
                endedAtMs: nowMs,
            });
            return { isCorrect: false };
        }
        const nextRound = Number(gameState.round || 1) + 1;
        const turnOrder = (0, gameLogic_1.buildServerTurnOrder)(updatedPlayers, privateState.rolesByUid, nextRound);
        const turnDuration = Number(data.turnDurationSeconds || 45);
        const aliveInfiltratorsCount = updatedPlayers.filter((p) => {
            if (p.isEliminated)
                return false;
            const r = privateState.rolesByUid[p.uid];
            return r === 'mrwhite' || r === 'undercover';
        }).length;
        const aliveMrWhiteCount = updatedPlayers.filter((p) => !p.isEliminated && privateState.rolesByUid[p.uid] === 'mrwhite').length;
        const aliveUndercoverCount = updatedPlayers.filter((p) => !p.isEliminated && privateState.rolesByUid[p.uid] === 'undercover').length;
        const isEasy = (gameState.difficulty || data.difficulty || 'easy') === 'easy';
        tx.update(privateStateRef, {
            round: nextRound,
            votesByUid: {},
            roundHistory: nextRoundHistory,
            matchEvents: nextMatchEvents,
            updatedAt: deps.serverTimestamp(),
        });
        tx.update(roomRef, {
            players: updatedPlayers,
            gameState: {
                ...gameState,
                phase: 'PLAYING',
                round: nextRound,
                aliveInfiltratorsCount,
                mrWhiteCount: isEasy ? aliveMrWhiteCount : null,
                undercoverCount: isEasy ? aliveUndercoverCount : null,
                turnOrder,
                currentTurnIndex: 0,
                turnEndsAt: nowMs + turnDuration * 1000,
                turnsCompleted: false,
                votingStartedAt: null,
                votedUids: [],
                mostVotedId: null,
                mostVotedRevealedRole: null,
                votersForEliminated: [],
                guesserUid: null,
                tieBroken: false,
            },
            updatedAt: deps.serverTimestamp(),
        });
        return { isCorrect: false };
    });
}
async function executeReturnToLobby(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.returnToLobby);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.returnToLobby);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [snap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!snap.exists)
            throw new errors_1.FunctionActionError('not-found', 'Room not found.');
        const data = snap.data();
        const currentPlayers = Array.isArray(data.players) ? data.players : [];
        if (data.hostId !== uid || !currentPlayers.some((p) => p.uid === uid)) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can return to lobby.');
        }
        const phase = data.gameState?.phase;
        const allowedStatus = data.status === 'playing' || data.status === 'finished';
        const allowedPhase = phase === 'RESULT' || phase === 'SETUP_PENDING' || phase === 'CATEGORY_SELECT';
        if (!allowedStatus || !allowedPhase) {
            throw new errors_1.FunctionActionError('failed-precondition', 'Can only return to lobby after match completion or before round starts.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.returnToLobby, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        for (const p of currentPlayers) {
            tx.delete(roomRef.collection('privatePlayers').doc(p.uid));
        }
        if (privateSnap.exists) {
            const prevSettled = Array.isArray(privateSnap.data()?.settledMatches)
                ? privateSnap.data().settledMatches
                : [];
            tx.set(privateStateRef, {
                matchId: '',
                round: 0,
                startedAtMs: 0,
                civilianWord: '',
                undercoverWord: '',
                decoys: [],
                impostorIds: [],
                undercoverIds: [],
                rolesByUid: {},
                rosterByUid: {},
                votesByUid: {},
                cluesHistory: [],
                roundHistory: [],
                matchEvents: [],
                settledMatches: prevSettled,
                updatedAt: deps.serverTimestamp(),
            });
        }
        const resetPlayers = currentPlayers.map((p) => ({
            uid: p.uid,
            name: p.name,
            avatar: p.avatar,
            isReady: false,
            isEliminated: false,
            score: p.score || 0,
            revealedRole: null,
        }));
        tx.update(roomRef, {
            status: 'waiting',
            players: resetPlayers,
            gameState: null,
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
async function executeNextMatch(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const roomId = assertSafeId(dataIn?.roomId, 'roomId');
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, uid, rateLimit_1.RATE_LIMITS.nextMatch);
    const roomRef = deps.db.collection('rooms').doc(roomId);
    const privateStateRef = roomRef.collection('privateState').doc('current');
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, uid, rateLimit_1.RATE_LIMITS.nextMatch);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [snap, privateSnap, rateSnap] = await Promise.all([
            tx.get(roomRef),
            tx.get(privateStateRef),
            tx.get(rateLimitRef),
        ]);
        if (!snap.exists)
            throw new errors_1.FunctionActionError('not-found', 'Room not found.');
        const data = snap.data();
        const currentPlayers = Array.isArray(data.players) ? data.players : [];
        if (data.hostId !== uid || !currentPlayers.some((p) => p.uid === uid)) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only host can prepare next match.');
        }
        const allowedStatus = data.status === 'playing' || data.status === 'finished';
        if (!allowedStatus || data.gameState?.phase !== 'RESULT') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Next match can only start after the current match is finished.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, uid, rateLimit_1.RATE_LIMITS.nextMatch, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        for (const p of currentPlayers) {
            tx.delete(roomRef.collection('privatePlayers').doc(p.uid));
        }
        if (privateSnap.exists) {
            const prevSettled = Array.isArray(privateSnap.data()?.settledMatches)
                ? privateSnap.data().settledMatches
                : [];
            tx.set(privateStateRef, {
                matchId: '',
                round: 0,
                startedAtMs: 0,
                civilianWord: '',
                undercoverWord: '',
                decoys: [],
                impostorIds: [],
                undercoverIds: [],
                rolesByUid: {},
                rosterByUid: {},
                votesByUid: {},
                cluesHistory: [],
                roundHistory: [],
                matchEvents: [],
                settledMatches: prevSettled,
                updatedAt: deps.serverTimestamp(),
            });
        }
        const resetPlayers = currentPlayers.map((p) => ({
            ...p,
            isEliminated: false,
            revealedRole: null,
        }));
        tx.update(roomRef, {
            status: 'playing',
            players: resetPlayers,
            gameState: {
                phase: 'SETUP_PENDING',
            },
            updatedAt: deps.serverTimestamp(),
        });
    });
    return { success: true };
}
//# sourceMappingURL=gameHandlers.js.map