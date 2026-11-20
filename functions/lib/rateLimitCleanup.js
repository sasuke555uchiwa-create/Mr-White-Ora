"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredRateLimits = exports.executeCleanupExpiredRateLimits = exports.RATE_LIMIT_CLEANUP_GRACE_MS = void 0;
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebaseAdmin_1 = require("./firebaseAdmin");
const rateLimit_1 = require("./rateLimit");
Object.defineProperty(exports, "RATE_LIMIT_CLEANUP_GRACE_MS", { enumerable: true, get: function () { return rateLimit_1.RATE_LIMIT_CLEANUP_GRACE_MS; } });
Object.defineProperty(exports, "executeCleanupExpiredRateLimits", { enumerable: true, get: function () { return rateLimit_1.executeCleanupExpiredRateLimits; } });
/**
 * Scheduled hourly fallback cleaner alongside Firestore native TTL on `rateLimits.expiresAt`.
 */
exports.cleanupExpiredRateLimits = (0, scheduler_1.onSchedule)({
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    retryCount: 1,
}, async () => {
    await (0, rateLimit_1.executeCleanupExpiredRateLimits)({
        db: firebaseAdmin_1.db,
        toTimestamp: (ms) => firestore_1.Timestamp.fromMillis(ms),
    });
});
//# sourceMappingURL=rateLimitCleanup.js.map