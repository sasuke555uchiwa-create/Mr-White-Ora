import React, { useState } from 'react';
import { Player, SpecialRoleId } from '../types';
import { playSound } from '../services/soundService';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';
import { AlertTriangle, Smartphone, Users, Lock, Check, Shield, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUITranslation } from '../translations';
import { getRoleAsset, getRoleTitle } from '../data/specialRoles';

export interface VoteCompletionMeta {
  shieldedTargetId?: number | null;
  isGroupVote?: boolean;
}

interface VotingScreenProps {
  players: Player[];
  onVoteComplete: (votes: Record<number, number>, meta?: VoteCompletionMeta) => void;
  currentRound?: number;
  difficulty?: 'easy' | 'hard';
}

export const VotingScreen: React.FC<VotingScreenProps> = ({
  players,
  onVoteComplete,
  currentRound = 1,
  difficulty = 'easy',
}) => {
  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string, params?: Record<string, any>) => {
    let text = getUITranslation(lang, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const [voteMode, setVoteMode] = useState<'group' | 'secret'>('group');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [shieldedTargetId, setShieldedTargetId] = useState<number | null>(null);

  // Mr. Ghost retains voting rights even after elimination
  const votersQueue = players.filter(
    (p) => !p.isEliminated || p.specialRole === 'ghost' || p.role === 'ghost'
  );
  const [currentVoterIdx, setCurrentVoterIdx] = useState(0);
  const [isPassingVoter, setIsPassingVoter] = useState(true);
  const [secretVotes, setSecretVotes] = useState<Record<number, number>>({});

  const alivePlayers = players.filter((p) => !p.isEliminated);
  const mrWhiteCount = alivePlayers.filter((p) => p.role === 'mrwhite').length;
  const undercoverCount = alivePlayers.filter((p) => p.role === 'undercover').length;
  const unusedShieldHolder = alivePlayers.find(
    (p) => (p.specialRole === 'protector' || p.role === 'protector') && !p.specialAbilityUsed
  );
  const activeSpecials = Array.from(
    new Set(
      players
        .map((p) => p.specialRole)
        .filter((r): r is SpecialRoleId => Boolean(r))
    )
  );

  const currentVoter = votersQueue[currentVoterIdx];
  const isCurrentVoterShieldHolder =
    voteMode === 'secret' &&
    Boolean(unusedShieldHolder && currentVoter?.id === unusedShieldHolder.id);

  const handleSuspectSelect = (suspectId: number) => {
    playSound('click');
    setSelectedPlayerId(suspectId);
  };

  const confirmElimination = () => {
    if (selectedPlayerId === null) return;
    playSound('vote');

    if (voteMode === 'group') {
      const simulatedVotes: Record<number, number> = {};
      votersQueue.forEach((p) => {
        simulatedVotes[p.id] = selectedPlayerId;
      });
      onVoteComplete(simulatedVotes, { shieldedTargetId, isGroupVote: true });
      return;
    }

    const nextVotes = { ...secretVotes, [currentVoter.id]: selectedPlayerId };
    setSecretVotes(nextVotes);
    setSelectedPlayerId(null);

    if (currentVoterIdx < votersQueue.length - 1) {
      setCurrentVoterIdx((prev) => prev + 1);
      setIsPassingVoter(true);
    } else {
      onVoteComplete(nextVotes, { shieldedTargetId, isGroupVote: false });
    }
  };

  const handleSwitchMode = (mode: 'group' | 'secret') => {
    playSound('click');
    setVoteMode(mode);
    setSelectedPlayerId(null);
    setShieldedTargetId(null);
    setCurrentVoterIdx(0);
    setSecretVotes({});
    setIsPassingVoter(true);
  };

  return (
    <div className="flex flex-col min-h-full items-center text-center pb-12 relative max-w-4xl mx-auto w-full">
      {/* Dark Curved Header */}
      <div className="w-full bg-rose-950/90 border-b border-rose-500/30 rounded-b-[2.5rem] px-5 pt-4 pb-6 shadow-2xl mb-4">
        <span className="text-xs font-black text-rose-300 block mb-1">
          {lang === 'ar' ? `تصويت الجولة ${currentRound}` : `Round ${currentRound} Vote`}
        </span>
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
          <AlertTriangle size={24} className="text-rose-400" />
          <span>{lang === 'ar' ? 'بصدد التصويت...' : t('eliminationTime')}</span>
        </h2>
        <p className="text-rose-200/85 text-xs sm:text-sm font-bold mt-1">
          {voteMode === 'group'
            ? t('discussAndVote')
            : lang === 'ar'
            ? `مرر الهاتف إلى ${currentVoter?.name} للتصويت بسرية`
            : `Pass the phone to ${currentVoter?.name} to cast a secret vote`}
        </p>

        {/* Voting Mode Toggle */}
        <div className="mt-4 inline-flex p-1 rounded-2xl bg-black/35 border border-white/10 gap-1">
          <button
            onClick={() => handleSwitchMode('group')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              voteMode === 'group' ? 'bg-rose-500 text-white shadow' : 'text-rose-200/75'
            }`}
          >
            <Users size={14} />
            <span>{lang === 'ar' ? 'تصويت جماعي' : 'Group Vote'}</span>
          </button>
          <button
            onClick={() => handleSwitchMode('secret')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              voteMode === 'secret' ? 'bg-rose-500 text-white shadow' : 'text-rose-200/75'
            }`}
          >
            <Lock size={14} />
            <span>{lang === 'ar' ? 'تصويت فردي (سري)' : 'Individual Vote'}</span>
          </button>
        </div>
      </div>

      {/* Status Row */}
      <div className="w-full px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-surface/90 border border-border-strong rounded-2xl p-3 flex items-center justify-between shadow-md">
            <span className="text-xs font-black text-text-muted">{t('specialRoles')}</span>
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {activeSpecials.length > 0 ? (
                activeSpecials.slice(0, 3).map((r) => (
                  <img
                    key={r}
                    src={getRoleAsset(r)}
                    alt={getRoleTitle(r, lang)}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full bg-[#0B1120] border border-white/25 object-cover"
                  />
                ))
              ) : (
                <span className="text-xs font-black text-text-muted">{t('none')}</span>
              )}
            </div>
          </div>

          <div className="bg-bg-surface/90 border border-border-strong rounded-2xl p-3 flex items-center justify-between shadow-md">
            <span className="text-xs font-black text-text-muted">
              {t('remainingIntruders')}
            </span>
            <div className="flex items-center gap-2">
              {difficulty === 'hard' ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-text-main tabular-nums">
                    {undercoverCount + mrWhiteCount}
                  </span>
                  <HelpCircle size={18} className="text-rose-400" />
                </div>
              ) : (
                <>
                  {undercoverCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-text-main tabular-nums">
                        {undercoverCount}
                      </span>
                      <img
                        src={getRoleAsset('undercover')}
                        alt="Undercover"
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full bg-[#0B1120] object-cover border border-orange-400/40"
                      />
                    </div>
                  )}
                  {mrWhiteCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-text-main tabular-nums">
                        {mrWhiteCount}
                      </span>
                      <img
                        src={getRoleAsset('mrwhite')}
                        alt="Mr. White"
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full bg-[#0B1120] object-cover border border-amber-400/50"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mr. Shield Auto-Self Info in Group Vote */}
      {voteMode === 'group' && activeSpecials.includes('protector') && (
        <div className="w-full px-4 mb-4">
          <div className="w-full py-2.5 px-4 rounded-2xl border bg-sky-500/10 border-sky-400/30 text-sky-300 text-xs font-black flex items-center justify-center gap-2">
            <Shield size={16} className="text-sky-400 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'في التصويت الجماعي: درع Mr. Shield يحمي صاحبه تلقائياً عند استهدافه'
                : 'Group Vote: Mr. Shield auto-protects its owner if voted out'}
            </span>
          </div>
        </div>
      )}

      {/* Secret Ballot Progress & Private Mr. Shield Selector */}
      {voteMode === 'secret' && currentVoter && (
        <div className="w-full px-4 mb-4 space-y-3">
          <div className="inline-block px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs font-black text-rose-200 tabular-nums">
            {lang === 'ar'
              ? `صوت ${currentVoter.name} (${currentVoterIdx + 1} / ${votersQueue.length})${
                  currentVoter.isEliminated ? ' · Mr. Ghost' : ''
                }`
              : `${currentVoter.name}'s vote (${currentVoterIdx + 1}/${votersQueue.length})`}
          </div>

          {isCurrentVoterShieldHolder && !isPassingVoter && (
            <div className="bg-sky-500/15 border border-sky-400/40 rounded-2xl p-3.5 text-start">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-sky-300 text-xs font-black">
                  <Shield size={15} />
                  <span>
                    {lang === 'ar'
                      ? 'قدرة Mr. Shield (لمرة واحدة): احمِ لاعباً هذه الجولة'
                      : 'Mr. Shield (One-Time): Guard a player this round'}
                  </span>
                </div>
                {shieldedTargetId !== null && (
                  <button
                    onClick={() => setShieldedTargetId(null)}
                    className="text-xs font-black text-rose-300 hover:underline"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Clear'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {alivePlayers.map((target) => {
                  const isGuarded = shieldedTargetId === target.id;
                  return (
                    <button
                      key={target.id}
                      onClick={() => {
                        playSound('pop');
                        setShieldedTargetId(isGuarded ? null : target.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shrink-0 transition-all ${
                        isGuarded
                          ? 'bg-sky-500 text-white border-sky-300 shadow'
                          : 'bg-bg-surface/80 text-text-main border-border'
                      }`}
                    >
                      <Avatar avatar={target.avatar} name={target.name} size={22} />
                      <span>{target.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suspects Avatar Grid */}
      <div className="w-full px-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-5 justify-items-center pb-6">
          {alivePlayers.map((p) => {
            const isSelfInSecret = voteMode === 'secret' && currentVoter?.id === p.id;
            return (
              <motion.button
                key={p.id}
                disabled={isSelfInSecret}
                whileHover={{ scale: isSelfInSecret ? 1 : 1.05 }}
                whileTap={{ scale: isSelfInSecret ? 1 : 0.95 }}
                onClick={() => handleSuspectSelect(p.id)}
                className={`flex flex-col items-center justify-center group relative ${
                  isSelfInSecret ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className="relative rounded-full p-1 ring-2 ring-transparent group-hover:ring-rose-400 transition-all">
                  <Avatar avatar={p.avatar} name={p.name} size={74} />
                </div>
                <span className="mt-2 px-3 py-0.5 rounded-lg bg-white text-slate-900 text-xs font-black truncate max-w-[96px] shadow">
                  {p.name}
                </span>
                {!isSelfInSecret && (
                  <span className="mt-1 px-2.5 py-0.5 rounded-lg bg-rose-500/90 text-white text-[11px] font-black shadow">
                    {lang === 'ar' ? 'استبعاد' : 'Eliminate'}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Pass Phone Overlay for Secret Ballot */}
      <AnimatePresence>
        {voteMode === 'secret' && isPassingVoter && currentVoter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-dark/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-bg-surface border border-border-strong rounded-[2.25rem] p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-400/30 flex items-center justify-center mb-4">
                <Smartphone size={32} className="text-rose-400" />
              </div>
              <h3 className="text-2xl font-black text-text-main mb-2">
                {t('passPhoneTo', { name: currentVoter.name })}
              </h3>
              {(currentVoter.specialRole === 'ghost' || currentVoter.role === 'ghost') &&
                currentVoter.isEliminated && (
                  <p className="text-xs font-black text-sky-400 mb-3">
                    {lang === 'ar'
                      ? 'قدرة Mr. Ghost: لا يزال بإمكانك التصويت!'
                      : 'Mr. Ghost Power: You can still vote!'}
                  </p>
                )}
              <div className="my-4">
                <Avatar avatar={currentVoter.avatar} name={currentVoter.name} size={84} />
              </div>
              <button
                onClick={() => {
                  playSound('passPhone');
                  setIsPassingVoter(false);
                }}
                className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-lg shadow-lg"
              >
                {t('iAm', { name: currentVoter.name })}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedPlayerId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-surface border border-border-strong rounded-[2.25rem] w-full max-w-sm p-7 text-center shadow-2xl"
            >
              <div className="flex justify-center mb-4">
                <Avatar
                  avatar={players.find((p) => p.id === selectedPlayerId)?.avatar || ''}
                  name={players.find((p) => p.id === selectedPlayerId)?.name || ''}
                  size={96}
                />
              </div>
              <h3 className="text-text-main font-black text-xl mb-6 leading-relaxed">
                {voteMode === 'group'
                  ? t('eliminateConfirmDesc', {
                      name: players.find((p) => p.id === selectedPlayerId)?.name,
                    })
                  : lang === 'ar'
                  ? `تأكيد التصويت ضد ${players.find((p) => p.id === selectedPlayerId)?.name}؟`
                  : `Vote for ${players.find((p) => p.id === selectedPlayerId)?.name}?`}
              </h3>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedPlayerId(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-bg-card border border-border text-text-main font-black"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={confirmElimination}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Check size={18} />
                  <span>{voteMode === 'group' ? t('eliminate') : t('confirm')}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
