import { Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { DbLike } from './errors';
import { db } from './firebaseAdmin';
import {
  RATE_LIMIT_CLEANUP_GRACE_MS,
  RateLimitCleanupDeps,
  executeCleanupExpiredRateLimits,
} from './rateLimit';

export { RATE_LIMIT_CLEANUP_GRACE_MS, executeCleanupExpiredRateLimits };
export type { RateLimitCleanupDeps };

/**
 * Scheduled hourly fallback cleaner alongside Firestore native TTL on `rateLimits.expiresAt`.
 */
export const cleanupExpiredRateLimits = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    retryCount: 1,
  },
  async () => {
    await executeCleanupExpiredRateLimits({
      db: db as unknown as DbLike,
      toTimestamp: (ms) => Timestamp.fromMillis(ms),
    });
  }
);
