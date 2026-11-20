"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFriendshipDocId = getFriendshipDocId;
exports.executeSendFriendRequest = executeSendFriendRequest;
exports.executeAcceptFriendRequest = executeAcceptFriendRequest;
exports.executeRejectFriendRequest = executeRejectFriendRequest;
exports.executeRemoveFriend = executeRemoveFriend;
const errors_1 = require("./errors");
const rateLimit_1 = require("./rateLimit");
function getCurrentTime(deps) {
    return deps.now ? deps.now() : Date.now();
}
function getRateDeps(deps) {
    return { db: deps.db, now: deps.now, toTimestamp: deps.toTimestamp };
}
function assertSafeUid(uid, label = 'user ID') {
    if (typeof uid !== 'string' || !/^[a-zA-Z0-9_-]{3,128}$/.test(uid.trim())) {
        throw new errors_1.FunctionActionError('invalid-argument', `Invalid ${label}.`);
    }
    return uid.trim();
}
function assertSafeCompositeId(id, label = 'request ID') {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{3,257}$/.test(id.trim())) {
        throw new errors_1.FunctionActionError('invalid-argument', `Invalid ${label}.`);
    }
    return id.trim();
}
function getFriendshipDocId(uidA, uidB) {
    return uidA < uidB
        ? { id: `${uidA}_${uidB}`, user1: uidA, user2: uidB }
        : { id: `${uidB}_${uidA}`, user1: uidB, user2: uidA };
}
async function executeSendFriendRequest(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const fromId = assertSafeUid(uid, 'caller user ID');
    const toId = assertSafeUid(dataIn?.toId, 'target user ID');
    if (fromId === toId) {
        throw new errors_1.FunctionActionError('invalid-argument', 'Cannot send friend request to yourself.');
    }
    await (0, rateLimit_1.enforceRateLimit)(getRateDeps(deps), fromId, rateLimit_1.RATE_LIMITS.sendFriendRequest);
    const friendshipMeta = getFriendshipDocId(fromId, toId);
    const forwardReqId = `${fromId}_${toId}`;
    const reverseReqId = `${toId}_${fromId}`;
    return deps.db.runTransaction(async (tx) => {
        const targetPublicRef = deps.db.collection('publicProfiles').doc(toId);
        const targetUserRef = deps.db.collection('users').doc(toId);
        const friendshipRef = deps.db.collection('friendships').doc(friendshipMeta.id);
        const forwardReqRef = deps.db.collection('friendRequests').doc(forwardReqId);
        const reverseReqRef = deps.db.collection('friendRequests').doc(reverseReqId);
        const [targetPubSnap, targetUserSnap, friendshipSnap, forwardSnap, reverseSnap] = await Promise.all([
            tx.get(targetPublicRef),
            tx.get(targetUserRef),
            tx.get(friendshipRef),
            tx.get(forwardReqRef),
            tx.get(reverseReqRef),
        ]);
        if (!targetPubSnap.exists && !targetUserSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Target user does not exist.');
        }
        if (friendshipSnap.exists) {
            return { success: false, message: 'alreadyFriends' };
        }
        if ((forwardSnap.exists && forwardSnap.data()?.status === 'pending') ||
            (reverseSnap.exists && reverseSnap.data()?.status === 'pending')) {
            return { success: false, message: 'friendRequestExists' };
        }
        tx.set(forwardReqRef, {
            fromId,
            toId,
            status: 'pending',
            createdAt: deps.serverTimestamp(),
            updatedAt: deps.serverTimestamp(),
        });
        return { success: true, message: 'friendRequestSent', requestId: forwardReqId };
    });
}
async function executeAcceptFriendRequest(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const responderUid = assertSafeUid(uid, 'caller user ID');
    const requestId = assertSafeCompositeId(dataIn?.requestId);
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, responderUid, rateLimit_1.RATE_LIMITS.respondFriendRequest);
    const reqRef = deps.db.collection('friendRequests').doc(requestId);
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, responderUid, rateLimit_1.RATE_LIMITS.respondFriendRequest);
    const nowMs = getCurrentTime(deps);
    return deps.db.runTransaction(async (tx) => {
        const [reqSnap, rateSnap] = await Promise.all([tx.get(reqRef), tx.get(rateLimitRef)]);
        if (!reqSnap.exists) {
            throw new errors_1.FunctionActionError('not-found', 'Friend request not found.');
        }
        const reqData = reqSnap.data();
        if (reqData.toId !== responderUid) {
            throw new errors_1.FunctionActionError('permission-denied', 'Only the recipient can accept this request.');
        }
        if (reqData.status !== 'pending') {
            throw new errors_1.FunctionActionError('failed-precondition', 'Friend request is no longer pending.');
        }
        const friendshipMeta = getFriendshipDocId(reqData.fromId, reqData.toId);
        const friendshipRef = deps.db.collection('friendships').doc(friendshipMeta.id);
        const existingFriendship = await tx.get(friendshipRef);
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, responderUid, rateLimit_1.RATE_LIMITS.respondFriendRequest, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        tx.update(reqRef, {
            status: 'accepted',
            updatedAt: deps.serverTimestamp(),
        });
        if (!existingFriendship.exists) {
            tx.set(friendshipRef, {
                user1: friendshipMeta.user1,
                user2: friendshipMeta.user2,
                createdAt: deps.serverTimestamp(),
            });
        }
        return { success: true, friendshipId: friendshipMeta.id };
    });
}
async function executeRejectFriendRequest(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const callerUid = assertSafeUid(uid, 'caller user ID');
    const requestId = assertSafeCompositeId(dataIn?.requestId);
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, callerUid, rateLimit_1.RATE_LIMITS.respondFriendRequest);
    const reqRef = deps.db.collection('friendRequests').doc(requestId);
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, callerUid, rateLimit_1.RATE_LIMITS.respondFriendRequest);
    const nowMs = getCurrentTime(deps);
    return deps.db.runTransaction(async (tx) => {
        const [reqSnap, rateSnap] = await Promise.all([tx.get(reqRef), tx.get(rateLimitRef)]);
        if (!reqSnap.exists) {
            return { success: true };
        }
        const reqData = reqSnap.data();
        if (reqData.toId !== callerUid && reqData.fromId !== callerUid) {
            throw new errors_1.FunctionActionError('permission-denied', 'Not authorized to cancel this friend request.');
        }
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, callerUid, rateLimit_1.RATE_LIMITS.respondFriendRequest, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        tx.delete(reqRef);
        return { success: true };
    });
}
async function executeRemoveFriend(deps, uid, dataIn) {
    if (!uid)
        throw new errors_1.FunctionActionError('unauthenticated', 'Authentication required.');
    const callerUid = assertSafeUid(uid, 'caller user ID');
    const friendUid = assertSafeUid(dataIn?.friendUid, 'friend user ID');
    if (callerUid === friendUid) {
        throw new errors_1.FunctionActionError('invalid-argument', 'Cannot remove yourself as a friend.');
    }
    const rateDeps = getRateDeps(deps);
    (0, rateLimit_1.assertNotRateLimitBlocked)(rateDeps, callerUid, rateLimit_1.RATE_LIMITS.respondFriendRequest);
    const { id } = getFriendshipDocId(callerUid, friendUid);
    const friendshipRef = deps.db.collection('friendships').doc(id);
    const rateLimitRef = (0, rateLimit_1.getRateLimitDocRef)(deps.db, callerUid, rateLimit_1.RATE_LIMITS.respondFriendRequest);
    const nowMs = getCurrentTime(deps);
    await deps.db.runTransaction(async (tx) => {
        const [snap, rateSnap] = await Promise.all([tx.get(friendshipRef), tx.get(rateLimitRef)]);
        if (!snap.exists)
            return;
        const nextRateDoc = (0, rateLimit_1.evaluateRateLimitInTx)(rateDeps, callerUid, rateLimit_1.RATE_LIMITS.respondFriendRequest, rateSnap.exists, rateSnap.exists ? rateSnap.data() : undefined, nowMs);
        tx.set(rateLimitRef, nextRateDoc);
        tx.delete(friendshipRef);
    });
    return { success: true };
}
//# sourceMappingURL=socialHandlers.js.map