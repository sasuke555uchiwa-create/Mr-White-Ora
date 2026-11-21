import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Key,
  Layers,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Users,
  Vote,
  Zap,
} from 'lucide-react';
import {
  CaseFileAwardId,
  CaseFileEventType,
  CaseFileTurningPointKind,
  ClassifiedCaseFile,
} from '../types';
import { Avatar } from './Avatar';
import { getUITranslation } from '../translations';
import { getLocalCaseFileById, getSettings } from '../services/storageService';
import { fetchOnlineCaseFile } from '../utils/caseFileService';
import { getRoleAsset, getRoleTitle } from '../data/specialRoles';
import { ACHIEVEMENT_ASSETS, CATEGORY_COVERS } from '../src/design/assetRegistry';
import { playSound } from '../services/soundService';

interface CaseFileScreenProps {
  caseFile?: ClassifiedCaseFile | null;
  reportId?: string | null;
  modeHint?: 'local' | 'online';
  onBack: () => void;
}

const AWARD_IMAGE_MAP: Record<CaseFileAwardId, string> = {
  MASTER_DETECTIVE: ACHIEVEMENT_ASSETS.masterDetective,
  PERFECT_COVER: ACHIEVEMENT_ASSETS.masterOfLies,
  SHARP_EYE: ACHIEVEMENT_ASSETS.sharpEye,
  SOCIAL_STRATEGIST: ACHIEVEMENT_ASSETS.socialStrategist,
  CLUTCH_MOMENT: ACHIEVEMENT_ASSETS.perfectDeduction,
  GHOST_PROTOCOL: ACHIEVEMENT_ASSETS.survivor,
};

const TURNING_POINT_KEY_MAP: Record<CaseFileTurningPointKind, string> = {
  mr_white_guess_win: 'tpMrWhiteGuessWin',
  mr_white_guess_miss: 'tpMrWhiteGuessMiss',
  shield_save: 'tpShieldSave',
  boomerang_bounce: 'tpBoomerangBounce',
  avenger_strike: 'tpAvengerStrike',
  lovers_chain: 'tpLoversChain',
  justice_tiebreak: 'tpJusticeTiebreak',
  infiltrator_eliminated: 'tpInfiltratorEliminated',
  final_elimination: 'tpFinalElimination',
};

