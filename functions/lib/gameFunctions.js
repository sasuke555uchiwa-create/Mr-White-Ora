"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextMatch = exports.returnToLobby = exports.submitMrWhiteGuess = exports.proceedAfterVoteReveal = exports.resolveVotes = exports.submitVote = exports.startVoting = exports.advanceTurn = exports.submitClue = exports.markRevealReady = exports.startRound = exports.beginMatch = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const callableConfig_1 = require("./callableConfig");
const errors_1 = require("./errors");
const firebaseAdmin_1 = require("./firebaseAdmin");
const gameHandlers_1 = require("./gameHandlers");
const deps = {
    db: firebaseAdmin_1.db,
    serverTimestamp: () => firestore_1.FieldValue.serverTimestamp(),
    toTimestamp: (ms) => firestore_1.Timestamp.fromMillis(ms),
};
function handleCallable(fn) {
    return fn().catch((err) => {
        if (err instanceof errors_1.FunctionActionError) {
            throw new https_1.HttpsError(err.code, err.message);
        }
        throw err;
    });
}
const callableOpts = (0, callableConfig_1.getCallableOptions)();
exports.beginMatch = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeBeginMatch)(deps, request.auth?.uid, request.data || {})));
exports.startRound = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeStartRound)(deps, request.auth?.uid, request.data || {})));
exports.markRevealReady = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeMarkRevealReady)(deps, request.auth?.uid, request.data || {})));
exports.submitClue = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeSubmitClue)(deps, request.auth?.uid, request.data || {})));
exports.advanceTurn = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeAdvanceTurn)(deps, request.auth?.uid, request.data || {})));
exports.startVoting = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeStartVoting)(deps, request.auth?.uid, request.data || {})));
exports.submitVote = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeSubmitVote)(deps, request.auth?.uid, request.data || {})));
exports.resolveVotes = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeResolveVotes)(deps, request.auth?.uid, request.data || {})));
exports.proceedAfterVoteReveal = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeProceedAfterVoteReveal)(deps, request.auth?.uid, request.data || {})));
exports.submitMrWhiteGuess = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeSubmitMrWhiteGuess)(deps, request.auth?.uid, request.data || {})));
exports.returnToLobby = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeReturnToLobby)(deps, request.auth?.uid, request.data || {})));
exports.nextMatch = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, gameHandlers_1.executeNextMatch)(deps, request.auth?.uid, request.data || {})));
//# sourceMappingURL=gameFunctions.js.map