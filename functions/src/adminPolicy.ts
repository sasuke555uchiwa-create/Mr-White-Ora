import { DbLike, FunctionActionError } from './errors';

export const DESIGNATED_OWNER_EMAIL = 'sasuke555uchiwa@gmail.com';

export interface AdminAuthDeps {
  db: DbLike;
  adminAuth: {
    getUser(uid: string): Promise<{ customClaims?: Record<string, any> }>;
    setCustomUserClaims(uid: string, claims: Record<string, any> | null): Promise<void>;
  };
}

export interface AdminCheckRequest {
  uid?: string | null;
  token?: Record<string, any> | null;
}

export interface AdminCheckResult {
  isAdmin: boolean;
  shouldRefreshToken: boolean;
  claimUpdated: boolean;
}

/**
 * Authoritative admin resolution & claim lifecycle handler:
 * - Uses admins/{uid}.active === true as the primary server authorization state.
 * - Preserves designated owner email access only when email is verified AND admins/{uid}
 *   is not explicitly deactivated (active !== true while existing).
 * - Automatically revokes stale admin custom claims whenever authorization is absent/revoked.
 */
export async function executeCheckAdminStatus(
  deps: AdminAuthDeps,
  request: AdminCheckRequest
): Promise<AdminCheckResult> {
  const uid = typeof request.uid === 'string' ? request.uid.trim() : '';
  if (!uid) {
    throw new FunctionActionError('unauthenticated', 'Authentication required.');
  }

  const token = request.token || {};
  const hasClaim = token.admin === true;

  const adminDoc = await deps.db.collection('admins').doc(uid).get();
  const adminData = adminDoc.exists ? adminDoc.data() : undefined;

  const hasActiveAdminDoc = Boolean(adminDoc.exists && adminData?.active === true);
  const isExplicitlyInactive = Boolean(adminDoc.exists && adminData?.active !== true);

  const isDesignatedOwner =
    token.email_verified === true &&
    typeof token.email === 'string' &&
    token.email.toLowerCase() === DESIGNATED_OWNER_EMAIL &&
    !isExplicitlyInactive;

  const isAdmin = hasActiveAdminDoc || isDesignatedOwner;

  let claimUpdated = false;
  if (isAdmin && !hasClaim) {
    const userRecord = await deps.adminAuth.getUser(uid);
    const existingClaims = { ...(userRecord.customClaims || {}) };
    await deps.adminAuth.setCustomUserClaims(uid, { ...existingClaims, admin: true });
    claimUpdated = true;
  } else if (!isAdmin && hasClaim) {
    const userRecord = await deps.adminAuth.getUser(uid);
    const existingClaims = { ...(userRecord.customClaims || {}) };
    delete existingClaims.admin;
    await deps.adminAuth.setCustomUserClaims(uid, existingClaims);
    claimUpdated = true;
  }

  return {
    isAdmin,
    shouldRefreshToken: isAdmin !== hasClaim,
    claimUpdated,
  };
}
