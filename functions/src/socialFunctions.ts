import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getCallableOptions } from './callableConfig';
import { DbLike, FunctionActionError } from './errors';
import { db } from './firebaseAdmin';
import {
  executeAcceptFriendRequest,
  executeRejectFriendRequest,
  executeRemoveFriend,
  executeSendFriendRequest,
} from './socialHandlers';

const deps = {
  db: db as unknown as DbLike,
  serverTimestamp: () => FieldValue.serverTimestamp(),
  toTimestamp: (ms: number) => Timestamp.fromMillis(ms),
};

function handleCallable<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    if (err instanceof FunctionActionError) {
      throw new HttpsError(err.code, err.message);
    }
    throw err;
  });
}

const callableOpts = getCallableOptions();

export const sendFriendRequest = onCall(callableOpts, (request) =>
  handleCallable(() => executeSendFriendRequest(deps, request.auth?.uid, request.data || {}))
);

export const acceptFriendRequest = onCall(callableOpts, (request) =>
  handleCallable(() => executeAcceptFriendRequest(deps, request.auth?.uid, request.data || {}))
);

export const rejectFriendRequest = onCall(callableOpts, (request) =>
  handleCallable(() => executeRejectFriendRequest(deps, request.auth?.uid, request.data || {}))
);

export const removeFriend = onCall(callableOpts, (request) =>
  handleCallable(() => executeRemoveFriend(deps, request.auth?.uid, request.data || {}))
);
