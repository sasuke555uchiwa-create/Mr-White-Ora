import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export interface OnlineChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface RoomSettingsPayload {
  maxPlayers: number;
  language: string;
  isPrivate: boolean;
  category: string;
  difficulty: 'easy' | 'hard';
  turnDurationSeconds: number;
}

export type OnlineServiceErrorCode =
  | 'backendUnavailable'
  | 'permissionDenied'
  | 'unauthenticated'
  | 'failedPrecondition'
  | 'notFound'
  | 'rateLimited'
  | 'unknown';

export class OnlineServiceError extends Error {
  public readonly code: OnlineServiceErrorCode;
  public readonly originalCode?: string;

  constructor(code: OnlineServiceErrorCode, message: string, originalCode?: string) {
    super(message);
    this.name = 'OnlineServiceError';
    this.code = code;
    this.originalCode = originalCode;
  }
}

export function isOnlineBackendUnavailableError(err: unknown): boolean {
  if (err instanceof OnlineServiceError) {
    return err.code === 'backendUnavailable';
  }
  const code = String((err as any)?.code || '').toLowerCase();
  const msg = String((err as any)?.message || '').toLowerCase();
  return (
    code === 'functions/internal' ||
    code === 'functions/unavailable' ||
    msg === 'internal' ||
    msg.includes('err_failed') ||
    msg.includes('failed to fetch')
  );
}

export function getOnlineActionErrorKey(err: unknown): string {
  if (isOnlineBackendUnavailableError(err)) {
    return 'onlineBackendUnavailable';
  }
  if (err instanceof OnlineServiceError) {
    if (err.code === 'permissionDenied') return 'noPermission';
    if (err.code === 'rateLimited') return 'rateLimitExceeded';
  }
  if (String((err as any)?.code || '') === 'functions/resource-exhausted') {
    return 'rateLimitExceeded';
  }
  return 'errorOccurred';
}

async function callFn<TReq, TRes>(name: string, payload: TReq): Promise<TRes> {
  try {
    const callable = httpsCallable<TReq, TRes>(functions, name);
    const res = await callable(payload);
    return res.data;
  } catch (err: any) {
    const rawCode = String(err?.code || '');
    const msg = String(err?.message || 'Online service call failed.');
    if (
      rawCode === 'functions/internal' ||
      rawCode === 'functions/unavailable' ||
      msg.toLowerCase() === 'internal'
    ) {
      throw new OnlineServiceError(
        'backendUnavailable',
        `Cloud Function "${name}" is unavailable or not deployed (${rawCode || msg}).`,
        rawCode
      );
    }
    if (rawCode === 'functions/permission-denied') {
      throw new OnlineServiceError('permissionDenied', msg, rawCode);
    }
    if (rawCode === 'functions/unauthenticated') {
      throw new OnlineServiceError('unauthenticated', msg, rawCode);
    }
    if (rawCode === 'functions/failed-precondition') {
      throw new OnlineServiceError('failedPrecondition', msg, rawCode);
    }
    if (rawCode === 'functions/not-found') {
      throw new OnlineServiceError('notFound', msg, rawCode);
    }
    if (rawCode === 'functions/resource-exhausted') {
      throw new OnlineServiceError('rateLimited', msg, rawCode);
    }
    throw new OnlineServiceError('unknown', msg, rawCode);
  }
}

export const createOnlineRoom = async (
  settings: RoomSettingsPayload
): Promise<{ roomId: string; secretCode: string }> => {
  return callFn<RoomSettingsPayload, { roomId: string; secretCode: string }>('createRoom', settings);
};

export const joinOnlineRoom = async (params: {
  roomId?: string;
  secretCode?: string;
}): Promise<{ success: boolean; roomId?: string; reason?: string; alreadyJoined?: boolean }> => {
  return callFn<
    { roomId?: string; secretCode?: string },
    { success: boolean; roomId?: string; reason?: string; alreadyJoined?: boolean }
  >('joinRoom', params);
};

