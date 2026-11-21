import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, FastForward, VenetianMask, ShieldAlert } from 'lucide-react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { playSound } from '../services/soundService';
import { Player } from '../types';
import { Avatar } from './Avatar';
import {
  ClassifiedStamp,
  IntelligencePanel,
  PlayerIntelligenceCard,
  TacticalButton,
} from './ui/BlacksiteUI';

interface DiscussionPhaseProps {
  players: Player[];
  onTimeUp: () => void;
  onSkip: () => void;
}

export const DiscussionPhase: React.FC<DiscussionPhaseProps> = ({ players, onSkip }) => {
  const settings = getSettings();
  const t = (key: string) => getUITranslation(settings.language, key);

  const alivePlayers = players.filter((p) => !p.isEliminated);
  const mrWhiteCount = alivePlayers.filter((p) => p.role === 'mrwhite').length;
  const undercoverCount = alivePlayers.filter((p) => p.role === 'undercover').length;
  const specialRolesCount = alivePlayers.filter(
    (p) =>
      Boolean(p.specialRole) ||
      ['fool', 'boomerang', 'justice', 'ghost', 'lovers', 'avenger', 'protector', 'mr_meme'].includes(
        p.role
      )
  ).length;

  const [speakingOrder, setSpeakingOrder] = useState<Player[]>([]);

  useEffect(() => {
    const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
    setSpeakingOrder(shuffled);
  }, []);

  return (
    <div className="flex flex-col min-h-full items-center p-4 sm:p-6 max-w-3xl mx-auto w-full">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md mb-6"
      >
        <IntelligencePanel className="p-6 flex flex-col items-center text-center">
          <div className="flex items-center justify-between w-full mb-4">
            <ClassifiedStamp tone="cyan">BRIEFING</ClassifiedStamp>
            <span className="text-xs font-mono-code font-bold text-text-muted tabular-nums">
              {alivePlayers.length} ACTIVE
            </span>
          </div>

          <div className="w-14 h-14 bg-[#668F9A]/15 border border-[#668F9A]/35 rounded-[12px] flex items-center justify-center mb-3">
            <MessageCircle size={26} className="text-cyan-text" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-text-main mb-1.5">
            {t('discussionTime')}
          </h2>
          <p className="text-text-muted mb-5 text-xs sm:text-sm font-medium">
            {t('discussAndAsk')}
          </p>

          {/* Status Bar */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-bg-card border border-border rounded-[10px] p-2.5 flex flex-col items-center">
              <span className="text-[11px] font-semibold text-text-muted mb-1">
                {t('remainingIntruders')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-text-main font-mono-code tabular-nums">
                  {mrWhiteCount + undercoverCount}
                </span>
                <VenetianMask size={15} className="text-danger-text" />
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-[10px] p-2.5 flex flex-col items-center">
              <span className="text-[11px] font-semibold text-text-muted mb-1">
                {t('specialRoles')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-text-main font-mono-code tabular-nums">
                  {specialRolesCount > 0 ? specialRolesCount : t('none')}
                </span>
                <ShieldAlert size={15} className="text-cyan-text" />
              </div>
            </div>
          </div>
        </IntelligencePanel>
      </motion.div>

      <div className="w-full max-w-lg mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {speakingOrder.map((player, index) => {
            const isFirstSpeaker = index === 0;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PlayerIntelligenceCard
                  className={`p-3 flex flex-col items-center relative ${
                    isFirstSpeaker ? 'border-[#B49A62]/55 bg-[#B49A62]/10' : ''
                  }`}
                >
                  <div
                    className={`absolute top-2 left-2 min-w-[24px] h-6 px-1.5 rounded-[6px] flex items-center justify-center font-mono-code font-bold text-[11px] tabular-nums border ${
                      isFirstSpeaker
                        ? 'bg-[#B49A62] text-[#080B10] border-[#D4BE8A]/60'
                        : 'bg-bg-surface text-text-muted border-border'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <Avatar avatar={player.avatar} name={player.name} size={64} />

                  <div className="mt-2.5 px-2.5 py-1 rounded-[8px] bg-bg-surface border border-border text-xs font-bold text-text-main text-center truncate max-w-full w-full">
                    {player.name}
                  </div>
                </PlayerIntelligenceCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-md mt-auto pt-2">
        <TacticalButton
          onClick={() => {
            playSound('click');
            onSkip();
          }}
          variant="primary"
          size="lg"
          fullWidth
          trailingIcon={<FastForward size={18} />}
        >
          {t('voteNow')}
        </TacticalButton>
      </div>
    </div>
  );
};
