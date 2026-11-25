import React, { useState, useEffect } from 'react';
import { DescriptionEntry, GameMode, Player, SpecialRoleId } from '../types';
import { playSound } from '../services/soundService';
import { getSettings, hasPlayerPerk } from '../services/storageService';
import { Avatar } from './Avatar';
import {
  ArrowDown,
  ArrowRight,
  Vote,
  RefreshCw,
  MessageSquare,
  HelpCircle,
  Eye,
  EyeOff,
  FileText,
  Play,
  Send,
  X,
  Sparkles,
  Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUITranslation } from '../translations';
import {
  getRoleAsset,
  getRoleTitle,
  getRoleVisualIdentity,
  getSpecialRoleDescription,
} from '../data/specialRoles';
import { HERO_ASSETS } from '../src/design/assetRegistry';
import {
  ClassifiedStamp,
  IconButton,
  IntelligencePanel,
  ModalShell,
  OperationPhaseBadge,
  TacticalButton,
} from './ui/BlacksiteUI';

interface QuestionPhaseProps {
  players: Player[];
  onTimeUp: () => void;
  gameMode?: GameMode;
  difficulty?: 'easy' | 'hard';
  currentRound?: number;
  turnDurationSeconds?: number;
  secretWord?: string;
  undercoverWord?: string;
  descriptionsLog?: DescriptionEntry[];
  onAddDescription?: (entry: DescriptionEntry) => void;
}

