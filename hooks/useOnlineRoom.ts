import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { leaveOnlineRoom } from '../utils/onlineRoomService';

export interface PrivatePlayerState {
  uid: string;
  matchId?: string;
  round?: number;
  role: 'citizen' | 'undercover' | 'mrwhite' | 'hidden';
  secretWord: string | null;
}

export interface RoomInviteMeta {
  secretCode: string;
  roomId: string;
}

interface UseOnlineRoomOptions {
  roomId: string;
  user: User | null;
  isLeavingRef: React.MutableRefObject<boolean>;
  onRoomClosed?: () => void;
  onKicked?: () => void;
  onHostPromoted?: () => void;
  onOfflineLeave?: () => void;
  subscribePrivatePlayer?: boolean;
  subscribeInviteMeta?: boolean;
}

export function useOnlineRoom({
  roomId,
  user,
  isLeavingRef,
  onRoomClosed,
  onKicked,
  onHostPromoted,
  onOfflineLeave,
  subscribePrivatePlayer = false,
  subscribeInviteMeta = false,
}: UseOnlineRoomOptions) {
  const [room, setRoom] = useState<any>(null);
  const [privatePlayer, setPrivatePlayer] = useState<PrivatePlayerState | null>(null);
  const [inviteMeta, setInviteMeta] = useState<RoomInviteMeta | null>(null);

  const prevHostIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({
    onRoomClosed,
    onKicked,
    onHostPromoted,
    onOfflineLeave,
  });
  callbacksRef.current = {
    onRoomClosed,
    onKicked,
    onHostPromoted,
    onOfflineLeave,
  };

  useEffect(() => {
    prevHostIdRef.current = null;
    setRoom(null);
    setPrivatePlayer(null);
    setInviteMeta(null);

    if (!roomId || !user) return;
    let active = true;

    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(
      roomRef,
      (docSnap) => {
        if (!active) return;
        if (!docSnap.exists()) {
          setRoom(null);
          if (!isLeavingRef.current) {
            callbacksRef.current.onRoomClosed?.();
          }
          return;
        }

        const data = { id: docSnap.id, ...docSnap.data() } as any;
        if (Array.isArray(data.kickedPlayers) && data.kickedPlayers.includes(user.uid)) {
          if (!isLeavingRef.current) {
            isLeavingRef.current = true;
            callbacksRef.current.onKicked?.();
          }
          return;
        }

        if (
          prevHostIdRef.current &&
          prevHostIdRef.current !== data.hostId &&
          data.hostId === user.uid
        ) {
          callbacksRef.current.onHostPromoted?.();
        }
        prevHostIdRef.current = data.hostId;
        setRoom(data);
      },
      (error) => {
        if (!active || isLeavingRef.current) return;
        handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
      }
    );

    let unsubPrivate: (() => void) | null = null;
    if (subscribePrivatePlayer) {
      const privRef = doc(db, 'rooms', roomId, 'privatePlayers', user.uid);
      unsubPrivate = onSnapshot(
        privRef,
        (docSnap) => {
          if (!active) return;
          setPrivatePlayer(docSnap.exists() ? (docSnap.data() as PrivatePlayerState) : null);
        },
        (error) => {
          if (!active || isLeavingRef.current) return;
          console.warn('Private player listener warning:', error);
        }
      );
    }

    let unsubInvite: (() => void) | null = null;
    if (subscribeInviteMeta) {
      const inviteRef = doc(db, 'rooms', roomId, 'privateMeta', 'invite');
      unsubInvite = onSnapshot(
        inviteRef,
        (docSnap) => {
          if (!active) return;
          setInviteMeta(docSnap.exists() ? (docSnap.data() as RoomInviteMeta) : null);
        },
        (error) => {
          if (!active || isLeavingRef.current) return;
          console.warn('Invite meta listener warning:', error);
        }
      );
    }

    return () => {
      active = false;
      unsubRoom();
      unsubPrivate?.();
      unsubInvite?.();
    };
  }, [roomId, user, subscribePrivatePlayer, subscribeInviteMeta, isLeavingRef]);

  useEffect(() => {
    if (!roomId || !user) return;

    const handleOffline = async () => {
      if (isLeavingRef.current) return;
      isLeavingRef.current = true;
      try {
        await leaveOnlineRoom(roomId, user.uid);
      } catch (err) {
        console.error('Offline leave error:', err);
      } finally {
        callbacksRef.current.onOfflineLeave?.();
      }
    };

    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [roomId, user, isLeavingRef]);

  return { room, privatePlayer, inviteMeta };
}
