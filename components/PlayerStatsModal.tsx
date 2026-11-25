import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Star, Gamepad2, Crown } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Avatar } from './Avatar';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import {
  IconButton,
  ModalShell,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

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
  isVotingPhase,
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
          console.error('Error fetching profile:', error);
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
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080B10]/85"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm"
        >
          <ModalShell onClose={onClose} ariaLabel={name} className="p-6 relative">
            <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
              <IconButton onClick={onClose} size="sm" variant="ghost" aria-label="Close">
                <X className="w-4 h-4" />
              </IconButton>
            </div>

            <div className="flex flex-col items-center mb-6 mt-2">
              <Avatar avatar={avatar} name={name} size={88} showName={true} />

              {loading ? (
                <div className="h-6 w-24 bg-bg-card animate-pulse rounded-[6px] mt-3" />
              ) : profile ? (
                <StatusIndicator tone="gold" icon={<Star className="w-3.5 h-3.5 fill-current" />} className="mt-3">
                  {getUITranslation(lang, 'level')} {profile.level || 1}
                </StatusIndicator>
              ) : (
                <span className="text-text-muted text-xs font-medium mt-3">
                  {getUITranslation(lang, 'noStats')}
                </span>
              )}
            </div>

            {!loading && profile && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <PlayerIntelligenceCard className="p-3 flex flex-col items-center justify-center text-center">
                  <Gamepad2 className="w-5 h-5 text-cyan-text mb-1.5" />
                  <span className="text-xl font-mono-code font-bold text-text-main tabular-nums">
                    {profile.stats?.played || 0}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {getUITranslation(lang, 'played')}
                  </span>
                </PlayerIntelligenceCard>
                <PlayerIntelligenceCard className="p-3 flex flex-col items-center justify-center text-center">
                  <Trophy className="w-5 h-5 text-primary-text mb-1.5" />
                  <span className="text-xl font-mono-code font-bold text-text-main tabular-nums">
                    {profile.stats?.wins || 0}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {getUITranslation(lang, 'wins')}
                  </span>
                </PlayerIntelligenceCard>
                <PlayerIntelligenceCard className="p-3 flex flex-col items-center justify-center text-center col-span-2">
                  <Crown className="w-5 h-5 text-primary-text mb-1.5" />
                  <span className="text-xl font-mono-code font-bold text-text-main tabular-nums">
                    {profile.stats?.hosted || 0}
                  </span>
                  <span className="text-xs text-text-muted font-medium">
                    {getUITranslation(lang, 'hosted')}
                  </span>
                </PlayerIntelligenceCard>
              </div>
            )}

            {isVotingPhase && onVote && (
              <TacticalButton
                onClick={() => {
                  onVote();
                  onClose();
                }}
                variant="danger"
                size="lg"
                fullWidth
              >
                {getUITranslation(lang, 'voteFor')} {name}
              </TacticalButton>
            )}
          </ModalShell>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
