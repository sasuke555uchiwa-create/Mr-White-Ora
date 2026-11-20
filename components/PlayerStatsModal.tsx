import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Star, Gamepad2, Crown } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Avatar } from './Avatar';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  name: string;
  avatar: string;
  onVote?: () => void;
  isVotingPhase?: boolean;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({
  isOpen,
  onClose,
  uid,
  name,
  avatar,
  onVote,
  isVotingPhase
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const lang = getSettings().language;
  const isRTL = ['ar', 'sa'].includes(lang);

  useEffect(() => {
    if (isOpen && uid) {
      setLoading(true);
      const fetchProfile = async () => {
        try {
          const userRef = doc(db, 'publicProfiles', uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen, uid]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-bg-dark border border-border rounded-3xl p-6 w-full max-w-sm relative shadow-2xl card-modern"
        >
          <button
            onClick={onClose}
            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 bg-bg-surface rounded-full text-text-muted hover:text-white transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center mb-6 mt-4">
            <Avatar avatar={avatar} name={name} size={96} showName={true} />
            
            {loading ? (
              <div className="h-6 w-24 bg-bg-surface animate-pulse rounded-full mt-2"></div>
            ) : profile ? (
              <div className="flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full mt-2">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold text-sm">{getUITranslation(lang, 'level')} {profile.level || 1}</span>
              </div>
            ) : (
              <span className="text-text-muted text-sm mt-2">{getUITranslation(lang, 'noStats')}</span>
            )}
          </div>

          {!loading && profile && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card-modern p-3 flex flex-col items-center justify-center text-center">
                <Gamepad2 className="w-6 h-6 text-blue-400 mb-2" />
                <span className="text-2xl font-black text-white">{profile.stats?.played || 0}</span>
                <span className="text-xs text-text-muted font-medium">{getUITranslation(lang, 'played')}</span>
              </div>
              <div className="card-modern p-3 flex flex-col items-center justify-center text-center">
                <Trophy className="w-6 h-6 text-yellow-400 mb-2" />
                <span className="text-2xl font-black text-white">{profile.stats?.wins || 0}</span>
                <span className="text-xs text-text-muted font-medium">{getUITranslation(lang, 'wins')}</span>
              </div>
              <div className="card-modern p-3 flex flex-col items-center justify-center text-center col-span-2">
                <Crown className="w-6 h-6 text-purple-400 mb-2" />
                <span className="text-2xl font-black text-white">{profile.stats?.hosted || 0}</span>
                <span className="text-xs text-text-muted font-medium">{getUITranslation(lang, 'hosted')}</span>
              </div>
            </div>
          )}

          {isVotingPhase && onVote && (
            <button
              onClick={() => {
                onVote();
                onClose();
              }}
              className="btn-modern btn-modern-danger w-full py-4 rounded-2xl font-black text-lg"
            >
              {getUITranslation(lang, 'voteFor')} {name}
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
