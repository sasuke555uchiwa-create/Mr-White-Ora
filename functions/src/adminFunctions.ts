import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { executeCheckAdminStatus } from './adminPolicy';
import { getCallableOptions } from './callableConfig';
import { DbLike, FunctionActionError } from './errors';
import { adminAuth, db } from './firebaseAdmin';
import { RATE_LIMITS, enforceRateLimit } from './rateLimit';

/**
 * Verifies admin privilege strictly from server state (admins/{uid}.active === true)
 * and grants or revokes Firebase Auth custom claims accordingly.
 */
export const checkAdminStatus = onCall(getCallableOptions(), async (request) => {
  try {
    const uid = request.auth?.uid;
    if (uid) {
      await enforceRateLimit(
        {
          db: db as unknown as DbLike,
          toTimestamp: (ms: number) => Timestamp.fromMillis(ms),
        },
        uid,
        RATE_LIMITS.checkAdminStatus
      );
    }
    const result = await executeCheckAdminStatus(
      { db: db as unknown as DbLike, adminAuth },
      {
        uid,
        token: request.auth?.token as Record<string, any> | undefined,
      }
    );
    return {
      isAdmin: result.isAdmin,
      shouldRefreshToken: result.shouldRefreshToken,
    };
  } catch (err) {
    if (err instanceof FunctionActionError) {
      throw new HttpsError(err.code, err.message);
    }
    throw err;
  }
});