export const QuestionPhase: React.FC<QuestionPhaseProps> = ({
  players,
  onTimeUp,
  gameMode = 'expression',
  difficulty = 'easy',
  currentRound = 1,
  turnDurationSeconds = 45,
  secretWord = '',
  undercoverWord = '',
  descriptionsLog = [],
  onAddDescription,
}) => {
  const [asker, setAsker] = useState<Player | null>(null);
  const [target, setTarget] = useState<Player | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [nextPlayer, setNextPlayer] = useState<Player | null>(null);
  const [roundCount, setRoundCount] = useState(0);
  const [expressionSequence, setExpressionSequence] = useState<Player[]>([]);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showSpecialRolesModal, setShowSpecialRolesModal] = useState(false);
  const [peekPlayer, setPeekPlayer] = useState<Player | null>(null);
  const [isPeekHandoffConfirmed, setIsPeekHandoffConfirmed] = useState(false);
  const [isPeekingWord, setIsPeekingWord] = useState(false);
  const [showPeekPicker, setShowPeekPicker] = useState(false);
  const [clueInput, setClueInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(turnDurationSeconds);

  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string, params?: Record<string, string>) =>
    getUITranslation(lang, key, params);

  const alivePlayers = players.filter((p) => !p.isEliminated);
  const mrWhiteCount = alivePlayers.filter((p) => p.role === 'mrwhite').length;
  const undercoverCount = alivePlayers.filter((p) => p.role === 'undercover').length;
  const activeSpecials = Array.from(
    new Set(
      players
        .map((p) => p.specialRole)
        .filter((r): r is SpecialRoleId => Boolean(r))
    )
  );

  const loversList = players.filter(
    (p) => p.specialRole === 'lovers' || p.role === 'lovers'
  );
  const hasActiveLovers = loversList.length >= 2 && currentRound === 1;
  const [showLoversReminder, setShowLoversReminder] = useState<boolean>(hasActiveLovers);

  useEffect(() => {
    setExpressionSequence([]);
    setCurrentSequenceIndex(0);
    setRoundCount(0);
    setShowPrompt(false);
    setAsker(null);
    setTarget(null);
    pickNewTurn(undefined, true);
  }, [currentRound]);

  useEffect(() => {
    if (isPaused || showPrompt || showLoversReminder || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0 && prev === 1) {
          playSound('timeUp');
        } else if (next > 0 && next <= 10) {
          playSound('tick');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused, showPrompt, showLoversReminder]);

  const pickNewTurn = (previousTarget?: Player, forceFreshSequence = false) => {
    if (gameMode === 'expression') {
      const aliveIds = new Set(alivePlayers.map((p) => p.id));
      let sequence = forceFreshSequence
        ? []
        : expressionSequence.filter((p) => aliveIds.has(p.id));
      let nextIdx: number;

      if (sequence.length === 0) {
        const shuffled = [...alivePlayers].sort(() => 0.5 - Math.random());
        // Yanstar Official Rule: Mr. White NEVER goes first in Round 1
        if (currentRound === 1 && shuffled[0]?.role === 'mrwhite') {
          const nonMrWhiteIdx = shuffled.findIndex((p) => p.role !== 'mrwhite');
          if (nonMrWhiteIdx !== -1) {
            [shuffled[0], shuffled[nonMrWhiteIdx]] = [shuffled[nonMrWhiteIdx], shuffled[0]];
          }
        }
        sequence = shuffled;
        setExpressionSequence(shuffled);
        nextIdx = 0;
      } else {
        setExpressionSequence(sequence);
        nextIdx = (currentSequenceIndex + 1) % sequence.length;
      }

      const newCurrent = sequence[nextIdx];
      const nextInSeqIdx = (nextIdx + 1) % sequence.length;
      const newNext = sequence[nextInSeqIdx];

      const extraSeconds = newCurrent && hasPlayerPerk(newCurrent.name, 'extra_time') ? 15 : 0;
      setTimeLeft(turnDurationSeconds + extraSeconds);

      setCurrentPlayer(newCurrent);
      setNextPlayer(newNext);
      setCurrentSequenceIndex(nextIdx);

      const newRoundCount = roundCount + 1;
      setRoundCount(newRoundCount);

      if (newRoundCount > 1 && newRoundCount % sequence.length === 0) {
        setShowPrompt(true);
      }
      return;
    }

    let newAsker = previousTarget;
    if (!newAsker || newAsker.isEliminated) {
      const firstPool =
        currentRound === 1
          ? alivePlayers.filter((p) => p.role !== 'mrwhite')
          : alivePlayers;
      const poolToPick = firstPool.length > 0 ? firstPool : alivePlayers;
      newAsker = poolToPick[Math.floor(Math.random() * poolToPick.length)];
    }

    const potentialTargets = alivePlayers.filter((p) => p.id !== newAsker!.id);
    const newTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];

    const extraSeconds = newAsker && hasPlayerPerk(newAsker.name, 'extra_time') ? 15 : 0;
    setTimeLeft(turnDurationSeconds + extraSeconds);

    setAsker(newAsker);
    setTarget(newTarget);

    const newRoundCount = roundCount + 1;
    setRoundCount(newRoundCount);

    if (newRoundCount > 1 && newRoundCount % alivePlayers.length === 0) {
      setShowPrompt(true);
    }
  };

  const handleSaveClueAndNext = () => {
    const speaker = gameMode === 'expression' ? currentPlayer : asker;
    if (clueInput.trim() && speaker && onAddDescription) {
      onAddDescription({
        playerId: speaker.id,
        playerName: speaker.name,
        playerAvatar: speaker.avatar,
        round: currentRound,
        text: clueInput.trim(),
      });
    }
    setClueInput('');
    playSound('click');
    if (showPrompt) setShowPrompt(false);
    if (gameMode === 'expression') {
      pickNewTurn(nextPlayer || undefined);
    } else {
      pickNewTurn(target || undefined);
    }
  };

  const handleContinueAsking = () => {
    playSound('pop');
    setShowPrompt(false);
    if (gameMode === 'expression') {
      pickNewTurn(nextPlayer || undefined);
    } else {
      pickNewTurn(target || undefined);
    }
  };

  const handleFinish = () => {
    playSound('click');
    onTimeUp();
  };

  const activeSpeaker = gameMode === 'expression' ? currentPlayer : asker;
  if (gameMode === 'expression' && (!currentPlayer || !nextPlayer)) return null;
  if (gameMode === 'question' && (!asker || !target)) return null;

  const getPlayerSecretWord = (p: Player) => {
    if (p.role === 'mrwhite') return null;
    if (p.role === 'undercover') return undercoverWord;
    return secretWord;
  };

  const peekLoverPartner =
    peekPlayer?.loverPartnerId !== undefined
      ? players.find((other) => other.id === peekPlayer.loverPartnerId)
      : null;

  return (
    <div className="flex flex-col min-h-full items-center animate-fade-in pb-28 relative max-w-4xl mx-auto w-full px-4 pt-3">
      {/* Tactical Turn Header */}
      <IntelligencePanel
        className={`w-full px-4 py-4 mb-4 ${
          gameMode === 'question' ? 'border-border-strong' : 'border-[#668F9A]/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Countdown Timer Control */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Resume' : 'Pause'}
              className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-[10px] border flex items-center justify-center font-mono-code font-bold text-base tabular-nums transition-colors ${
                timeLeft <= 10
                  ? 'border-[#963F46] text-danger-text bg-[#963F46]/15'
                  : 'border-border-strong text-text-main bg-bg-card hover:border-[#668F9A]'
              }`}
            >
              {isPaused ? <Play size={18} /> : timeLeft}
            </button>
            {activeSpeaker && hasPlayerPerk(activeSpeaker.name, 'extra_time') && (
              <span className="text-[10px] font-mono-code font-bold text-emerald-text bg-[#3E7B67]/15 border border-[#3E7B67]/35 px-1.5 py-0.5 rounded-[4px] tabular-nums">
                +15s
              </span>
            )}
          </div>

          <div className="text-center min-w-0 flex-1">
            <div className="flex items-center justify-center mb-1">
              <OperationPhaseBadge
                phase={gameMode === 'question' ? 'interrogation' : 'active'}
                round={currentRound}
                lang={lang}
              />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-text-main truncate">
              {gameMode === 'expression'
                ? lang === 'ar'
                  ? 'يصف الآن...'
                  : 'Describing now...'
                : t('questionTime')}
            </h2>
            {activeSpeaker && (
              <p className="text-sm font-bold text-primary-text mt-0.5 truncate">
                {activeSpeaker.name}
              </p>
            )}
          </div>

          <IconButton
            onClick={() => setShowInfo(!showInfo)}
            variant="secondary"
            aria-label="Info"
          >
            <HelpCircle size={18} />
          </IconButton>
        </div>

        {showInfo && (
          <p className="text-center text-xs font-medium text-text-muted bg-bg-card border border-border rounded-[10px] p-2.5 mt-3">
            {gameMode === 'expression' ? t('describeSmartly') : t('answerSmartly')}
          </p>
        )}
      </IntelligencePanel>

      {/* Status Row: Active Special Powers + Remaining Infiltrators */}
      <div className="w-full mb-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => activeSpecials.length > 0 && setShowSpecialRolesModal(true)}
            className="rounded-[14px] bg-bg-surface border border-border-strong p-3 flex items-center justify-between shadow-sm hover:border-[#668F9A]/50 transition-colors text-start min-h-[56px]"
          >
            <div>
              <span className="text-[11px] font-semibold text-text-muted block">
                {t('specialRoles')}
              </span>
              <span className="text-xs font-bold text-text-main tabular-nums">
                {activeSpecials.length > 0
                  ? `${activeSpecials.length} ${lang === 'ar' ? 'مُفعّلة' : 'Active'}`
                  : t('none')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {activeSpecials.length > 0 ? (
                activeSpecials.slice(0, 3).map((r) => (
                  <img
                    key={r}
                    src={getRoleAsset(r)}
                    alt={getRoleTitle(r, lang)}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-[6px] bg-[#080B10] border border-border-strong object-cover"
                  />
                ))
              ) : (
                <Sparkles size={18} className="text-text-muted opacity-50" />
              )}
            </div>
          </button>

          <IntelligencePanel className="p-3 flex items-center justify-between min-h-[56px]">
            <div className="text-start">
              <span className="text-[11px] font-semibold text-text-muted block">
                {t('remainingIntruders')}
              </span>
              <span className="text-xs font-bold text-text-main tabular-nums">
                {undercoverCount + mrWhiteCount}{' '}
                {difficulty === 'hard'
                  ? lang === 'ar'
                    ? 'دخلاء (وضع صعب)'
                    : 'Hidden (Hard)'
                  : lang === 'ar'
                  ? 'دخلاء'
                  : 'Left'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {difficulty === 'hard' ? (
                <HelpCircle size={18} className="text-danger-text" />
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
                        className="w-6 h-6 rounded-[6px] bg-[#080B10] object-cover border border-[#A46F44]/50"
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
                        className="w-6 h-6 rounded-[6px] bg-[#080B10] object-cover border border-[#B49A62]/50"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </IntelligencePanel>
        </div>
      </div>

      {/* Tabletop Arena Grid */}
      <div className="w-full mb-4">
        <div className="relative rounded-[14px] overflow-hidden border border-[#B49A62]/30 shadow-[0_16px_40px_rgba(4,7,12,0.45)] p-4 sm:p-6">
          <img
            src={HERO_ASSETS.tableBackdrop}
            alt="Game Table"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-[#080B10]/72" />

          <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 gap-3.5 sm:gap-5 justify-items-center">
            {players.map((p) => {
              const isActiveSpeaker = activeSpeaker?.id === p.id;
              const isTargetPlayer = gameMode === 'question' && target?.id === p.id;
              const playerClues = descriptionsLog.filter((d) => d.playerId === p.id);
              const latestClue = playerClues[playerClues.length - 1];

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col items-center transition-opacity ${
                    p.isEliminated ? 'opacity-40 grayscale' : ''
                  }`}
                >
                  {isActiveSpeaker && !p.isEliminated && (
                    <div className="absolute -top-2 -right-1 z-20 px-2 py-0.5 rounded-[5px] bg-[#668F9A] text-[#080B10] font-mono-code text-[10px] font-bold shadow">
                      SPEAKING
                    </div>
                  )}
                  {isTargetPlayer && !p.isEliminated && (
                    <div className="absolute -top-2 -right-1 z-20 px-2 py-0.5 rounded-[5px] bg-[#963F46] text-[#F4F6F8] font-mono-code text-[10px] font-bold shadow">
                      TARGET
                    </div>
                  )}

                  <div
                    className={`rounded-[14px] p-1 transition-all ${
                      isActiveSpeaker
                        ? 'ring-2 ring-[#668F9A] bg-[#668F9A]/15'
                        : isTargetPlayer
                        ? 'ring-2 ring-[#963F46] bg-[#963F46]/15'
                        : ''
                    }`}
                  >
                    <Avatar avatar={p.avatar} name={p.name} size={60} />
                  </div>

                  <span
                    className={`mt-1.5 px-2.5 py-0.5 rounded-[6px] text-xs font-bold truncate max-w-[96px] border ${
                      p.isEliminated
                        ? 'bg-[#0D1219]/90 border-white/10 text-[#A8B1BA] line-through'
                        : isActiveSpeaker
                        ? 'bg-[#668F9A] border-[#8CB3BE]/50 text-[#080B10]'
                        : 'bg-[#0D1219]/90 border-white/15 text-[#ECEFF4]'
                    }`}
                  >
                    {p.name}
                  </span>

                  {latestClue && (
                    <span className="mt-1 text-[11px] font-medium text-[#D4BE8A] bg-[#080B10]/85 border border-[#B49A62]/30 px-2 py-0.5 rounded-[6px] max-w-[100px] truncate">
                      "{latestClue.text}"
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Turn Card + Quick Clue Input */}
      <IntelligencePanel className="w-full p-4 mb-4 space-y-3">
        {gameMode === 'question' && asker && target ? (
          <div className="flex items-center justify-around gap-3 py-1">
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-cyan-text mb-1">{t('asker')}</span>
              <Avatar avatar={asker.avatar} name={asker.name} size={52} showName />
            </div>
            <ArrowDown size={22} className="text-text-muted -rotate-90 rtl:rotate-90" />
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-danger-text mb-1">{t('target')}</span>
              <Avatar avatar={target.avatar} name={target.name} size={52} showName />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[8px] bg-[#668F9A]/15 border border-[#668F9A]/35 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-cyan-text" />
              </div>
              <div className="min-w-0 text-start">
                <p className="text-[11px] font-semibold text-text-muted">
                  {lang === 'ar' ? 'دور الوصف الحالي' : 'Current Speaker'}
                </p>
                <p className="text-base font-bold text-text-main truncate">
                  {currentPlayer?.name}
                  {(currentPlayer?.specialRole === 'mr_meme' ||
                    currentPlayer?.role === 'mr_meme') && (
                    <span className="text-xs text-primary-text mx-2">
                      ({lang === 'ar' ? 'تمثيل صامت فقط!' : 'Mime only!'})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <ClassifiedStamp tone="neutral">
              {currentSequenceIndex + 1}/{expressionSequence.length}
            </ClassifiedStamp>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={clueInput}
            onChange={(e) => setClueInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveClueAndNext();
            }}
            placeholder={
              lang === 'ar'
                ? `اكتب وصف ${activeSpeaker?.name || ''} (اختياري)...`
                : `Log ${activeSpeaker?.name || ''}'s clue (optional)...`
            }
            className="flex-1 bg-bg-card border border-border-strong rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-text-main placeholder-text-muted outline-none focus:border-[#668F9A] min-h-[44px]"
          />
          <TacticalButton
            onClick={handleSaveClueAndNext}
            variant="cyan"
            size="md"
            trailingIcon={
              clueInput.trim() ? <Send size={15} /> : <ArrowRight size={15} className="rtl:rotate-180" />
            }
          >
            {lang === 'ar' ? 'التالي' : 'Next'}
          </TacticalButton>
        </div>
      </IntelligencePanel>

      {/* Bottom Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg-surface/95 backdrop-blur-xl border-t border-border-strong px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
          <div className="relative shrink-0">
            <IconButton
              onClick={() => {
                playSound('click');
                setShowLogModal(true);
              }}
              variant="secondary"
              aria-label={lang === 'ar' ? 'سجل الأوصاف' : 'Descriptions Log'}
              title={lang === 'ar' ? 'سجل الأوصاف' : 'Descriptions Log'}
            >
              <FileText size={18} />
            </IconButton>
            {descriptionsLog.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-[5px] bg-[#B49A62] text-[#080B10] font-mono-code text-[10px] font-bold flex items-center justify-center tabular-nums">
                {descriptionsLog.length}
              </span>
            )}
          </div>

          <TacticalButton
            onClick={() => {
              playSound('click');
              setShowPeekPicker(true);
            }}
            variant="secondary"
            size="md"
            className="flex-1"
            icon={<Eye size={16} className="text-cyan-text" />}
          >
            {lang === 'ar' ? 'عرض كلمتي السرية' : 'Peek My Word'}
          </TacticalButton>

          <TacticalButton
            onClick={handleFinish}
            variant="danger"
            size="md"
            icon={<Vote size={16} />}
          >
            {lang === 'ar' ? 'تصويت' : 'Vote'}
          </TacticalButton>
        </div>
      </div>

      {/* Lovers Mutual Reveal Reminder (Round 1 only, non-spoiling) */}
      <AnimatePresence>
        {showLoversReminder && (
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
              <ModalShell
                ariaLabel={
                  lang === 'ar' ? 'تذكير العشاق' : 'Lovers Mutual Reveal Reminder'
                }
                className="border-[#A8826B]/45 p-6 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-[12px] bg-[#080B10] border border-[#A8826B]/45 flex items-center justify-center overflow-hidden">
                  <img
                    src={getRoleAsset('lovers')}
                    alt={getRoleTitle('lovers', lang)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#A8826B]/40 bg-[#A8826B]/15 text-[#C8A189] text-xs font-bold mb-2">
                  <Heart size={12} className="fill-current" />
                  <span>{getRoleTitle('lovers', lang)}</span>
                </div>

                <h3 className="text-lg font-bold text-text-main mb-2">
                  {lang === 'ar'
                    ? 'تذكير العشاق قبل بدء الجولة'
                    : 'Lovers Mutual Reveal Reminder'}
                </h3>

                <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed mb-6">
                  {lang === 'ar'
                    ? 'يوجد عاشقان في هذه الجولة! قبل البدء بالوصف، يمكن لكل لاعب تفقد كلمته السرية سراً لمعرفة اسم شريكه.'
                    : 'There are 2 Lovers in this round! Before speaking begins, players can secretly check "Peek My Word" to see who their partner is.'}
                </p>

                <div className="flex flex-col gap-2.5">
                  <TacticalButton
                    onClick={() => {
                      playSound('dossierOpen');
                      setShowPeekPicker(true);
                    }}
                    variant="secondary"
                    size="md"
                    fullWidth
                    icon={<Eye size={16} />}
                  >
                    {lang === 'ar' ? 'فحص سري لمعرفة الشريك' : 'Secretly Peek Partner'}
                  </TacticalButton>

                  <TacticalButton
                    onClick={() => {
                      playSound('pop');
                      setShowLoversReminder(false);
                    }}
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<Play size={16} />}
                  >
                    {lang === 'ar' ? 'جاهزون · ابدأ الجولة' : 'Ready · Start Round'}
                  </TacticalButton>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round Cycle Complete Prompt */}
      <AnimatePresence>
        {showPrompt && (
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
              <ModalShell
                ariaLabel={
                  gameMode === 'expression' ? t('enoughExpressions') : t('enoughQuestions')
                }
                className="p-6 text-center"
              >
                <h3 className="text-xl font-bold text-text-main mb-2">
                  {gameMode === 'expression' ? t('enoughExpressions') : t('enoughQuestions')}
                </h3>
                <p className="text-text-muted mb-6 text-xs sm:text-sm font-medium">
                  {t('continueOrVote')}
                </p>

                <div className="flex flex-col gap-2.5">
                  <TacticalButton
                    onClick={handleFinish}
                    variant="danger"
                    size="lg"
                    fullWidth
                    icon={<Vote size={18} />}
                  >
                    {t('goToVote')}
                  </TacticalButton>
                  <TacticalButton
                    onClick={handleContinueAsking}
                    variant="cyan"
                    size="lg"
                    fullWidth
                    icon={<RefreshCw size={18} />}
                  >
                    {gameMode === 'expression' ? t('continueExpressing') : t('continueAsking')}
                  </TacticalButton>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Descriptions Log Modal */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogModal(false)}
            className="fixed inset-0 z-50 bg-[#080B10]/80 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <ModalShell
                onClose={() => setShowLogModal(false)}
                ariaLabel={lang === 'ar' ? 'سجل الوصف' : 'Descriptions Log'}
                className="max-h-[80vh] flex flex-col"
              >
                <div className="bg-bg-card border-b border-border px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClassifiedStamp tone="cyan">LOG</ClassifiedStamp>
                    <h3 className="text-base font-bold text-text-main">
                      {lang === 'ar' ? 'سجل الوصف' : 'Descriptions'}
                    </h3>
                  </div>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowLogModal(false)}
                    aria-label={t('close')}
                  >
                    <X size={16} />
                  </IconButton>
                </div>

                <div className="flex-1 overflow-y-auto p-4 divide-y divide-border">
                  {descriptionsLog.length === 0 ? (
                    <p className="text-center text-sm font-medium text-text-muted py-10">
                      {lang === 'ar'
                        ? 'لم يتم تسجيل أي وصف مكتوب بعد.'
                        : 'No written clues recorded yet.'}
                    </p>
                  ) : (
                    players.map((p) => {
                      const entries = descriptionsLog.filter((e) => e.playerId === p.id);
                      if (entries.length === 0) return null;
                      return (
                        <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="space-y-1 text-start flex-1">
                            {entries.map((entry, idx) => (
                              <p key={idx} className="text-sm font-medium text-text-main">
                                — {entry.text}
                              </p>
                            ))}
                          </div>
                          <div className="flex flex-col items-center shrink-0">
                            <Avatar avatar={p.avatar} name={p.name} size={40} />
                            <span className="text-xs font-semibold text-text-muted mt-1">
                              {p.name}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Special Roles Info Modal */}
      <AnimatePresence>
        {showSpecialRolesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSpecialRolesModal(false)}
            className="fixed inset-0 z-50 bg-[#080B10]/80 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <ModalShell
                onClose={() => setShowSpecialRolesModal(false)}
                ariaLabel={t('specialRoles')}
                className="p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-main">{t('specialRoles')}</h3>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSpecialRolesModal(false)}
                    aria-label={t('close')}
                  >
                    <X size={16} />
                  </IconButton>
                </div>
                {activeSpecials.map((role) => {
                  const rv = getRoleVisualIdentity(role, lang);
                  return (
                    <div
                      key={role}
                      className={`flex items-center gap-3 p-3 rounded-[10px] border ${rv.tintBgClass}`}
                    >
                      <div
                        className={`w-11 h-11 rounded-[8px] bg-[#080B10] border ${rv.frameBorderClass} shrink-0 overflow-hidden flex items-center justify-center`}
                      >
                        <img
                          src={getRoleAsset(role)}
                          alt={getRoleTitle(role, lang)}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-start min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-text-main truncate">
                            {getRoleTitle(role, lang)}
                          </h4>
                          <ClassifiedStamp tone={rv.stampTone}>{rv.stamp}</ClassifiedStamp>
                        </div>
                        <p className="text-xs font-medium text-text-muted">
                          {getSpecialRoleDescription(role, lang)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Secret Word & Special Power Peek Modal */}
      <AnimatePresence>
        {showPeekPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowPeekPicker(false);
              setPeekPlayer(null);
              setIsPeekHandoffConfirmed(false);
              setIsPeekingWord(false);
            }}
            className="fixed inset-0 z-50 bg-bg-dark/98 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <ModalShell
                onClose={() => {
                  setShowPeekPicker(false);
                  setPeekPlayer(null);
                  setIsPeekHandoffConfirmed(false);
                  setIsPeekingWord(false);
                }}
                ariaLabel={lang === 'ar' ? 'عرض الكلمة السرية' : 'Peek Secret Word'}
                className="p-6 text-center"
              >
                {!peekPlayer ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-text-main">
                        {lang === 'ar' ? 'من يريد تفقد كلمته؟' : 'Who wants to peek?'}
                      </h3>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPeekPicker(false)}
                        aria-label={t('close')}
                      >
                        <X size={16} />
                      </IconButton>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 max-h-72 overflow-y-auto">
                      {alivePlayers.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            playSound('click');
                            setPeekPlayer(p);
                            setIsPeekHandoffConfirmed(false);
                            setIsPeekingWord(false);
                          }}
                          className="p-2.5 rounded-[10px] bg-bg-card hover:border-[#668F9A]/50 border border-border flex flex-col items-center gap-1.5 transition-colors min-h-[84px]"
                        >
                          <Avatar avatar={p.avatar} name={p.name} size={42} />
                          <span className="text-xs font-bold text-text-main truncate max-w-full">
                            {p.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : !isPeekHandoffConfirmed ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-4">
                      <ClassifiedStamp tone="cyan">CONFIDENTIAL HANDOFF</ClassifiedStamp>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPeekPlayer(null);
                          setIsPeekHandoffConfirmed(false);
                          setIsPeekingWord(false);
                        }}
                        aria-label={t('close')}
                      >
                        <X size={16} />
                      </IconButton>
                    </div>
                    <Avatar avatar={peekPlayer.avatar} name={peekPlayer.name} size={74} />
                    <h3 className="text-lg font-bold text-text-main mt-3 mb-1.5">
                      {t('passPhoneToNext', { name: peekPlayer.name })}
                    </h3>
                    <p className="text-xs font-medium text-text-muted mb-5 leading-relaxed">
                      {lang === 'ar'
                        ? 'تأكد أن الشاشة بعيدة عن أعين الآخرين قبل فتح الملف.'
                        : 'Ensure nobody else can see the screen before unlocking.'}
                    </p>
                    <TacticalButton
                      onClick={() => {
                        playSound('handoff');
                        setIsPeekHandoffConfirmed(true);
                      }}
                      variant="cyan"
                      size="lg"
                      fullWidth
                    >
                      {t('iAmNext', { name: peekPlayer.name })}
                    </TacticalButton>
                  </div>
                ) : (
                  <>
                    <Avatar avatar={peekPlayer.avatar} name={peekPlayer.name} size={68} />
                    <h3 className="text-lg font-bold text-text-main mt-3 mb-1.5">
                      {peekPlayer.name}
                    </h3>
                    <p className="text-xs font-medium text-text-muted mb-5">
                      {lang === 'ar'
                        ? 'اضغط على أيقونة العين لعرض كلمتك السرية'
                        : 'Tap the eye button to reveal your secret word'}
                    </p>

                    <div className="bg-bg-card border border-border-strong rounded-[12px] p-4 mb-4 flex items-center justify-between gap-3">
                      <div className="text-start min-w-0">
                        <span className="text-xs font-semibold text-text-muted block">
                          {lang === 'ar' ? 'كلمتك السرية' : 'Secret Word'}
                        </span>
                        <span className="text-lg font-bold text-text-main">
                          {isPeekingWord
                            ? getPlayerSecretWord(peekPlayer) ||
                              (lang === 'ar' ? 'أنت Mr. White (بدون كلمة)' : 'You are Mr. White!')
                            : '•••••••'}
                        </span>
                      </div>
                      <TacticalButton
                        onClick={() => {
                          if (!isPeekingWord) playSound('roleReveal');
                          setIsPeekingWord(!isPeekingWord);
                        }}
                        variant="cyan"
                        size="sm"
                        aria-label={isPeekingWord ? 'Hide' : 'Reveal'}
                        icon={isPeekingWord ? <EyeOff size={18} /> : <Eye size={18} />}
                      />
                    </div>

                    {isPeekingWord && peekPlayer.specialRole && (() => {
                      const spVisual = getRoleVisualIdentity(peekPlayer.specialRole, lang);
                      return (
                        <div
                          className={`rounded-[10px] border p-3 mb-4 text-xs font-semibold text-text-main text-start space-y-1 ${spVisual.tintBgClass}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-primary-text">
                              <Sparkles size={13} />
                              <span>{getRoleTitle(peekPlayer.specialRole, lang)}</span>
                            </div>
                            <ClassifiedStamp tone={spVisual.stampTone}>
                              {spVisual.stamp}
                            </ClassifiedStamp>
                          </div>
                          {peekLoverPartner && (
                            <p className="text-[#C8A189] font-bold flex items-center gap-1">
                              <Heart size={12} className="fill-current" />
                              <span>
                                {lang === 'ar'
                                  ? `شريكك السري: ${peekLoverPartner.name}`
                                  : `Your Lover partner: ${peekLoverPartner.name}`}
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <TacticalButton
                      onClick={() => {
                        setPeekPlayer(null);
                        setIsPeekHandoffConfirmed(false);
                        setIsPeekingWord(false);
                        setShowPeekPicker(false);
                      }}
                      variant="primary"
                      size="lg"
                      fullWidth
                    >
                      {lang === 'ar' ? 'أخفِ الكلمة' : 'Hide & Close'}
                    </TacticalButton>
                  </>
                )}
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
