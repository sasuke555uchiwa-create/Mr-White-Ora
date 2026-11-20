"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRoomChat = exports.toggleReady = exports.promoteHost = exports.kickPlayer = exports.updateRoomSettings = exports.leaveRoom = exports.quickJoinRoom = exports.joinRoom = exports.createRoom = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const callableConfig_1 = require("./callableConfig");
const errors_1 = require("./errors");
const firebaseAdmin_1 = require("./firebaseAdmin");
const roomHandlers_1 = require("./roomHandlers");
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
exports.createRoom = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeCreateRoom)(deps, request.auth?.uid, request.auth?.token, request.data || {})));
exports.joinRoom = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeJoinRoom)(deps, request.auth?.uid, request.auth?.token, request.data || {})));
exports.quickJoinRoom = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeQuickJoinRoom)(deps, request.auth?.uid, request.auth?.token)));
exports.leaveRoom = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeLeaveRoom)(deps, request.auth?.uid, request.data || {})));
exports.updateRoomSettings = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeUpdateRoomSettings)(deps, request.auth?.uid, request.data || {})));
exports.kickPlayer = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeKickPlayer)(deps, request.auth?.uid, request.data || {})));
exports.promoteHost = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executePromoteHost)(deps, request.auth?.uid, request.data || {})));
exports.toggleReady = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeToggleReady)(deps, request.auth?.uid, request.data || {})));
exports.sendRoomChat = (0, https_1.onCall)(callableOpts, (request) => handleCallable(() => (0, roomHandlers_1.executeSendRoomChat)(deps, request.auth?.uid, request.data || {})));
//# sourceMappingURL=roomFunctions.js.map