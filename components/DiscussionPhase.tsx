import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, FastForward, VenetianMask, ShieldAlert } from 'lucide-react';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { playSound } from '../services/soundService';
import { Player } from '../types';
import { Avatar } from './Avatar';

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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-bg-surface/90 rounded-3xl p-6 border border-border-strong shadow-2xl flex flex-col items-center max-w-md w-full text-center relative mb-6"
      >
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
          <MessageCircle size={32} className="text-accent animate-pulse" />
        </div>

        <h2 className="text-2xl font-black text-text-main mb-2">{t('discussionTime')}</h2>
        <p className="text-text-muted mb-4 text-sm font-bold">{t('discussAndAsk')}</p>

        {/* Status Bar */}
        <div className="flex gap-3 w-full justify-center">
          <div className="bg-bg-card border border-border rounded-xl p-2.5 flex-1 flex flex-col items-center shadow-sm">
            <span className="text-xs font-black text-text-muted mb-1">
              {t('remainingIntruders')}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-text-main tabular-nums">
                {mrWhiteCount + undercoverCount}
              </span>
              <VenetianMask size={15} className="text-danger" />
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-2.5 flex-1 flex flex-col items-center shadow-sm">
            <span className="text-xs font-black text-text-muted mb-1">{t('specialRoles')}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-text-main tabular-nums">
                {specialRolesCount > 0 ? specialRolesCount : t('none')}
              </span>
              <ShieldAlert size={15} className="text-accent" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="w-full max-w-lg mb-6">
        <div className="flex flex-wrap justify-center gap-5">
          {speakingOrder.map((player, index) => {
            const badgeColor = index === 0 ? 'bg-pink-500' : 'bg-emerald-500';

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08, type: 'spring' }}
                className="flex flex-col items-center relative"
              >
                <div
                  className={`absolute -top-1 -left-1 w-7 h-7 rounded-full ${badgeColor} flex items-center justify-center font-black text-white text-xs z-10 shadow-md border-2 border-white/40 tabular-nums`}
                >
                  {index + 1}
                </div>

                <Avatar avatar={player.avatar} name={player.name} size={86} />

                <div className="mt-2.5 bg-bg-surface/85 backdrop-blur-sm px-3.5 py-1 rounded-xl text-xs font-black text-text-main shadow-sm min-w-[80px] text-center border border-border-strong truncate max-w-[110px]">
                  {player.name}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => {
          playSound('click');
          onSkip();
        }}
        className="btn-chunky w-full max-w-md py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 mt-auto"
      >
        <span>{t('voteNow')}</span>
        <FastForward size={20} />
      </button>
    </div>
  );
};
