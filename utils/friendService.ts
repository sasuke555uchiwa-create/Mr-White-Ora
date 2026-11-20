import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { isOnlineBackendUnavailableError } from './onlineRoomService';

export const sendFriendRequest = async (
  _fromId: string,
  toId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const callable = httpsCallable<{ toId: string }, { success: boolean; message: string }>(
      functions,
      'sendFriendRequest'
    );
    const res = await callable({ toId });
    return res.data;
  } catch (error: any) {
    console.warn('Error sending friend request:', error);
    const message = isOnlineBackendUnavailableError(error)
      ? 'onlineBackendUnavailable'
      : String(error?.code || '') === 'functions/resource-exhausted'
      ? 'rateLimitExceeded'
      : 'errorSendingRequest';
    return {
      success: false,
      message,
    };
  }
};

export const acceptFriendRequest = async (
  requestId: string,
  _fromId?: string,
  _toId?: string
): Promise<{ success: boolean }> => {
  try {
    const callable = httpsCallable<{ requestId: string }, { success: boolean }>(
      functions,
      'acceptFriendRequest'
    );
    const res = await callable({ requestId });
    return res.data;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false };
  }
};

export const rejectFriendRequest = async (requestId: string): Promise<{ success: boolean }> => {
  try {
    const callable = httpsCallable<{ requestId: string }, { success: boolean }>(
      functions,
      'rejectFriendRequest'
    );
    const res = await callable({ requestId });
    return res.data;
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { success: false };
  }
};
