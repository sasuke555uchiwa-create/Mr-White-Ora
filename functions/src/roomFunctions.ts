import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getCallableOptions } from './callableConfig';
import { DbLike, FunctionActionError } from './errors';
import { db } from './firebaseAdmin';
import {
  executeCreateRoom,
  executeJoinRoom,
  executeKickPlayer,
  executeLeaveRoom,
  executePromoteHost,
  executeQuickJoinRoom,
  executeSendRoomChat,
  executeToggleReady,
  executeUpdateRoomSettings,
} from './roomHandlers';

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

export const createRoom = onCall(callableOpts, (request) =>
  handleCallable(() =>
    executeCreateRoom(deps, request.auth?.uid, request.auth?.token, request.data || {})
  )
);

export const joinRoom = onCall(callableOpts, (request) =>
  handleCallable(() =>
    executeJoinRoom(deps, request.auth?.uid, request.auth?.token, request.data || {})
  )
);

export const quickJoinRoom = onCall(callableOpts, (request) =>
  handleCallable(() => executeQuickJoinRoom(deps, request.auth?.uid, request.auth?.token))
);

export const leaveRoom = onCall(callableOpts, (request) =>
  handleCallable(() => executeLeaveRoom(deps, request.auth?.uid, request.data || {}))
);

export const updateRoomSettings = onCall(callableOpts, (request) =>
  handleCallable(() => executeUpdateRoomSettings(deps, request.auth?.uid, request.data || {}))
);

export const kickPlayer = onCall(callableOpts, (request) =>
  handleCallable(() => executeKickPlayer(deps, request.auth?.uid, request.data || {}))
);

export const promoteHost = onCall(callableOpts, (request) =>
  handleCallable(() => executePromoteHost(deps, request.auth?.uid, request.data || {}))
);

export const toggleReady = onCall(callableOpts, (request) =>
  handleCallable(() => executeToggleReady(deps, request.auth?.uid, request.data || {}))
);

export const sendRoomChat = onCall(callableOpts, (request) =>
  handleCallable(() => executeSendRoomChat(deps, request.auth?.uid, request.data || {}))
);