const EVENT_TYPE_KEY_MAP: Record<CaseFileEventType, string> = {
  shield_block: 'evShieldBlock',
  boomerang_bounce: 'evBoomerangBounce',
  justice_tiebreak: 'evJusticeTiebreak',
  avenger_strike: 'evAvengerStrike',
  lovers_heartbreak: 'evLoversHeartbreak',
  mr_joy_bonus: 'evMrJoyBonus',
  ghost_vote: 'evGhostVote',
  mr_white_guess: 'evMrWhiteGuess',
  player_eliminated: 'evPlayerEliminated',
  player_departed: 'evPlayerDeparted',
};

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const CaseFileScreen: React.FC<CaseFileScreenProps> = ({
  caseFile: initialCaseFile = null,
  reportId = null,
  modeHint,
  onBack,
}) => {
  const settings = getSettings();
  const lang = settings.language || 'ar';
  const isRTL = lang === 'ar';
  const t = (key: string, params?: Record<string, any>) => {
    let text = getUITranslation(lang, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const [resolvedFile, setResolvedFile] = useState<ClassifiedCaseFile | null>(initialCaseFile);
  const [loading, setLoading] = useState<boolean>(!initialCaseFile && Boolean(reportId));
  const [loadError, setLoadError] = useState<boolean>(false);
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);

  const loadByReportId = async (id: string) => {
    setLoading(true);
    setLoadError(false);
    try {
      if (modeHint !== 'online') {
        const localHit = getLocalCaseFileById(id);
        if (localHit) {
          setResolvedFile(localHit);
          setSelectedRoundIdx(0);
          setLoading(false);
          return;
        }
      }
      const remoteHit = await fetchOnlineCaseFile(id);
      setResolvedFile(remoteHit);
      setSelectedRoundIdx(0);
    } catch (err) {
      console.error('Failed to load case file:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCaseFile) {
      setResolvedFile(initialCaseFile);
      setSelectedRoundIdx(0);
      setLoading(false);
      setLoadError(false);
      return;
    }
    if (reportId) {
      void loadByReportId(reportId);
    } else {
      setResolvedFile(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCaseFile, reportId, modeHint]);

  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-black text-sky-300 tracking-wide">{t('caseFileLoading')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full">
        <div className="bg-bg-surface/90 border border-rose-400/35 rounded-3xl p-6 w-full shadow-xl space-y-4">
          <p className="text-sm font-black text-rose-300">{t('caseFileLoadError')}</p>
          <div className="flex gap-3">
            {reportId && (
              <button
                onClick={() => void loadByReportId(reportId)}
                className="flex-1 min-h-[44px] py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                <span>{t('retryLoad')}</span>
              </button>
            )}
            <button
              onClick={onBack}
              className="flex-1 min-h-[44px] py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-text-main font-black text-sm"
            >
              {t('caseFileBackToMatch')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!resolvedFile) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full">
        <div className="bg-bg-surface/90 border border-border-strong rounded-3xl p-6 w-full shadow-xl space-y-4">
          <FileText size={32} className="mx-auto text-text-muted" />
          <p className="text-sm font-black text-text-muted">{t('caseFileNotFound')}</p>
          <button
            onClick={onBack}
            className="w-full min-h-[44px] py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-text-main font-black text-sm"
          >
            {t('caseFileBackToMatch')}
          </button>
        </div>
      </div>
    );
  }

  const rounds = resolvedFile.rounds || [];
  const activeRound = rounds[Math.min(selectedRoundIdx, Math.max(0, rounds.length - 1))] || null;
  const hasUndercover = resolvedFile.players.some((p) => p.role === 'undercover');

  const factionLabel = (() => {
    switch (resolvedFile.winningFaction) {
      case 'citizens':
        return t('factionCitizens');
      case 'undercover_solo':
        return t('factionUndercoverSolo');
      case 'mrwhite_solo':
        return t('factionMrWhiteSolo');
      case 'both':
        return t('factionBothInfiltrators');
    }
  })();

  const winReasonLabel = (() => {
    switch (resolvedFile.winReason) {
      case 'impostor_guessed':
        return t('winReasonImpostorGuessed');
      case 'citizens_wrong_vote':
        return t('winReasonCitizensWrongVote');
      case 'fool_won':
        return t('winReasonFoolWon');
      default:
        return t('winReasonImpostorCaught');
    }
  })();

  const categoryCover =
    CATEGORY_COVERS[resolvedFile.category as keyof typeof CATEGORY_COVERS] ||
    CATEGORY_COVERS.standard;

  const formattedDate = new Intl.DateTimeFormat(
    lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' }
  ).format(new Date(resolvedFile.endedAtMs));

  const formatMetric = (
    val: number | null,
    unit?: 'pct' | 'points' | 'count' | 'score'
  ): string => {
    if (val === null || val === undefined) return '—';
    if (unit === 'pct') return `${val}%`;
    if (unit === 'points') return `${val} ${t('points')}`;
    return String(val);
  };

  return (
    <div
      className="flex flex-col w-full max-w-4xl mx-auto px-4 pt-3 pb-24 space-y-5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            playSound('click');
            onBack();
          }}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-bg-surface/90 border border-border-strong hover:bg-bg-card text-text-main font-black text-sm flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={17} className="rtl:rotate-180" />
          <span>{t('caseFileBackToMatch')}</span>
        </button>

        <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-300 font-mono text-xs font-black tracking-wider tabular-nums">
          {resolvedFile.operationCode}
        </span>
      </div>

      {/* 1. CLASSIFIED COVER */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden border border-sky-400/25 bg-[#070B14] shadow-[0_20px_50px_rgba(2,6,23,0.65)]"
      >
        <img
          src={categoryCover}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#0B1120]/85 to-[#0B1120]/70" />

        <div className="relative z-10 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300">
              <FileText size={15} />
              <span>{t('caseSectionCover')}</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[11px] font-black tracking-wider">
              {t('caseStatusClosed')}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="text-start">
              <p className="text-[11px] font-bold text-slate-400 mb-1">
                {t('operationCodeLabel')} · {formattedDate}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {factionLabel}
              </h1>
              <p className="text-sm font-bold text-slate-300 mt-1">{winReasonLabel}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-black text-white">
                {resolvedFile.mode === 'online' ? t('caseModeOnline') : t('caseModeLocal')}
              </span>
              <span
                className={`px-3 py-1.5 rounded-xl border text-xs font-black ${
                  resolvedFile.difficulty === 'hard'
                    ? 'bg-rose-500/15 border-rose-400/35 text-rose-200'
                    : 'bg-sky-500/15 border-sky-400/35 text-sky-200'
                }`}
              >
                {resolvedFile.difficulty === 'hard' ? t('difficultyHard') : t('difficultyEasy')}
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. OPERATION SUMMARY */}
      <section className="rounded-3xl bg-bg-surface/90 border border-border-strong p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-400">
          <Layers size={15} />
          <h2>{t('caseSectionSummary')}</h2>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-bg-dark/70 border border-white/10 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-text-muted mb-1">
              <Clock size={12} />
              <span>{t('durationLabel')}</span>
            </div>
            <p className="text-lg font-black text-text-main tabular-nums">
              {formatDuration(resolvedFile.durationSeconds)}
            </p>
          </div>
          <div className="rounded-2xl bg-bg-dark/70 border border-white/10 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-text-muted mb-1">
              <Target size={12} />
              <span>{t('roundsLabel')}</span>
            </div>
            <p className="text-lg font-black text-text-main tabular-nums">
              {resolvedFile.roundCount}
            </p>
          </div>
          <div className="rounded-2xl bg-bg-dark/70 border border-white/10 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-text-muted mb-1">
              <Users size={12} />
              <span>{t('playersCountLabel')}</span>
            </div>
            <p className="text-lg font-black text-text-main tabular-nums">
              {resolvedFile.playerCount}
            </p>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 ${
            hasUndercover && resolvedFile.undercoverWord ? 'sm:grid-cols-2' : ''
          } gap-3`}
        >
          <div className="rounded-2xl bg-sky-500/10 border border-sky-400/30 p-3.5 flex items-center justify-between gap-3">
            <div className="text-start">
              <p className="text-[11px] font-black text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key size={13} />
                <span>{t('secretWordLabel')}</span>
              </p>
              <p className="text-xl font-black text-white mt-0.5">{resolvedFile.secretWord}</p>
            </div>
          </div>

          {hasUndercover && resolvedFile.undercoverWord && (
            <div className="rounded-2xl bg-orange-500/10 border border-orange-400/30 p-3.5 flex items-center justify-between gap-3">
              <div className="text-start">
                <p className="text-[11px] font-black text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={13} />
                  <span>{t('undercoverWordLabel')}</span>
                </p>
                <p className="text-xl font-black text-white mt-0.5">
                  {resolvedFile.undercoverWord}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. PLAYER INTELLIGENCE DOSSIERS */}
      <section className="rounded-3xl bg-bg-surface/90 border border-border-strong p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-400">
          <Users size={15} />
          <h2>{t('caseSectionDossiers')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resolvedFile.players.map((p) => {
            const roleTitle = getRoleTitle(p.role, lang);
            const specialTitle = p.specialRole ? getRoleTitle(p.specialRole, lang) : null;
            const roleImg = getRoleAsset(p.role);

            return (
              <div
                key={p.playerId}
                className={`rounded-2xl p-3.5 border transition-colors ${
                  p.won
                    ? 'bg-emerald-500/5 border-emerald-400/30'
                    : 'bg-bg-dark/65 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar avatar={p.avatar} name={p.name} size={46} />
                    <div className="min-w-0 text-start">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-text-main truncate">
                          {p.name}
                        </span>
                        {p.won && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <img
                          src={roleImg}
                          alt={roleTitle}
                          className="w-5 h-5 rounded-full object-cover border border-white/20"
                        />
                        <span
                          className={`text-xs font-black ${
                            p.role === 'mrwhite'
                              ? 'text-amber-300'
                              : p.role === 'undercover'
                              ? 'text-orange-300'
                              : 'text-sky-300'
                          }`}
                        >
                          {roleTitle}
                        </span>
                        {specialTitle && (
                          <span className="text-[11px] font-bold text-violet-300">
                            · {specialTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                      p.survived
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                    }`}
                  >
                    {p.survived
                      ? t('survivedLabel')
                      : p.eliminatedRound
                      ? t('eliminatedRoundLabel', { round: p.eliminatedRound })
                      : t('eliminatedLabel')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted">{t('pointsEarnedLabel')}</p>
                    <p className="text-xs font-black text-text-main tabular-nums mt-0.5">
                      {p.pointsEarned >= 0 ? `+${p.pointsEarned}` : p.pointsEarned}
                      {p.xpEarned !== undefined && (
                        <span className="text-[10px] text-sky-300 block">
                          +{p.xpEarned} {t('xpEarnedLabel')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted">{t('cluesCountLabel')}</p>
                    <p className="text-xs font-black text-text-main tabular-nums mt-0.5">
                      {p.cluesCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted">{t('voteAccuracyLabel')}</p>
                    {p.voteAccuracyStatus === 'verified' && p.voteAccuracyPct !== null ? (
                      <p className="text-xs font-black text-sky-300 tabular-nums mt-0.5">
                        {p.voteAccuracyPct}%{' '}
                        <span className="text-[10px] text-text-muted">
                          ({p.accurateVotes}/{p.verifiableVotesCast})
                        </span>
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-text-muted mt-0.5">
                        {t('insufficientData')}
                      </p>
                    )}
                  </div>
                </div>

                {p.awardsEarned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/5">
                    {p.awardsEarned.map((awId) => (
                      <span
                        key={awId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[10px] font-black text-amber-200"
                      >
                        <Award size={10} />
                        <span>{t(`caseAwardTitle_${awId}`)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4 & 5. ROUND-BY-ROUND TIMELINE + VOTING ANALYSIS */}
      <section className="rounded-3xl bg-bg-surface/90 border border-border-strong p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-400">
            <Vote size={15} />
            <h2>
              {t('caseSectionTimeline')} · {t('caseSectionVoting')}
            </h2>
          </div>

          {rounds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rounds.map((r, idx) => (
                <button
                  key={r.roundNumber}
                  onClick={() => {
                    playSound('click');
                    setSelectedRoundIdx(idx);
                  }}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black transition-colors tabular-nums ${
                    idx === selectedRoundIdx
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-bg-dark/70 text-text-muted hover:text-text-main border border-white/10'
                  }`}
                >
                  {t('roundTabLabel', { round: r.roundNumber })}
                </button>
              ))}
            </div>
          )}
        </div>

        {!activeRound ? (
          <p className="text-xs font-bold text-text-muted py-4 text-center">
            {t('noVotesRecordedRound')}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Clues in Round */}
            <div className="rounded-2xl bg-bg-dark/65 border border-white/10 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-text-muted">
                <MessageSquare size={13} />
                <span>{t('cluesFeedTitle')}</span>
              </div>
              {activeRound.clues.length === 0 ? (
                <p className="text-xs font-bold text-text-muted/80 py-2">
                  {t('noCluesRecordedRound')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeRound.clues.map((clue) => (
                    <div
                      key={clue.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-bg-surface/80 border border-white/5"
                    >
                      <Avatar avatar={clue.playerAvatar} name={clue.playerName} size={28} />
                      <div className="min-w-0 text-start">
                        <span className="text-[11px] font-black text-text-muted block truncate">
                          {clue.playerName}
                        </span>
                        <span
                          className={`text-xs font-bold break-words ${
                            clue.skipped ? 'text-text-muted italic' : 'text-text-main'
                          }`}
                        >
                          {clue.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voting Analysis in Round */}
            <div className="rounded-2xl bg-bg-dark/65 border border-white/10 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-text-main">
                  {activeRound.voteMode === 'group'
                    ? t('groupConsensusVoteLabel')
                    : activeRound.voteMode === 'online_secret'
                    ? t('onlineSecretBallotLabel')
                    : t('secretBallotVoteLabel')}
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {activeRound.tieBrokenByJustice && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-black text-emerald-300">
                      {t('tieBrokenByJusticeLabel')}
                    </span>
                  )}
                  {activeRound.tieBroken && !activeRound.tieBrokenByJustice && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[11px] font-black text-amber-300">
                      {t('tieBrokenLabel')}
                    </span>
                  )}
                  {activeRound.wasSavedBySpecial === 'protector' && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/30 text-[11px] font-black text-sky-300">
                      {t('savedByShieldLabel')}
                    </span>
                  )}
                  {activeRound.bouncedFromName && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-400/30 text-[11px] font-black text-rose-300">
                      {t('bouncedByBoomerangLabel')} ({activeRound.bouncedFromName})
                    </span>
                  )}
                </div>
              </div>

              {/* Target & Elimination Summary */}
              <div className="flex flex-wrap gap-3 text-xs font-bold">
                {activeRound.mostVotedName && (
                  <span className="text-text-muted">
                    {t('mostVotedLabel')}:{' '}
                    <strong className="text-text-main">{activeRound.mostVotedName}</strong>
                  </span>
                )}
                {activeRound.eliminatedNames.length > 0 && (
                  <span className="text-rose-300">
                    {t('eliminatedOutcomeLabel')}:{' '}
                    <strong>{activeRound.eliminatedNames.join(', ')}</strong>
                  </span>
                )}
              </div>

              {activeRound.mrWhiteGuess && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${
                    activeRound.mrWhiteGuess.isCorrect
                      ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                      : 'bg-white/5 border-white/10 text-text-muted'
                  }`}
                >
                  <span>
                    {t('mrWhiteGuessAttemptLabel')} ({activeRound.mrWhiteGuess.playerName})
                    {activeRound.mrWhiteGuess.guess ? `: "${activeRound.mrWhiteGuess.guess}"` : ''}
                  </span>
                  <span className="font-black">
                    {activeRound.mrWhiteGuess.forcedMissing
                      ? t('mrWhiteGuessMissing')
                      : activeRound.mrWhiteGuess.isCorrect
                      ? t('mrWhiteGuessSuccess')
                      : t('mrWhiteGuessFail')}
                  </span>
                </div>
              )}

              {activeRound.voteMode === 'group' ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/25 flex items-start gap-2.5 text-xs font-bold text-amber-200">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>{t('groupVoteNoBallotNote')}</span>
                </div>
              ) : (
                <>
                  {activeRound.voteTally.length > 0 && (
                    <div className="space-y-1.5">
                      {activeRound.voteTally.map((item) => {
                        const maxVotes = Math.max(1, activeRound.voteTally[0]?.count || 1);
                        const pct = Math.round((item.count / maxVotes) * 100);
                        return (
                          <div key={item.targetId} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-text-main">{item.targetName}</span>
                              <span className="text-sky-300 tabular-nums">{item.count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-sky-400 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeRound.votes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-white/10">
                      {activeRound.votes.map((v) => (
                        <div
                          key={`${v.voterId}-${v.targetId}`}
                          className="text-xs font-bold text-text-muted bg-bg-surface/60 px-3 py-1.5 rounded-lg flex items-center justify-between gap-2"
                        >
                          <span className="text-text-main truncate">{v.voterName}</span>
                          <span className="text-[10px] opacity-70">{t('voteTargetLabel')}</span>
                          <span className="text-rose-300 font-black truncate">{v.targetName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 6. SPECIAL EVENTS & TURNING POINTS */}
      <section className="rounded-3xl bg-bg-surface/90 border border-border-strong p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
          <Zap size={15} />
          <h2>{t('caseSectionEvents')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-text-muted">{t('turningPointsHeading')}</h3>
            {resolvedFile.turningPoints.length === 0 ? (
              <p className="text-xs font-bold text-text-muted/80 py-2">
                {t('noSpecialEventsRecorded')}
              </p>
            ) : (
              <div className="space-y-2">
                {resolvedFile.turningPoints.map((tp, idx) => (
                  <div
                    key={`${tp.kind}-${tp.round}-${idx}`}
                    className="rounded-xl bg-bg-dark/70 border border-white/10 p-3 flex items-start gap-2.5"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-black tabular-nums shrink-0">
                      R{tp.round}
                    </span>
                    <div className="text-start min-w-0">
                      <p className="text-xs font-black text-text-main">
                        {t(TURNING_POINT_KEY_MAP[tp.kind])}
                      </p>
                      {(tp.actorName || tp.targetName) && (
                        <p className="text-[11px] font-bold text-text-muted mt-0.5">
                          {[tp.actorName, tp.targetName].filter(Boolean).join(' → ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-black text-text-muted">{t('eventsLogHeading')}</h3>
            {resolvedFile.specialEvents.length === 0 ? (
              <p className="text-xs font-bold text-text-muted/80 py-2">
                {t('noSpecialEventsRecorded')}
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {resolvedFile.specialEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-bg-dark/70 border border-white/10 p-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 text-start">
                      <span className="font-black text-text-main block truncate">
                        {t(EVENT_TYPE_KEY_MAP[ev.type])}
                      </span>
                      {(ev.actorName || ev.targetName) && (
                        <span className="text-[11px] font-bold text-text-muted">
                          {[ev.actorName, ev.targetName].filter(Boolean).join(' → ')}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-sky-300 px-2 py-0.5 rounded-md bg-sky-500/10 tabular-nums shrink-0">
                      R{ev.round}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. FINAL VERDICT & DETERMINISTIC AWARDS */}
      <section className="rounded-3xl bg-bg-surface/90 border border-border-strong p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400">
          <Sparkles size={15} />
          <h2>{t('caseSectionVerdict')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resolvedFile.awards.map((award) => {
            const isAwarded = award.status === 'awarded' && award.recipientName;
            return (
              <div
                key={award.awardId}
                className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                  isAwarded
                    ? 'bg-gradient-to-b from-amber-500/10 to-bg-dark/70 border-amber-400/35'
                    : 'bg-bg-dark/50 border-white/10 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#0B1120] border border-white/10 shrink-0">
                    <img
                      src={AWARD_IMAGE_MAP[award.awardId]}
                      alt={t(`caseAwardTitle_${award.awardId}`)}
                      className={`w-full h-full object-cover ${isAwarded ? '' : 'grayscale opacity-50'}`}
                    />
                  </div>
                  <div className="min-w-0 text-start">
                    <h3 className="text-sm font-black text-text-main leading-tight">
                      {t(`caseAwardTitle_${award.awardId}`)}
                    </h3>
                    {isAwarded ? (
                      <p className="text-xs font-black text-amber-300 mt-1 truncate">
                        {award.recipientName}
                      </p>
                    ) : (
                      <p className="text-[11px] font-black text-text-muted mt-1 flex items-center gap-1">
                        <Shield size={11} />
                        <span>
                          {award.status === 'not_applicable'
                            ? t('notApplicable')
                            : t('insufficientData')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-start space-y-1">
                  {isAwarded && award.metricValue !== null && (
                    <p className="text-xs font-black text-sky-300 tabular-nums">
                      {formatMetric(award.metricValue, award.metricUnit)}
                    </p>
                  )}
                  <p className="text-[11px] font-bold text-text-muted leading-relaxed">
                    {t(award.reasonKey)}
                  </p>
                  {award.tiedCandidates && award.tiedCandidates.length > 1 && (
                    <p className="text-[10px] font-bold text-amber-200/80">
                      {t('tiedWithLabel')}: {award.tiedCandidates.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
