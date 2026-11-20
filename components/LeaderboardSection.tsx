import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Trophy, Medal, Star } from 'lucide-react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';

export const LeaderboardSection: React.FC = () => {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const lang = getSettings().language;
  const isRTL = ['ar', 'sa'].includes(lang);

  useEffect(() => {
    if (!user) {
      setLeaders([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchLeaders = async () => {
      try {
        const q = query(
          collection(db, 'publicProfiles'),
          where('xp', '>=', 0),
          orderBy('xp', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        if (!isMounted) return;
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setLeaders(data);
      } catch (error) {
        if (isMounted) {
          handleFirestoreError(error, OperationType.LIST, 'publicProfiles');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    void fetchLeaders();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) {
    return null;
  }

  if (loading) {
    return <div className="text-center py-4 text-text-muted">{getUITranslation(lang, 'loadingLeaderboard')}</div>;
  }

  return (
    <div className="mt-8 mb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isRTL ? 'text-right justify-start' : 'text-left justify-start'}`}>
        <Trophy className="w-5 h-5 text-yellow-500" /> {getUITranslation(lang, 'leaderboard')}
      </h3>
      
      <div className="card-modern overflow-hidden">
        {leaders.map((leader, index) => (
          <div key={leader.id} className="flex items-center gap-3 p-3 border-b border-white/5 last:border-0">
            <div className="w-8 text-center font-bold text-lg">
              {index === 0 ? <Medal className="w-6 h-6 text-yellow-400 mx-auto" /> : 
               index === 1 ? <Medal className="w-6 h-6 text-gray-300 mx-auto" /> : 
               index === 2 ? <Medal className="w-6 h-6 text-amber-600 mx-auto" /> : 
               <span className="text-text-muted">{index + 1}</span>}
            </div>
            <Avatar avatar={leader.photoURL || ''} name={leader.displayName || ''} size={40} />
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-bold text-sm text-white">{leader.displayName}</p>
              <p className="text-xs text-text-muted">{getUITranslation(lang, 'level')} {leader.level ?? 1}</p>
            </div>
            <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
              <span className="text-sm font-bold text-primary flex items-center gap-1">
                {Number(leader.xp ?? 0).toLocaleString()} <Star className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
