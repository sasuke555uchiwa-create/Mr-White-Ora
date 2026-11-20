"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFriend = exports.rejectFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const callableConfig_1 = require("./callableConfig");
const errors_1 = require("./errors");
const firebaseAdmin_1 = require("./firebaseAdmin");
const socialHandlers_1 = require("./socialHandlers");
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
exports.sendFriendRequest = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, socialHandlers_1.executeSendFriendRequest)(deps, request.auth?.uid, request.data || {})));
exports.acceptFriendRequest = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, socialHandlers_1.executeAcceptFriendRequest)(deps, request.auth?.uid, request.data || {})));
exports.rejectFriendRequest = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, socialHandlers_1.executeRejectFriendRequest)(deps, request.auth?.uid, request.data || {})));
exports.removeFriend = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, socialHandlers_1.executeRemoveFriend)(deps, request.auth?.uid, request.data || {})));
//# sourceMappingURL=socialFunctions.js.map