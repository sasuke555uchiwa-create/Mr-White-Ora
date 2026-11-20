import { DbLike, DocRefLike, FunctionActionError } from './errors';

export interface RateLimitRule {
  action: string;
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitDeps {
  db: DbLike;
  now?: () => number;
  toTimestamp?: (ms: number) => any;
}

export const RATE_LIMITS = {
  createRoom: { action: 'createRoom', maxRequests: 5, windowMs: 5 * 60_000 },
  joinRoom: { action: 'joinRoom', maxRequests: 20, windowMs: 60_000 },
  quickJoinRoom: { action: 'quickJoinRoom', maxRequests: 15, windowMs: 60_000 },
  updateRoomSettings: { action: 'updateRoomSettings', maxRequests: 25, windowMs: 60_000 },
  kickPlayer: { action: 'kickPlayer', maxRequests: 20, windowMs: 60_000 },
  promoteHost: { action: 'promoteHost', maxRequests: 15, windowMs: 2 * 60_000 },
  toggleReady: { action: 'toggleReady', maxRequests: 30, windowMs: 60_000 },
  sendRoomChat: { action: 'sendRoomChat', maxRequests: 20, windowMs: 30_000 },
  beginMatch: { action: 'beginMatch', maxRequests: 15, windowMs: 2 * 60_000 },
  startRound: { action: 'startRound', maxRequests: 15, windowMs: 2 * 60_000 },
  markRevealReady: { action: 'markRevealReady', maxRequests: 20, windowMs: 60_000 },
  submitClue: { action: 'submitClue', maxRequests: 15, windowMs: 60_000 },
  advanceTurn: { action: 'advanceTurn', maxRequests: 30, windowMs: 60_000 },
  startVoting: { action: 'startVoting', maxRequests: 15, windowMs: 2 * 60_000 },
  submitVote: { action: 'submitVote', maxRequests: 15, windowMs: 60_000 },
  resolveVotes: { action: 'resolveVotes', maxRequests: 15, windowMs: 2 * 60_000 },
  proceedAfterVoteReveal: { action: 'proceedAfterVoteReveal', maxRequests: 20, windowMs: 2 * 60_000 },
  submitMrWhiteGuess: { action: 'submitMrWhiteGuess', maxRequests: 10, windowMs: 60_000 },
  returnToLobby: { action: 'returnToLobby', maxRequests: 15, windowMs: 2 * 60_000 },
  nextMatch: { action: 'nextMatch', maxRequests: 15, windowMs: 2 * 60_000 },
  sendFriendRequest: { action: 'sendFriendRequest', maxRequests: 15, windowMs: 5 * 60_000 },
  respondFriendRequest: { action: 'respondFriendRequest', maxRequests: 30, windowMs: 5 * 60_000 },
  checkAdminStatus: { action: 'checkAdminStatus', maxRequests: 20, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

interface BlockedWindowEntry {
  windowStart: number;
  expiresAtMs: number;
}

/**
 * Per-DbLike cache of recently exhausted rate-limit windows so tight abusive loops
 * hitting the same warm instance fail immediately with zero Firestore transactions.
 */
const blockedWindowCache = new WeakMap<DbLike, Map<string, BlockedWindowEntry>>();

function getBlockedCache(db: DbLike): Map<string, BlockedWindowEntry> {
  let map = blockedWindowCache.get(db);
  if (!map) {
    map = new Map<string, BlockedWindowEntry>();
    blockedWindowCache.set(db, map);
  }
  return map;
}

function normalizeParts(uid: string, rule: RateLimitRule) {
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
  const safeAction = rule.action.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const bucketId = `${safeAction}_${safeUid}`;
  return { safeUid, safeAction, bucketId };
}

export function buildExpiryTimestamp(deps: RateLimitDeps, expiresAtMs: number): any {
  return deps.toTimestamp ? deps.toTimestamp(expiresAtMs) : new Date(expiresAtMs);
}

export function readExpiryMs(expiresAt: unknown): number {
  if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
    return expiresAt;
  }
  if (expiresAt instanceof Date) {
    return expiresAt.getTime();
  }
  if (expiresAt && typeof (expiresAt as any).toMillis === 'function') {
    return (expiresAt as any).toMillis();
  }
  if (expiresAt && typeof (expiresAt as any).seconds === 'number') {
    return (
      (expiresAt as any).seconds * 1000 +
      Math.floor(Number((expiresAt as any).nanoseconds || 0) / 1e6)
    );
  }
  if (expiresAt && typeof (expiresAt as any)._seconds === 'number') {
    return (
      (expiresAt as any)._seconds * 1000 +
      Math.floor(Number((expiresAt as any)._nanoseconds || 0) / 1e6)
    );
  }
  return 0;
}

export function getRateLimitDocRef(db: DbLike, uid: string, rule: RateLimitRule): DocRefLike {
  const { bucketId } = normalizeParts(uid, rule);
  return db.collection('rateLimits').doc(bucketId);
}

export function assertNotRateLimitBlocked(
  deps: RateLimitDeps,
  uid: string,
  rule: RateLimitRule
): void {
  const { safeAction, bucketId } = normalizeParts(uid, rule);
  const currentMs = deps.now ? deps.now() : Date.now();
  const cache = getBlockedCache(deps.db);
  const entry = cache.get(bucketId);
  if (!entry) return;

  if (currentMs >= entry.windowStart && currentMs < entry.expiresAtMs) {
    throw new FunctionActionError(
      'resource-exhausted',
      `Rate limit exceeded for ${safeAction}. Please wait a moment before trying again.`
    );
  }

  cache.delete(bucketId);
}

export function evaluateRateLimitInTx(
  deps: RateLimitDeps,
  uid: string,
  rule: RateLimitRule,
  snapExists: boolean,
  snapData: Record<string, any> | undefined,
  currentMs: number
): Record<string, any> {
  const { safeUid, safeAction, bucketId } = normalizeParts(uid, rule);
  const cache = getBlockedCache(deps.db);

  const windowStart = typeof snapData?.windowStart === 'number' ? snapData.windowStart : 0;
  const count = typeof snapData?.count === 'number' ? snapData.count : 0;

  if (!snapExists || currentMs < windowStart || currentMs - windowStart >= rule.windowMs) {
    cache.delete(bucketId);
    const expiresAtMs = currentMs + rule.windowMs;
    return {
      uid: safeUid,
      action: safeAction,
      windowStart: currentMs,
      count: 1,
      expiresAt: buildExpiryTimestamp(deps, expiresAtMs),
    };
  }

  const expiresAtMs = windowStart + rule.windowMs;
  if (count >= rule.maxRequests) {
    cache.set(bucketId, { windowStart, expiresAtMs });
    throw new FunctionActionError(
      'resource-exhausted',
      `Rate limit exceeded for ${safeAction}. Please wait a moment before trying again.`
    );
  }

  return {
    uid: safeUid,
    action: safeAction,
    windowStart,
    count: count + 1,
    expiresAt: buildExpiryTimestamp(deps, expiresAtMs),
  };
}

/**
 * Standalone transactional rate-limit enforcement for endpoints that must throttle
 * even when subsequent target lookups fail (e.g., private code guessing in joinRoom).
 */
export async function enforceRateLimit(
  deps: RateLimitDeps,
  uid: string,
  rule: RateLimitRule
): Promise<void> {
  assertNotRateLimitBlocked(deps, uid, rule);

  const bucketRef = getRateLimitDocRef(deps.db, uid, rule);
  const currentMs = deps.now ? deps.now() : Date.now();

  await deps.db.runTransaction(async (tx) => {
    const snap = await tx.get(bucketRef);
    const nextDoc = evaluateRateLimitInTx(
      deps,
      uid,
      rule,
      snap.exists,
      snap.exists ? snap.data() : undefined,
      currentMs
    );
    tx.set(bucketRef, nextDoc);
  });
}

export const RATE_LIMIT_CLEANUP_GRACE_MS = 60_000;

export interface RateLimitCleanupDeps {
  db: DbLike;
  now?: () => number;
  toTimestamp?: (ms: number) => any;
  batchSize?: number;
  maxBatches?: number;
}

async function deleteExpiredBatch(
  deps: RateLimitCleanupDeps,
  cutoffTarget: any,
  cutoffMs: number,
  batchSize: number
): Promise<number> {
  const snap = await deps.db
    .collection('rateLimits')
    .where('expiresAt', '<=', cutoffTarget)
    .limit(batchSize)
    .get();

  const expiredDocs = snap.docs.filter((docSnap) => {
    const expMs = readExpiryMs(docSnap.data()?.expiresAt);
    return expMs > 0 && expMs <= cutoffMs;
  });

  if (expiredDocs.length === 0) {
    return 0;
  }

  const batch = deps.db.batch();
  for (const docSnap of expiredDocs) {
    batch.delete(docSnap.ref);
  }
  await batch.commit();
  return expiredDocs.length;
}

/**
 * Deletes expired rate-limit records older than (now - RATE_LIMIT_CLEANUP_GRACE_MS),
 * supporting both Firestore Timestamp expiresAt and legacy numeric epoch ms records
 * without ever deleting active or recently expired windows.
 */
export async function executeCleanupExpiredRateLimits(
  deps: RateLimitCleanupDeps
): Promise<{ deletedCount: number }> {
  const nowMs = deps.now ? deps.now() : Date.now();
  const cutoffMs = nowMs - RATE_LIMIT_CLEANUP_GRACE_MS;
  const cutoffTimestamp = deps.toTimestamp ? deps.toTimestamp(cutoffMs) : new Date(cutoffMs);
  const batchSize = Math.max(1, Math.min(400, deps.batchSize ?? 400));
  const maxBatches = Math.max(1, deps.maxBatches ?? 10);

  let deletedCount = 0;

  for (const target of [cutoffTimestamp, cutoffMs]) {
    for (let i = 0; i < maxBatches; i++) {
      const deleted = await deleteExpiredBatch(deps, target, cutoffMs, batchSize);
      deletedCount += deleted;
      if (deleted < batchSize) break;
    }
  }

  return { deletedCount };
}
