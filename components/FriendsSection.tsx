import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { acceptFriendRequest, rejectFriendRequest } from '../utils/friendService';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { UserCheck, UserX, Users, UserPlus } from 'lucide-react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';

export const FriendsSection: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const lang = getSettings().language;
  const isRTL = ['ar', 'sa'].includes(lang);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setFriends([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Listen for incoming friend requests
    const qReq = query(
      collection(db, 'friendRequests'),
      where('toId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubReq = onSnapshot(
      qReq,
      async (snapshot) => {
        const reqDocs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const reqs = await Promise.all(
          reqDocs.map(async (data) => {
            try {
              const userDoc = await getDoc(doc(db, 'publicProfiles', data.fromId));
              if (userDoc.exists()) {
                return { ...data, user: userDoc.data() };
              }
            } catch (e) {
              console.error(e);
            }
            return null;
          })
        );
        if (isMounted) {
          setRequests(reqs.filter(Boolean));
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'friendRequests')
    );

    // Listen for friendships
    const qFriends1 = query(collection(db, 'friendships'), where('user1', '==', user.uid));
    const qFriends2 = query(collection(db, 'friendships'), where('user2', '==', user.uid));

    let docs1: any[] = [];
    let docs2: any[] = [];
    let loaded1 = false;
    let loaded2 = false;

    const syncFriends = async () => {
      if (!loaded1 || !loaded2 || !isMounted) return;
      const friendIds = new Set<string>();
      docs1.forEach((d) => {
        const u2 = d.data()?.user2;
        if (u2) friendIds.add(u2);
      });
      docs2.forEach((d) => {
        const u1 = d.data()?.user1;
        if (u1) friendIds.add(u1);
      });

      const fetched = await Promise.all(
        Array.from(friendIds).map(async (fid) => {
          try {
            const userDoc = await getDoc(doc(db, 'publicProfiles', fid));
            if (userDoc.exists()) {
              return { id: fid, ...userDoc.data() };
            }
          } catch (e) {
            console.error(e);
          }
          return null;
        })
      );

      if (isMounted) {
        setFriends(fetched.filter(Boolean));
        setLoading(false);
      }
    };

    const unsubF1 = onSnapshot(
      qFriends1,
      (s) => {
        docs1 = s.docs;
        loaded1 = true;
        void syncFriends();
      },
      (error) => {
        loaded1 = true;
        if (loaded2 && isMounted) setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'friendships');
      }
    );

    const unsubF2 = onSnapshot(
      qFriends2,
      (s) => {
        docs2 = s.docs;
        loaded2 = true;
        void syncFriends();
      },
      (error) => {
        loaded2 = true;
        if (loaded1 && isMounted) setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'friendships');
      }
    );

    return () => {
      isMounted = false;
      unsubReq();
      unsubF1();
      unsubF2();
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="mt-8 mb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <h3 className={`text-lg font-black mb-4 flex items-center gap-2 drop-shadow-sm ${isRTL ? 'text-right justify-start' : 'text-left justify-start'}`}>
        <Users className="w-5 h-5 text-primary" /> {getUITranslation(lang, 'friends')}
      </h3>
      
      {requests.length > 0 && (
        <div className="mb-6">
          <h4 className={`text-sm font-bold text-text-muted mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{getUITranslation(lang, 'friendRequests')} ({requests.length})</h4>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="card-modern p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar avatar={req.user.photoURL || ''} name={req.user.displayName} size={48} />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="font-black text-sm text-white drop-shadow-sm">{req.user.displayName}</p>
                    <p className="text-xs font-bold text-text-muted">{getUITranslation(lang, 'level')} {req.user.level}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptFriendRequest(req.id, req.fromId, req.toId)} className="p-2.5 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500 hover:text-white transition-colors border border-green-500/30">
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => rejectFriendRequest(req.id)} className="p-2.5 bg-danger/20 text-danger rounded-full hover:bg-danger hover:text-white transition-colors border border-danger/30">
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className={`text-sm font-bold text-text-muted mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{getUITranslation(lang, 'friendsList')} ({friends.length})</h4>
        {loading ? (
          <div className="text-center py-4 font-bold text-text-muted">{getUITranslation(lang, 'loading')}</div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 card-modern border-dashed opacity-70">
            <UserPlus className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-main font-bold text-sm">{getUITranslation(lang, 'noFriendsYet')}</p>
            <p className="text-xs font-bold text-text-muted mt-1">{getUITranslation(lang, 'addFriendsFromRooms')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {friends.map(friend => (
              <div key={friend.id} className="card-modern p-4 flex flex-col items-center text-center gap-2">
                <Avatar avatar={friend.photoURL || ''} name={friend.displayName} size={56} />
                <p className="font-black text-sm text-white truncate w-full drop-shadow-sm">{friend.displayName}</p>
                <p className="text-xs font-bold text-text-muted">{getUITranslation(lang, 'level')} {friend.level}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
