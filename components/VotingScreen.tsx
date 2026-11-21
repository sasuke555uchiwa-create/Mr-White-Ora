import React, { useState } from 'react';
import { Player, SpecialRoleId } from '../types';
import { playSound } from '../services/soundService';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';
import { AlertTriangle, Smartphone, Users, Lock, Check, Shield, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUITranslation } from '../translations';
import { getRoleAsset, getRoleTitle } from '../data/specialRoles';
import {
  ClassifiedStamp,
  IntelligencePanel,
  ModalShell,
  PlayerIntelligenceCard,
  SegmentedControl,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

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
    <div className="flex flex-col min-h-full items-center text-center px-4 pt-3 pb-12 relative max-w-4xl mx-auto w-full">
      {/* Tribunal Header Panel */}
      <IntelligencePanel className="w-full p-4 sm:p-5 mb-4 border-[#963F46]/40">
        <div className="flex items-center justify-between gap-2 mb-3">
          <ClassifiedStamp tone="crimson">
            TRIBUNAL · R{currentRound}
          </ClassifiedStamp>
          <span className="text-xs font-semibold text-text-muted">
            {lang === 'ar' ? `تصويت الجولة ${currentRound}` : `Round ${currentRound} Vote`}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-text-main flex items-center justify-center gap-2">
          <AlertTriangle size={20} className="text-danger-text shrink-0" />
          <span>{lang === 'ar' ? 'بصدد التصويت...' : t('eliminationTime')}</span>
        </h2>
        <p className="text-text-muted text-xs sm:text-sm font-medium mt-1.5">
          {voteMode === 'group'
            ? t('discussAndVote')
            : lang === 'ar'
            ? `مرر الهاتف إلى ${currentVoter?.name} للتصويت بسرية`
            : `Pass the phone to ${currentVoter?.name} to cast a secret vote`}
        </p>

        {/* Voting Mode Segmented Control */}
        <div className="mt-4 max-w-md mx-auto">
          <SegmentedControl
            value={voteMode}
            onChange={handleSwitchMode}
            className="w-full"
            options={[
              {
                value: 'group',
                label: lang === 'ar' ? 'تصويت جماعي' : 'Group Vote',
                icon: <Users size={14} />,
              },
              {
                value: 'secret',
                label: lang === 'ar' ? 'تصويت فردي (سري)' : 'Individual Vote',
                icon: <Lock size={14} />,
              },
            ]}
          />
        </div>
      </IntelligencePanel>

      {/* Status Row */}
      <div className="w-full mb-4">
        <div className="grid grid-cols-2 gap-3">
          <IntelligencePanel className="p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">{t('specialRoles')}</span>
            <div className="flex items-center gap-1">
              {activeSpecials.length > 0 ? (
                activeSpecials.slice(0, 3).map((r) => (
                  <img
                    key={r}
                    src={getRoleAsset(r)}
                    alt={getRoleTitle(r, lang)}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-[6px] bg-[#080B10] border border-border-strong object-cover"
                  />
                ))
              ) : (
                <span className="text-xs font-semibold text-text-muted">{t('none')}</span>
              )}
            </div>
          </IntelligencePanel>

          <IntelligencePanel className="p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">
              {t('remainingIntruders')}
            </span>
            <div className="flex items-center gap-2">
              {difficulty === 'hard' ? (
                <StatusIndicator tone="crimson" icon={<HelpCircle size={13} />}>
                  {undercoverCount + mrWhiteCount}
                </StatusIndicator>
              ) : (
                <>
                  {undercoverCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-text-main font-mono-code tabular-nums">
                        {undercoverCount}
                      </span>
                      <img
                        src={getRoleAsset('undercover')}
                        alt="Undercover"
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-[6px] bg-[#080B10] object-cover border border-[#A46F44]/45"
                      />
                    </div>
                  )}
                  {mrWhiteCount > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-text-main font-mono-code tabular-nums">
                        {mrWhiteCount}
                      </span>
                      <img
                        src={getRoleAsset('mrwhite')}
                        alt="Mr. White"
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-[6px] bg-[#080B10] object-cover border border-[#B49A62]/45"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </IntelligencePanel>
        </div>
      </div>

      {/* Mr. Shield Auto-Self Info in Group Vote */}
      {voteMode === 'group' && activeSpecials.includes('protector') && (
        <div className="w-full mb-4">
          <div className="w-full py-2.5 px-4 rounded-[10px] border bg-[#668F9A]/12 border-[#668F9A]/35 text-cyan-text text-xs font-semibold flex items-center justify-center gap-2">
            <Shield size={15} className="shrink-0" />
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
        <div className="w-full mb-4 space-y-3">
          <StatusIndicator tone="crimson" className="py-1.5 px-3 text-xs">
            {lang === 'ar'
              ? `صوت ${currentVoter.name} (${currentVoterIdx + 1} / ${votersQueue.length})${
                  currentVoter.isEliminated ? ' · Mr. Ghost' : ''
                }`
              : `${currentVoter.name}'s vote (${currentVoterIdx + 1}/${votersQueue.length})`}
          </StatusIndicator>

          {isCurrentVoterShieldHolder && !isPassingVoter && (
            <div className="bg-[#668F9A]/12 border border-[#668F9A]/35 rounded-[12px] p-3.5 text-start">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 text-cyan-text text-xs font-bold">
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
                    className="text-xs font-bold text-danger-text hover:underline min-h-[32px] px-2"
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
                      className={`min-h-[40px] px-3 py-1.5 rounded-[8px] border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                        isGuarded
                          ? 'bg-[#668F9A] text-[#080B10] border-[#8CB3BE]/50'
                          : 'bg-bg-surface text-text-main border-border'
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

      {/* Suspects Operative Grid */}
      <div className="w-full pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {alivePlayers.map((p) => {
            const isSelfInSecret = voteMode === 'secret' && currentVoter?.id === p.id;
            return (
              <motion.button
                key={p.id}
                disabled={isSelfInSecret}
                whileTap={{ scale: isSelfInSecret ? 1 : 0.97 }}
                onClick={() => handleSuspectSelect(p.id)}
                className={`text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#963F46]/70 rounded-[12px] ${
                  isSelfInSecret ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <PlayerIntelligenceCard
                  className={`p-3.5 flex flex-col items-center justify-center min-h-[132px] ${
                    !isSelfInSecret ? 'hover:border-[#963F46]/65 hover:bg-[#963F46]/10' : ''
                  }`}
                >
                  <Avatar avatar={p.avatar} name={p.name} size={64} />
                  <span className="mt-2.5 text-sm font-bold text-text-main truncate max-w-full">
                    {p.name}
                  </span>
                  {!isSelfInSecret && (
                    <span className="mt-1.5 px-2.5 py-0.5 rounded-[6px] bg-[#963F46]/15 border border-[#963F46]/40 text-danger-text text-[11px] font-bold">
                      {lang === 'ar' ? 'استبعاد' : 'Eliminate'}
                    </span>
                  )}
                </PlayerIntelligenceCard>
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
            className="fixed inset-0 z-50 bg-[#080B10]/92 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm"
            >
              <ModalShell className="p-7 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-[12px] bg-[#963F46]/15 border border-[#963F46]/35 flex items-center justify-center mb-4">
                  <Smartphone size={28} className="text-danger-text" />
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">
                  {t('passPhoneTo', { name: currentVoter.name })}
                </h3>
                {(currentVoter.specialRole === 'ghost' || currentVoter.role === 'ghost') &&
                  currentVoter.isEliminated && (
                    <StatusIndicator tone="cyan" className="mb-3">
                      {lang === 'ar'
                        ? 'قدرة Mr. Ghost: لا يزال بإمكانك التصويت!'
                        : 'Mr. Ghost Power: You can still vote!'}
                    </StatusIndicator>
                  )}
                <div className="my-4">
                  <Avatar avatar={currentVoter.avatar} name={currentVoter.name} size={80} />
                </div>
                <TacticalButton
                  onClick={() => {
                    playSound('passPhone');
                    setIsPassingVoter(false);
                  }}
                  variant="danger"
                  size="lg"
                  fullWidth
                >
                  {t('iAm', { name: currentVoter.name })}
                </TacticalButton>
              </ModalShell>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B10]/85 backdrop-blur-md p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <ModalShell className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <Avatar
                    avatar={players.find((p) => p.id === selectedPlayerId)?.avatar || ''}
                    name={players.find((p) => p.id === selectedPlayerId)?.name || ''}
                    size={88}
                  />
                </div>
                <h3 className="text-text-main font-bold text-lg mb-6 leading-relaxed">
                  {voteMode === 'group'
                    ? t('eliminateConfirmDesc', {
                        name: players.find((p) => p.id === selectedPlayerId)?.name,
                      })
                    : lang === 'ar'
                    ? `تأكيد التصويت ضد ${players.find((p) => p.id === selectedPlayerId)?.name}؟`
                    : `Vote for ${players.find((p) => p.id === selectedPlayerId)?.name}?`}
                </h3>

                <div className="flex gap-3">
                  <TacticalButton
                    onClick={() => setSelectedPlayerId(null)}
                    variant="secondary"
                    size="md"
                    className="flex-1"
                  >
                    {t('cancel')}
                  </TacticalButton>
                  <TacticalButton
                    onClick={confirmElimination}
                    variant="danger"
                    size="md"
                    className="flex-1"
                    icon={<Check size={16} />}
                  >
                    {voteMode === 'group' ? t('eliminate') : t('confirm')}
                  </TacticalButton>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
