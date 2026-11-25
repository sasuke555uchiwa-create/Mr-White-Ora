import React, { useEffect, useRef, useState } from 'react';
import { DescriptionEntry, Player, SpecialRoleId } from '../types';
import { playSound } from '../services/soundService';
import { getSettings } from '../services/storageService';
import { Avatar } from './Avatar';
import {
  AlertTriangle,
  Smartphone,
  Users,
  Lock,
  Check,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getUITranslation } from '../translations';
import { getRoleAsset, getRoleTitle, getRoleVisualIdentity } from '../data/specialRoles';
import { BLACKSITE_TEXTURES } from '../src/design/assetRegistry';
import {
  BlacksiteIcon,
  BlacksiteScreenBackdrop,
  ClassifiedStamp,
  IntelligencePanel,
  ModalShell,
  OperationPhaseBadge,
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
  descriptionsLog?: DescriptionEntry[];
}

export const VotingScreen: React.FC<VotingScreenProps> = ({
  players,
  onVoteComplete,
  currentRound = 1,
  difficulty = 'easy',
  descriptionsLog = [],
}) => {
  const prefersReducedMotion = useReducedMotion();
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
  const [isClosingBallot, setIsClosingBallot] = useState(false);

  // Mr. Ghost retains voting rights even after elimination
  const votersQueue = players.filter(
    (p) => !p.isEliminated || p.specialRole === 'ghost' || p.role === 'ghost'
  );
  const [currentVoterIdx, setCurrentVoterIdx] = useState(0);
  const [isPassingVoter, setIsPassingVoter] = useState(true);
  const [secretVotes, setSecretVotes] = useState<Record<number, number>>({});
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

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
  const isSecretGuardedView = voteMode === 'secret' && isPassingVoter && Boolean(currentVoter);

  const handleSuspectSelect = (suspectId: number) => {
    if (isClosingBallot || isSecretGuardedView) return;
    playSound('click');
    setSelectedPlayerId(suspectId);
  };

  const finalizeBallot = (finalVotes: Record<number, number>, isGroupVote: boolean) => {
    setSelectedPlayerId(null);
    playSound('voteClose');

    if (prefersReducedMotion) {
      onVoteComplete(finalVotes, { shieldedTargetId, isGroupVote });
      return;
    }

    setIsClosingBallot(true);
    closeTimerRef.current = window.setTimeout(() => {
      onVoteComplete(finalVotes, { shieldedTargetId, isGroupVote });
    }, 340);
  };

  const confirmElimination = () => {
    if (selectedPlayerId === null || isClosingBallot) return;
    playSound('voteConfirm');

    if (voteMode === 'group') {
      const simulatedVotes: Record<number, number> = {};
      votersQueue.forEach((p) => {
        simulatedVotes[p.id] = selectedPlayerId;
      });
      finalizeBallot(simulatedVotes, true);
      return;
    }

    const nextVotes = { ...secretVotes, [currentVoter.id]: selectedPlayerId };
    setSecretVotes(nextVotes);
    setSelectedPlayerId(null);

    if (currentVoterIdx < votersQueue.length - 1) {
      setCurrentVoterIdx((prev) => prev + 1);
      setIsPassingVoter(true);
    } else {
      finalizeBallot(nextVotes, false);
    }
  };

  const handleSwitchMode = (mode: 'group' | 'secret') => {
    if (isClosingBallot) return;
    playSound('click');
    setVoteMode(mode);
    setSelectedPlayerId(null);
    setShieldedTargetId(null);
    setCurrentVoterIdx(0);
    setSecretVotes({});
    setIsPassingVoter(true);
  };

  const shieldVisual = getRoleVisualIdentity('protector', lang);

  return (
    <div className="flex flex-col min-h-full items-center text-center px-4 pt-3 pb-12 relative max-w-4xl mx-auto w-full">
      <BlacksiteScreenBackdrop bgKey="voting" texture="carbon" />
      <div className="relative z-10 flex flex-col items-center w-full flex-1">
      {!isSecretGuardedView && (
        <>
          {/* Tribunal Header Panel */}
          <IntelligencePanel className="relative overflow-hidden blacksite-texture-carbon w-full p-4 sm:p-5 mb-4 border-[#963F46]/45">
            <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border/70">
              <OperationPhaseBadge phase="tribunal" round={currentRound} lang={lang} />
              <span className="text-xs font-semibold text-text-muted shrink-0">
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
                ? `الاقتراع السري: ${currentVoter?.name} (${currentVoterIdx + 1}/${votersQueue.length})`
                : `Secret Ballot: ${currentVoter?.name} (${currentVoterIdx + 1}/${votersQueue.length})`}
            </p>

            {/* Voting Mode Segmented Control */}
            <div className="mt-4 max-w-md mx-auto">
              <SegmentedControl
                value={voteMode}
                onChange={handleSwitchMode}
                ariaLabel={lang === 'ar' ? 'نمط التصويت' : 'Voting Mode'}
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
              <PlayerIntelligenceCard className="p-3 flex items-center justify-between">
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
              </PlayerIntelligenceCard>

              <PlayerIntelligenceCard className="p-3 flex items-center justify-between">
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
              </PlayerIntelligenceCard>
            </div>
          </div>

          {/* Mr. Shield Auto-Self Info in Group Vote */}
          {voteMode === 'group' && activeSpecials.includes('protector') && (
            <div className="w-full mb-4">
              <div
                className={`w-full py-2.5 px-4 rounded-[10px] border text-cyan-text text-xs font-semibold flex items-center justify-center gap-2 ${shieldVisual.tintBgClass}`}
              >
                <BlacksiteIcon name="shieldProtection" size={16} className="shrink-0" />
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
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <StatusIndicator tone="crimson">
                  {lang === 'ar'
                    ? `صوت ${currentVoter.name} (${currentVoterIdx + 1} / ${votersQueue.length})${
                        currentVoter.isEliminated ? ' · Mr. Ghost' : ''
                      }`
                    : `${currentVoter.name}'s vote (${currentVoterIdx + 1}/${votersQueue.length})`}
                </StatusIndicator>
              </div>

              {isCurrentVoterShieldHolder && (
                <div className={`border rounded-[12px] p-3.5 text-start ${shieldVisual.tintBgClass}`}>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 text-cyan-text text-xs font-bold">
                      <BlacksiteIcon name="shieldProtection" size={16} />
                      <span>
                        {lang === 'ar'
                          ? 'قدرة Mr. Shield (لمرة واحدة): احمِ لاعباً هذه الجولة'
                          : 'Mr. Shield (One-Time): Guard a player this round'}
                      </span>
                    </div>
                    {shieldedTargetId !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setShieldedTargetId(null);
                        }}
                        className="text-xs font-bold text-danger-text hover:underline min-h-[44px] px-2.5"
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
                          type="button"
                          onClick={() => {
                            playSound(isGuarded ? 'click' : 'abilityActivate');
                            setShieldedTargetId(isGuarded ? null : target.id);
                          }}
                          className={`min-h-[44px] px-3 py-1.5 rounded-[8px] border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
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
                const isSelected = selectedPlayerId === p.id;
                const isGuardedByCurrentShield =
                  isCurrentVoterShieldHolder && shieldedTargetId === p.id;
                const playerClues = descriptionsLog.filter((d) => d.playerId === p.id);
                const latestClue = playerClues[playerClues.length - 1];

                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    disabled={isSelfInSecret || isClosingBallot}
                    whileTap={prefersReducedMotion || isSelfInSecret ? undefined : { scale: 0.97 }}
                    onClick={() => handleSuspectSelect(p.id)}
                    className={`group text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#963F46]/70 rounded-[12px] ${
                      isSelfInSecret ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <PlayerIntelligenceCard
                      className={`p-3.5 flex flex-col items-center justify-between min-h-[154px] transition-colors ${
                        isSelected
                          ? 'border-[#963F46] bg-[#963F46]/15'
                          : isGuardedByCurrentShield
                          ? 'border-[#668F9A] bg-[#668F9A]/12'
                          : !isSelfInSecret
                          ? 'group-hover:border-[#963F46]/65 group-hover:bg-[#963F46]/10'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col items-center w-full">
                        <Avatar avatar={p.avatar} name={p.name} size={60} />
                        <span className="mt-2.5 text-sm font-bold text-text-main truncate max-w-full">
                          {p.name}
                        </span>
                        {latestClue ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-text-muted max-w-full truncate">
                            <MessageSquare size={10} className="shrink-0 text-cyan-text" />
                            <span className="truncate">"{latestClue.text}"</span>
                          </span>
                        ) : descriptionsLog.length > 0 ? (
                          <span className="mt-1 text-[11px] font-mono-code text-text-muted tabular-nums">
                            0 {lang === 'ar' ? 'أوصاف' : 'clues'}
                          </span>
                        ) : null}
                      </div>

                      <div className="w-full mt-2.5 pt-2 border-t border-border/60 flex items-center justify-center gap-1.5">
                        {isGuardedByCurrentShield ? (
                          <span className="inline-flex items-center gap-1 text-cyan-text text-[11px] font-bold">
                            <BlacksiteIcon name="shieldProtection" size={13} />
                            <span>{lang === 'ar' ? 'محمي بالدرع' : 'Shielded'}</span>
                          </span>
                        ) : !isSelfInSecret ? (
                          <span className="inline-flex items-center gap-1.5 text-danger-text text-[11px] font-bold tracking-wide">
                            <BlacksiteIcon name="secretVote" size={13} />
                            <span>{lang === 'ar' ? 'تصويت للاستبعاد' : 'Cast Ballot'}</span>
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px] font-semibold">
                            {lang === 'ar' ? 'أنت' : 'You'}
                          </span>
                        )}
                      </div>
                    </PlayerIntelligenceCard>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </>
      )}
      </div>

      {/* Opaque Pass Phone Overlay for Secret Ballot */}
      <AnimatePresence>
        {isSecretGuardedView && currentVoter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            className="fixed inset-0 z-50 bg-bg-dark flex items-center justify-center p-5"
          >
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                ariaLabel={
                  lang === 'ar'
                    ? `تسليم الاقتراع السري للاعب ${currentVoter.name}`
                    : `Secret ballot handoff for ${currentVoter.name}`
                }
                className="relative p-7 text-center flex flex-col items-center border-[#963F46]/45"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#963F46]/75 to-transparent"
                />
                <div className="w-full flex items-center justify-between mb-5">
                  <ClassifiedStamp tone="crimson">SECRET BALLOT</ClassifiedStamp>
                  <ClassifiedStamp tone="neutral">
                    {currentVoterIdx + 1}/{votersQueue.length}
                  </ClassifiedStamp>
                </div>

                <div className="w-14 h-14 rounded-[12px] bg-[#963F46]/15 border border-[#963F46]/35 flex items-center justify-center mb-4">
                  <Smartphone size={26} className="text-danger-text" />
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">
                  {t('passPhoneTo', { name: currentVoter.name })}
                </h3>
                <p className="text-xs font-medium text-text-muted mb-3">
                  {lang === 'ar'
                    ? 'تصويتك سري تماماً · تأكد من عدم مشاهدة الآخرين'
                    : 'Your ballot is strictly confidential. Keep the screen private.'}
                </p>

                {(currentVoter.specialRole === 'ghost' || currentVoter.role === 'ghost') &&
                  currentVoter.isEliminated && (
                    <StatusIndicator tone="cyan" className="mb-3">
                      {lang === 'ar'
                        ? 'قدرة Mr. Ghost: لا يزال بإمكانك التصويت!'
                        : 'Mr. Ghost Power: You can still vote!'}
                    </StatusIndicator>
                  )}

                <div className="my-4 p-2 rounded-[16px] bg-bg-card/80 border border-border">
                  <Avatar avatar={currentVoter.avatar} name={currentVoter.name} size={78} />
                </div>
                <TacticalButton
                  onClick={() => {
                    playSound('handoff');
                    setSelectedPlayerId(null);
                    setIsPassingVoter(false);
                  }}
                  variant="danger"
                  size="lg"
                  fullWidth
                  icon={<Lock size={16} />}
                >
                  {t('iAm', { name: currentVoter.name })}
                </TacticalButton>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ballot Confirmation Modal */}
      <AnimatePresence>
        {selectedPlayerId !== null && !isSecretGuardedView && !isClosingBallot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B10]/88 p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                onClose={() => setSelectedPlayerId(null)}
                ariaLabel={lang === 'ar' ? 'تأكيد التصويت' : 'Confirm Vote'}
                className="p-6 text-center border-[#963F46]/45"
              >
                <div className="flex items-center justify-between mb-4">
                  <ClassifiedStamp tone="crimson">CAST BALLOT</ClassifiedStamp>
                  {voteMode === 'secret' && currentVoter && (
                    <span className="text-xs font-bold text-text-muted truncate max-w-[140px]">
                      {currentVoter.name}
                    </span>
                  )}
                </div>

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

      {/* Ballot Sealed Transition Overlay */}
      <AnimatePresence>
        {isClosingBallot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-dark/96 flex items-center justify-center p-5"
          >
            <ModalShell
              ariaLabel={lang === 'ar' ? 'إغلاق صندوق الاقتراع' : 'Ballot Sealed'}
              className="p-7 text-center flex flex-col items-center gap-3 border-[#B49A62]/45 blacksite-texture-carbon"
            >
              <img
                src={BLACKSITE_TEXTURES.confidentialStamp}
                alt=""
                aria-hidden="true"
                className="w-28 h-14 object-contain opacity-45"
              />
              <ClassifiedStamp tone="gold">BALLOT SEALED</ClassifiedStamp>
              <p className="text-sm font-bold text-text-main">
                {lang === 'ar'
                  ? 'تم ختم الأصوات · جاري فرز النتيجة...'
                  : lang === 'fr'
                  ? 'Urne scellée · Dépouillement...'
                  : 'Ballots sealed · Tallying verdict...'}
              </p>
            </ModalShell>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
