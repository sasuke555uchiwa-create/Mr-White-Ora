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
  getSpecialRoleDescription,
} from '../data/specialRoles';
import { HERO_ASSETS } from '../src/design/assetRegistry';

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
  const [isPeekingWord, setIsPeekingWord] = useState(false);
  const [showPeekPicker, setShowPeekPicker] = useState(false);
  const [clueInput, setClueInput] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(turnDurationSeconds);

  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

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
      let nextIdx = currentSequenceIndex;

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
      // In Round 1, avoid Mr. White starting first
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
    <div className="flex flex-col min-h-full items-center animate-fade-in pb-28 relative max-w-4xl mx-auto w-full">
      {/* Dark Curved Header Banner */}
      <div className="w-full bg-slate-950/90 border-b border-white/10 rounded-b-[2.5rem] px-5 pt-4 pb-6 shadow-2xl mb-4">
        <div className="flex items-center justify-between mb-2">
          {/* Circular Countdown Timer */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Resume' : 'Pause'}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono font-black text-base tabular-nums transition-colors ${
                timeLeft <= 10
                  ? 'border-rose-500 text-rose-400 bg-rose-500/15'
                  : 'border-white/60 text-white bg-white/5'
              }`}
            >
              {isPaused ? <Play size={18} /> : timeLeft}
            </button>
            {activeSpeaker && hasPlayerPerk(activeSpeaker.name, 'extra_time') && (
              <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md tabular-nums">
                ⏱️ +15s
              </span>
            )}
          </div>

          <div className="text-center">
            <span className="text-xs font-black text-sky-400 block">
              {lang === 'ar' ? `الجولة ${currentRound}` : `Round ${currentRound}`}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {gameMode === 'expression'
                ? lang === 'ar'
                  ? 'يصف الآن...'
                  : 'Describing now...'
                : t('questionTime')}
            </h2>
            {activeSpeaker && (
              <p className="text-sm font-black text-amber-300 mt-0.5">{activeSpeaker.name}</p>
            )}
          </div>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
          >
            <HelpCircle size={20} />
          </button>
        </div>

        {showInfo && (
          <p className="text-center text-xs font-bold text-slate-300 bg-white/5 rounded-xl p-2.5 mt-2">
            {gameMode === 'expression' ? t('describeSmartly') : t('answerSmartly')}
          </p>
        )}
      </div>

      {/* Status Row: Active Special Powers + Remaining Infiltrators */}
      <div className="w-full px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => activeSpecials.length > 0 && setShowSpecialRolesModal(true)}
            className="bg-bg-surface/90 border border-border-strong rounded-2xl p-3 flex items-center justify-between shadow-md hover:border-sky-400/40 transition-colors"
          >
            <div className="text-start">
              <span className="text-xs font-black text-text-muted block">
                {t('specialRoles')}
              </span>
              <span className="text-xs font-black text-text-main tabular-nums">
                {activeSpecials.length > 0
                  ? `${activeSpecials.length} ${lang === 'ar' ? 'مُفعّلة' : 'Active'}`
                  : t('none')}
              </span>
            </div>
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {activeSpecials.length > 0 ? (
                activeSpecials.slice(0, 3).map((r) => (
                  <img
                    key={r}
                    src={getRoleAsset(r)}
                    alt={getRoleTitle(r, lang)}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full bg-[#0B1120] border border-white/30 object-cover"
                  />
                ))
              ) : (
                <Sparkles size={20} className="text-text-muted opacity-40" />
              )}
            </div>
          </button>

          <div className="bg-bg-surface/90 border border-border-strong rounded-2xl p-3 flex items-center justify-between shadow-md">
            <div className="text-start">
              <span className="text-xs font-black text-text-muted block">
                {t('remainingIntruders')}
              </span>
              <span className="text-xs font-black text-text-main tabular-nums">
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
                <HelpCircle size={22} className="text-rose-400" />
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
                        className="w-7 h-7 rounded-full bg-[#0B1120] object-cover border border-orange-400/40"
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
                        className="w-7 h-7 rounded-full bg-[#0B1120] object-cover border border-amber-400/50"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Felt Tabletop Arena Grid */}
      <div className="w-full px-4 mb-4">
        <div className="relative rounded-[2rem] overflow-hidden border-2 border-amber-500/25 shadow-2xl p-5 sm:p-6">
          <img
            src={HERO_ASSETS.tableBackdrop}
            alt="Game Table"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]" />

          <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-5 justify-items-center">
            {players.map((p) => {
              const isActiveSpeaker = activeSpeaker?.id === p.id;
              const isTargetPlayer = gameMode === 'question' && target?.id === p.id;
              const playerClues = descriptionsLog.filter((d) => d.playerId === p.id);
              const latestClue = playerClues[playerClues.length - 1];

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col items-center transition-all ${
                    p.isEliminated ? 'opacity-40 grayscale' : isActiveSpeaker ? 'scale-105' : ''
                  }`}
                >
                  {isActiveSpeaker && !p.isEliminated && (
                    <div className="absolute -top-3 -right-1 z-20 px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-xs font-black shadow-lg">
                      ...
                    </div>
                  )}
                  {isTargetPlayer && !p.isEliminated && (
                    <div className="absolute -top-3 -right-1 z-20 px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black shadow-lg">
                      ?
                    </div>
                  )}

                  <div
                    className={`rounded-full p-1 transition-all ${
                      isActiveSpeaker
                        ? 'ring-4 ring-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.45)]'
                        : isTargetPlayer
                        ? 'ring-4 ring-rose-400'
                        : ''
                    }`}
                  >
                    <Avatar avatar={p.avatar} name={p.name} size={64} />
                  </div>

                  <span
                    className={`mt-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black truncate max-w-[96px] shadow-sm ${
                      p.isEliminated
                        ? 'bg-slate-800 text-slate-400 line-through'
                        : isActiveSpeaker
                        ? 'bg-sky-500 text-white'
                        : 'bg-white text-slate-900'
                    }`}
                  >
                    {p.name}
                  </span>

                  {latestClue && (
                    <span className="mt-1 text-xs font-bold text-amber-300 bg-black/65 px-2 py-0.5 rounded-md max-w-[100px] truncate">
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
      <div className="w-full px-4 mb-4">
        <div className="bg-bg-surface/90 border border-border-strong rounded-3xl p-4 shadow-xl space-y-3">
          {gameMode === 'question' && asker && target ? (
            <div className="flex items-center justify-around gap-3 py-1">
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-sky-400 mb-1">{t('asker')}</span>
                <Avatar avatar={asker.avatar} name={asker.name} size={56} showName />
              </div>
              <ArrowDown size={24} className="text-text-muted -rotate-90 rtl:rotate-90" />
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-rose-400 mb-1">{t('target')}</span>
                <Avatar avatar={target.avatar} name={target.name} size={56} showName />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-sky-400" />
                <div>
                  <p className="text-xs font-bold text-text-muted">
                    {lang === 'ar' ? 'دور الوصف الحالي' : 'Current Speaker'}
                  </p>
                  <p className="text-base font-black text-text-main">
                    {currentPlayer?.name}
                    {(currentPlayer?.specialRole === 'mr_meme' ||
                      currentPlayer?.role === 'mr_meme') && (
                      <span className="text-xs text-amber-400 mx-2">
                        ({lang === 'ar' ? 'تمثيل صامت فقط!' : 'Mime only!'})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-text-muted tabular-nums">
                {currentSequenceIndex + 1} / {expressionSequence.length}
              </span>
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
              className="flex-1 bg-bg-dark/60 border border-border-strong rounded-xl px-3.5 py-2.5 text-sm font-bold text-text-main placeholder-text-muted outline-none focus:border-sky-400"
            />
            <button
              onClick={handleSaveClueAndNext}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm flex items-center gap-1.5 shrink-0 shadow transition-colors"
            >
              <span>{lang === 'ar' ? 'التالي' : 'Next'}</span>
              {clueInput.trim() ? <Send size={15} /> : <ArrowRight size={15} className="rtl:rotate-180" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg-surface/95 backdrop-blur-xl border-t border-border-strong px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5">
          <button
            onClick={() => {
              playSound('click');
              setShowLogModal(true);
            }}
            title={lang === 'ar' ? 'سجل الأوصاف' : 'Descriptions Log'}
            className="w-12 h-12 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow-lg shrink-0 relative"
          >
            <FileText size={20} />
            {descriptionsLog.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black flex items-center justify-center tabular-nums">
                {descriptionsLog.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              playSound('click');
              setShowPeekPicker(true);
            }}
            className="flex-1 py-3 px-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <Eye size={18} className="text-sky-600 shrink-0" />
            <span className="truncate">
              {lang === 'ar' ? 'عرض كلمتي السرية' : 'Peek My Word'}
            </span>
          </button>

          <button
            onClick={handleFinish}
            className="py-3 px-5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#9f1239] active:translate-y-0.5 active:shadow-none transition-all shrink-0"
          >
            <Vote size={18} />
            <span>{lang === 'ar' ? 'تصويت' : 'Vote'}</span>
          </button>
        </div>
      </div>

      {/* Lovers Mutual Reveal Reminder (Round 1 only, non-spoiling) */}
      <AnimatePresence>
        {showLoversReminder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-surface border-2 border-pink-400/50 p-7 rounded-[2.25rem] w-full max-w-sm text-center shadow-2xl"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-[#0B1120] border border-pink-400/45 flex items-center justify-center overflow-hidden shadow-md">
                <img
                  src={getRoleAsset('lovers')}
                  alt={getRoleTitle('lovers', lang)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-black mb-2">
                <Heart size={13} className="fill-current" />
                <span>{getRoleTitle('lovers', lang)}</span>
              </div>

              <h3 className="text-xl font-black text-text-main mb-2">
                {lang === 'ar'
                  ? 'تذكير العشاق قبل بدء الجولة'
                  : 'Lovers Mutual Reveal Reminder'}
              </h3>

              <p className="text-xs sm:text-sm font-bold text-text-muted leading-relaxed mb-6">
                {lang === 'ar'
                  ? 'يوجد عاشقان في هذه الجولة! قبل البدء بالوصف، يمكن لكل لاعب تفقد كلمته السرية سراً لمعرفة اسم شريكه.'
                  : 'There are 2 Lovers in this round! Before speaking begins, players can secretly check "Peek My Word" to see who their partner is.'}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    playSound('click');
                    setShowPeekPicker(true);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/50 text-pink-200 font-black text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye size={18} />
                  <span>
                    {lang === 'ar' ? 'فحص سري لمعرفة الشريك' : 'Secretly Peek Partner'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    playSound('pop');
                    setShowLoversReminder(false);
                  }}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base shadow-[0_4px_0_#15803d] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  <span>{lang === 'ar' ? 'جاهزون · ابدأ الجولة' : 'Ready · Start Round'}</span>
                </button>
              </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-surface border border-border-strong p-7 rounded-[2.25rem] w-full max-w-sm text-center shadow-2xl"
            >
              <h3 className="text-2xl font-black text-text-main mb-2">
                {gameMode === 'expression' ? t('enoughExpressions') : t('enoughQuestions')}
              </h3>
              <p className="text-text-muted mb-6 text-sm font-bold">{t('continueOrVote')}</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleFinish}
                  className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  <Vote size={22} />
                  <span>{t('goToVote')}</span>
                </button>
                <button
                  onClick={handleContinueAsking}
                  className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  <RefreshCw size={22} />
                  <span>
                    {gameMode === 'expression' ? t('continueExpressing') : t('continueAsking')}
                  </span>
                </button>
              </div>
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white text-slate-900 rounded-[2rem] overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="bg-indigo-500 text-white p-4 flex items-center justify-between">
                <h3 className="text-lg font-black">
                  {lang === 'ar' ? 'سجل الوصف' : 'Descriptions'}
                </h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-200">
                {descriptionsLog.length === 0 ? (
                  <p className="text-center text-sm font-bold text-slate-500 py-10">
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
                            <p key={idx} className="text-sm font-black text-slate-800">
                              - {entry.text}
                            </p>
                          ))}
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          <Avatar avatar={p.avatar} name={p.name} size={42} />
                          <span className="text-xs font-bold text-slate-500 mt-1">{p.name}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-bg-surface border border-border-strong rounded-[2rem] p-5 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-text-main">{t('specialRoles')}</h3>
                <button
                  onClick={() => setShowSpecialRolesModal(false)}
                  className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-muted"
                >
                  <X size={16} />
                </button>
              </div>
              {activeSpecials.map((role) => (
                <div
                  key={role}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-bg-card border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0B1120] border border-white/15 shrink-0 overflow-hidden flex items-center justify-center shadow-sm">
                    <img
                      src={getRoleAsset(role)}
                      alt={getRoleTitle(role, lang)}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-text-main">
                      {getRoleTitle(role, lang)}
                    </h4>
                    <p className="text-xs font-bold text-text-muted">
                      {getSpecialRoleDescription(role, lang)}
                    </p>
                  </div>
                </div>
              ))}
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
              setIsPeekingWord(false);
            }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-bg-surface border border-border-strong rounded-[2rem] p-6 shadow-2xl text-center"
            >
              {!peekPlayer ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-text-main">
                      {lang === 'ar' ? 'من يريد تفقد كلمته؟' : 'Who wants to peek?'}
                    </h3>
                    <button
                      onClick={() => setShowPeekPicker(false)}
                      className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-muted"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                    {alivePlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPeekPlayer(p);
                          setIsPeekingWord(false);
                        }}
                        className="p-2 rounded-2xl bg-bg-card hover:bg-sky-500/20 border border-border flex flex-col items-center gap-1.5 transition-colors"
                      >
                        <Avatar avatar={p.avatar} name={p.name} size={46} />
                        <span className="text-xs font-black text-text-main truncate max-w-full">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Avatar avatar={peekPlayer.avatar} name={peekPlayer.name} size={72} />
                  <h3 className="text-xl font-black text-text-main mt-3 mb-2">{peekPlayer.name}</h3>
                  <p className="text-xs font-bold text-text-muted mb-5">
                    {lang === 'ar'
                      ? 'تأكد أن لا أحد ينظر إلى الشاشة ثم اضغط على العين'
                      : 'Make sure nobody is watching, then tap the eye icon'}
                  </p>

                  <div className="bg-bg-card border border-border-strong rounded-2xl p-5 mb-4 flex items-center justify-between gap-3">
                    <div className="text-start min-w-0">
                      <span className="text-xs font-bold text-text-muted block">
                        {lang === 'ar' ? 'كلمتك السرية' : 'Secret Word'}
                      </span>
                      <span className="text-xl font-black text-text-main">
                        {isPeekingWord
                          ? getPlayerSecretWord(peekPlayer) ||
                            (lang === 'ar' ? 'أنت Mr. White (بدون كلمة)' : 'You are Mr. White!')
                          : '•••••••'}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsPeekingWord(!isPeekingWord)}
                      className="w-12 h-12 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shadow shrink-0"
                    >
                      {isPeekingWord ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>

                  {isPeekingWord && peekPlayer.specialRole && (
                    <div className="bg-violet-500/15 border border-violet-400/35 rounded-2xl p-3 mb-4 text-xs font-bold text-violet-200 text-start space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-violet-300">
                        <Sparkles size={13} />
                        <span>{getRoleTitle(peekPlayer.specialRole, lang)}</span>
                      </div>
                      {peekLoverPartner && (
                        <p className="text-pink-300 font-black flex items-center gap-1">
                          <Heart size={12} className="fill-current" />
                          <span>
                            {lang === 'ar'
                              ? `شريكك السري: ${peekLoverPartner.name}`
                              : `Your Lover partner: ${peekLoverPartner.name}`}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setPeekPlayer(null);
                      setIsPeekingWord(false);
                      setShowPeekPicker(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black"
                  >
                    {lang === 'ar' ? 'أخفِ الكلمة' : 'Hide & Close'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
