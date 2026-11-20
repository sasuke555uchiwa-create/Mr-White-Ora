"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAdminStatus = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const adminPolicy_1 = require("./adminPolicy");
const callableConfig_1 = require("./callableConfig");
const errors_1 = require("./errors");
const firebaseAdmin_1 = require("./firebaseAdmin");
const rateLimit_1 = require("./rateLimit");
/**
 * Verifies admin privilege strictly from server state (admins/{uid}.active === true)
 * and grants or revokes Firebase Auth custom claims accordingly.
 */
exports.checkAdminStatus = (0, https_1.onCall)((0, callableConfig_1.getCallableOptions)(), async (request) => {
    try {
        const uid = request.auth?.uid;
        if (uid) {
            await (0, rateLimit_1.enforceRateLimit)({
                db: firebaseAdmin_1.db,
                toTimestamp: (ms) => firestore_1.Timestamp.fromMillis(ms),
            }, uid, rateLimit_1.RATE_LIMITS.checkAdminStatus);
        }
        const result = await (0, adminPolicy_1.executeCheckAdminStatus)({ db: firebaseAdmin_1.db, adminAuth: firebaseAdmin_1.adminAuth }, {
            uid,
            token: request.auth?.token,
        });
        return {
            isAdmin: result.isAdmin,
            shouldRefreshToken: result.shouldRefreshToken,
        };
    }
    catch (err) {
        if (err instanceof errors_1.FunctionActionError) {
            throw new https_1.HttpsError(err.code, err.message);
        }
        throw err;
    }
});
//# sourceMappingURL=adminFunctions.js.map