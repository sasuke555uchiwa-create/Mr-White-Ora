import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, FastForward, VenetianMask, ShieldAlert } from 'lucide-react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { playSound } from '../services/soundService';
import { Player } from '../types';
import { Avatar } from './Avatar';
import {
  BottomActionBar,
  IntelligencePanel,
  OperationPhaseBadge,
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
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

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
    <div className="flex flex-col min-h-full items-center px-4 sm:px-6 pt-4 pb-0 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl mb-6"
      >
        <IntelligencePanel className="relative overflow-hidden p-5 sm:p-6 flex flex-col items-center text-center border-[#B49A62]/35">
          <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
          <div className="flex items-center justify-between w-full mb-4 pb-2.5 border-b border-border/70">
            <OperationPhaseBadge phase="briefing" lang={lang} />
            <span className="text-xs font-mono-code font-bold text-text-muted tabular-nums shrink-0">
              {alivePlayers.length} ACTIVE
            </span>
          </div>

          <div className="w-12 h-12 bg-[#668F9A]/15 border border-[#668F9A]/35 rounded-[12px] flex items-center justify-center mb-3">
            <MessageCircle size={24} className="text-cyan-text" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-text-main mb-1.5">
            {t('discussionTime')}
          </h2>
          <p className="text-text-muted mb-5 text-xs sm:text-sm font-medium max-w-md">
            {t('discussAndAsk')}
          </p>

          {/* Status Bar */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-bg-card border border-border rounded-[10px] p-3 flex flex-col items-center">
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
            <div className="bg-bg-card border border-border rounded-[10px] p-3 flex flex-col items-center">
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

      <div className="w-full max-w-2xl mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                  className={`p-3 flex flex-col items-center gap-2 ${
                    isFirstSpeaker ? 'border-[#B49A62]/60 bg-[#B49A62]/10' : ''
                  }`}
                >
                  <div className="w-full flex items-center justify-between gap-2 pb-1.5 border-b border-border/60">
                    <span
                      className={`font-mono-code font-bold text-xs tabular-nums ${
                        isFirstSpeaker ? 'text-primary-text' : 'text-text-muted'
                      }`}
                    >
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    {isFirstSpeaker && (
                      <span className="text-[10px] font-mono-code font-bold text-primary-text">
                        1ST
                      </span>
                    )}
                  </div>

                  <Avatar avatar={player.avatar} name={player.name} size={60} />

                  <div className="px-2.5 py-1 rounded-[8px] bg-bg-surface border border-border text-xs font-bold text-text-main text-center truncate max-w-full w-full">
                    {player.name}
                  </div>
                </PlayerIntelligenceCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      <BottomActionBar className="self-stretch mt-auto">
        <div className="w-full max-w-md mx-auto">
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
      </BottomActionBar>
    </div>
  );
};
