import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Trophy, Medal, Star } from 'lucide-react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';
import { IntelligencePanel, ScreenSectionHeader } from './ui/BlacksiteUI';

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
    return (
      <div className="text-center py-4 text-sm font-medium text-text-muted">
        {getUITranslation(lang, 'loadingLeaderboard')}
      </div>
    );
  }

  return (
    <div className="mt-8 mb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <ScreenSectionHeader
        title={getUITranslation(lang, 'leaderboard')}
        icon={<Trophy className="w-4 h-4" />}
        className="mb-4"
      />

      <IntelligencePanel className="relative overflow-hidden divide-y divide-border">
        <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
        {leaders.map((leader, index) => (
          <div key={leader.id} className="flex items-center gap-3 p-3.5">
            <div className="w-8 text-center font-mono-code font-bold text-sm tabular-nums shrink-0">
              {index === 0 ? (
                <Medal className="w-5 h-5 text-primary-text mx-auto" />
              ) : index === 1 ? (
                <Medal className="w-5 h-5 text-text-muted mx-auto" />
              ) : index === 2 ? (
                <Medal className="w-5 h-5 text-[#C88D5E] mx-auto" />
              ) : (
                <span className="text-text-muted">{index + 1}</span>
              )}
            </div>
            <Avatar avatar={leader.photoURL || ''} name={leader.displayName || ''} size={38} />
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-bold text-sm text-text-main truncate">{leader.displayName}</p>
              <p className="text-xs text-text-muted tabular-nums">
                {getUITranslation(lang, 'level')} {leader.level ?? 1}
              </p>
            </div>
            <div className={`flex flex-col shrink-0 ${isRTL ? 'items-end' : 'items-start'}`}>
              <span className="text-sm font-mono-code font-bold text-primary-text flex items-center gap-1 tabular-nums">
                {Number(leader.xp ?? 0).toLocaleString()} <Star className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </IntelligencePanel>
    </div>
  );
};
