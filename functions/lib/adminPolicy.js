"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESIGNATED_OWNER_EMAIL = void 0;
exports.executeCheckAdminStatus = executeCheckAdminStatus;
const errors_1 = require("./errors");
exports.DESIGNATED_OWNER_EMAIL = 'sasuke555uchiwa@gmail.com';
/**
 * Authoritative admin resolution & claim lifecycle handler:
 * - Uses admins/{uid}.active === true as the primary server authorization state.
 * - Preserves designated owner email access only when email is verified AND admins/{uid}
 *   is not explicitly deactivated (active !== true while existing).
 * - Automatically revokes stale admin custom claims whenever authorization is absent/revoked.
 */
async function executeCheckAdminStatus(deps, request) {
    const uid = typeof request.uid === 'string' ? request.uid.trim() : '';
    if (!uid) {
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    }
    const token = request.token || {};
    const hasClaim = token.admin === true;
    const adminDoc = await deps.db.collection('admins').doc(uid).get();
    const adminData = adminDoc.exists ? adminDoc.data() : undefined;
    const hasActiveAdminDoc = Boolean(adminDoc.exists && adminData?.active === true);
    const isExplicitlyInactive = Boolean(adminDoc.exists && adminData?.active !== true);
    const isDesignatedOwner = token.email_verified === true &&
        typeof token.email === 'string' &&
        token.email.toLowerCase() === exports.DESIGNATED_OWNER_EMAIL &&
        !isExplicitlyInactive;
    const isAdmin = hasActiveAdminDoc || isDesignatedOwner;
    let claimUpdated = false;
    if (isAdmin && !hasClaim) {
        const userRecord = await deps.adminAuth.getUser(uid);
        const existingClaims = { ...(userRecord.customClaims || {}) };
        await deps.adminAuth.setCustomUserClaims(uid, { ...existingClaims, admin: true });
        claimUpdated = true;
    }
    else if (!isAdmin && hasClaim) {
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
//# sourceMappingURL=adminPolicy.js.map