export const quickJoinOnlineRoom = async (): Promise<{
  success: boolean;
  roomId: string | null;
}> => {
  return callFn<Record<string, never>, { success: boolean; roomId: string | null }>(
    'quickJoinRoom',
    {}
  );
};

export const leaveOnlineRoom = async (roomId: string, _uid?: string): Promise<void> => {
  if (!roomId) return;
  try {
    await callFn<{ roomId: string }, { success: boolean }>('leaveRoom', { roomId });
  } catch (error) {
    console.error('leaveOnlineRoom error:', error);
    throw error;
  }
};

export const updateOnlineRoomSettings = async (
  roomId: string,
  settings: RoomSettingsPayload
): Promise<void> => {
  await callFn<RoomSettingsPayload & { roomId: string }, { success: boolean }>(
    'updateRoomSettings',
    { roomId, ...settings }
  );
};

export const kickOnlinePlayer = async (roomId: string, targetUid: string): Promise<void> => {
  await callFn<{ roomId: string; targetUid: string }, { success: boolean }>('kickPlayer', {
    roomId,
    targetUid,
  });
};

export const promoteOnlineHost = async (roomId: string, targetUid: string): Promise<void> => {
  await callFn<{ roomId: string; targetUid: string }, { success: boolean }>('promoteHost', {
    roomId,
    targetUid,
  });
};

export const toggleOnlineReady = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('toggleReady', { roomId });
};

export const appendRoomChatMessage = async (
  roomId: string,
  messageOrText: OnlineChatMessage | string
): Promise<void> => {
  if (!roomId) return;
  const text =
    typeof messageOrText === 'string' ? messageOrText.trim() : (messageOrText?.text || '').trim();
  if (!text) return;
  await callFn<{ roomId: string; text: string }, { success: boolean }>('sendRoomChat', {
    roomId,
    text: text.slice(0, 200),
  });
};

export const beginOnlineMatch = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('beginMatch', { roomId });
};

export const startOnlineRound = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('startRound', { roomId });
};

export const markOnlineRevealReady = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('markRevealReady', { roomId });
};

export const submitOnlineClue = async (roomId: string, text: string): Promise<void> => {
  await callFn<{ roomId: string; text: string }, { success: boolean }>('submitClue', {
    roomId,
    text,
  });
};

export const advanceOnlineTurn = async (
  roomId: string,
  reason: 'skip' | 'timeout',
  expectedTurnIndex?: number
): Promise<void> => {
  await callFn<
    { roomId: string; reason: 'skip' | 'timeout'; expectedTurnIndex?: number },
    { success: boolean }
  >('advanceTurn', { roomId, reason, expectedTurnIndex });
};

export const startOnlineVoting = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('startVoting', { roomId });
};

export const submitOnlineVote = async (roomId: string, suspectUid: string): Promise<void> => {
  await callFn<{ roomId: string; suspectUid: string }, { success: boolean }>('submitVote', {
    roomId,
    suspectUid,
  });
};

export const resolveOnlineVotes = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('resolveVotes', { roomId });
};

export const proceedAfterOnlineVoteReveal = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('proceedAfterVoteReveal', { roomId });
};

export const submitOnlineMrWhiteGuess = async (
  roomId: string,
  guess: string,
  forceEliminateMissing = false
): Promise<{ isCorrect: boolean }> => {
  return callFn<
    { roomId: string; guess: string; forceEliminateMissing?: boolean },
    { isCorrect: boolean }
  >('submitMrWhiteGuess', { roomId, guess, forceEliminateMissing });
};

export const returnOnlineToLobby = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('returnToLobby', { roomId });
};

export const nextOnlineMatch = async (roomId: string): Promise<void> => {
  await callFn<{ roomId: string }, { success: boolean }>('nextMatch', { roomId });
};
