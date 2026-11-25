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
import {
  ClassifiedDossierPanel,
  ClassifiedStamp,
  IntelligencePanel,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

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
  const isRTL = ['ar', 'sa'].includes(lang);
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
        <div className="w-10 h-10 border-2 border-[#668F9A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-cyan-text">{t('caseFileLoading')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full">
        <IntelligencePanel className="border-[#963F46]/40 p-6 w-full space-y-4">
          <p className="text-sm font-bold text-danger-text">{t('caseFileLoadError')}</p>
          <div className="flex gap-3">
            {reportId && (
              <TacticalButton
                onClick={() => void loadByReportId(reportId)}
                variant="cyan"
                size="md"
                className="flex-1"
                icon={<RefreshCw size={15} />}
              >
                {t('retryLoad')}
              </TacticalButton>
            )}
            <TacticalButton onClick={onBack} variant="secondary" size="md" className="flex-1">
              {t('caseFileBackToMatch')}
            </TacticalButton>
          </div>
        </IntelligencePanel>
      </div>
    );
  }

  if (!resolvedFile) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full">
        <IntelligencePanel className="p-6 w-full space-y-4">
          <FileText size={32} className="mx-auto text-text-muted" />
          <p className="text-sm font-semibold text-text-muted">{t('caseFileNotFound')}</p>
          <TacticalButton onClick={onBack} variant="secondary" size="md" fullWidth>
            {t('caseFileBackToMatch')}
          </TacticalButton>
        </IntelligencePanel>
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
      className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-24 space-y-5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <TacticalButton
          onClick={() => {
            playSound('click');
            onBack();
          }}
          variant="secondary"
          size="sm"
          icon={<ArrowLeft size={16} className="rtl:rotate-180" />}
        >
          {t('caseFileBackToMatch')}
        </TacticalButton>

        <ClassifiedStamp tone="gold">{resolvedFile.operationCode}</ClassifiedStamp>
      </div>

      {/* 1. CLASSIFIED COVER */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[16px] overflow-hidden border border-[#B49A62]/35 bg-[#080B10] shadow-[0_20px_50px_rgba(4,7,12,0.55)]"
      >
        <img
          src={categoryCover}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#0D1219]/88 to-[#080B10]/75" />

        <div className="relative z-10 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2 text-xs font-bold text-[#8CB3BE] ${
                !isRTL ? 'uppercase tracking-wider' : ''
              }`}
            >
              <FileText size={14} />
              <span>{t('caseSectionCover')}</span>
            </div>
            <StatusIndicator tone="emerald">{t('caseStatusClosed')}</StatusIndicator>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="text-start">
              <p className="text-[11px] font-semibold text-[#A8B1BA] mb-1">
                {t('operationCodeLabel')} · {formattedDate}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#ECEFF4] tracking-tight">
                {factionLabel}
              </h1>
              <p className="text-sm font-medium text-[#A8B1BA] mt-1">{winReasonLabel}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-[6px] bg-white/10 border border-white/15 text-xs font-bold text-[#ECEFF4]">
                {resolvedFile.mode === 'online' ? t('caseModeOnline') : t('caseModeLocal')}
              </span>
              <StatusIndicator tone={resolvedFile.difficulty === 'hard' ? 'crimson' : 'cyan'}>
                {resolvedFile.difficulty === 'hard' ? t('difficultyHard') : t('difficultyEasy')}
              </StatusIndicator>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. OPERATION SUMMARY */}
      <ClassifiedDossierPanel className="p-5 space-y-4">
        <div
          className={`flex items-center gap-2 text-xs font-bold text-cyan-text ${
            !isRTL ? 'uppercase tracking-wider' : ''
          }`}
        >
          <Layers size={14} />
          <h2>{t('caseSectionSummary')}</h2>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-[10px] bg-bg-card border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-text-muted mb-1">
              <Clock size={12} />
              <span>{t('durationLabel')}</span>
            </div>
            <p className="text-lg font-bold text-text-main font-mono-code tabular-nums">
              {formatDuration(resolvedFile.durationSeconds)}
            </p>
          </div>
          <div className="rounded-[10px] bg-bg-card border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-text-muted mb-1">
              <Target size={12} />
              <span>{t('roundsLabel')}</span>
            </div>
            <p className="text-lg font-bold text-text-main font-mono-code tabular-nums">
              {resolvedFile.roundCount}
            </p>
          </div>
          <div className="rounded-[10px] bg-bg-card border border-border p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-text-muted mb-1">
              <Users size={12} />
              <span>{t('playersCountLabel')}</span>
            </div>
            <p className="text-lg font-bold text-text-main font-mono-code tabular-nums">
              {resolvedFile.playerCount}
            </p>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 ${
            hasUndercover && resolvedFile.undercoverWord ? 'sm:grid-cols-2' : ''
          } gap-3`}
        >
          <div className="rounded-[10px] bg-[#668F9A]/10 border border-[#668F9A]/35 p-3.5 text-start">
            <p
              className={`text-[11px] font-bold text-cyan-text flex items-center gap-1.5 ${
                !isRTL ? 'uppercase tracking-wider' : ''
              }`}
            >
              <Key size={13} />
              <span>{t('secretWordLabel')}</span>
            </p>
            <p className="text-xl font-bold text-text-main mt-0.5">{resolvedFile.secretWord}</p>
          </div>

          {hasUndercover && resolvedFile.undercoverWord && (
            <div className="rounded-[10px] bg-[#A46F44]/10 border border-[#A46F44]/35 p-3.5 text-start">
              <p
                className={`text-[11px] font-bold text-[#C88D5E] flex items-center gap-1.5 ${
                  !isRTL ? 'uppercase tracking-wider' : ''
                }`}
              >
                <Key size={13} />
                <span>{t('undercoverWordLabel')}</span>
              </p>
              <p className="text-xl font-bold text-text-main mt-0.5">
                {resolvedFile.undercoverWord}
              </p>
            </div>
          )}
        </div>
      </ClassifiedDossierPanel>

      {/* 3. PLAYER INTELLIGENCE DOSSIERS */}
      <IntelligencePanel className="p-5 space-y-4">
        <div
          className={`flex items-center gap-2 text-xs font-bold text-cyan-text ${
            !isRTL ? 'uppercase tracking-wider' : ''
          }`}
        >
          <Users size={14} />
          <h2>{t('caseSectionDossiers')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resolvedFile.players.map((p) => {
            const roleTitle = getRoleTitle(p.role, lang);
            const specialTitle = p.specialRole ? getRoleTitle(p.specialRole, lang) : null;
            const roleImg = getRoleAsset(p.role);

            return (
              <PlayerIntelligenceCard
                key={p.playerId}
                className={`p-3.5 ${
                  p.won ? 'bg-[#3E7B67]/10 border-[#3E7B67]/35' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar avatar={p.avatar} name={p.name} size={44} />
                    <div className="min-w-0 text-start">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-text-main truncate">{p.name}</span>
                        {p.won && (
                          <CheckCircle2 size={14} className="text-emerald-text shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <img
                          src={roleImg}
                          alt={roleTitle}
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-[4px] object-cover border border-border"
                        />
                        <span
                          className={`text-xs font-bold ${
                            p.role === 'mrwhite'
                              ? 'text-primary-text'
                              : p.role === 'undercover'
                              ? 'text-[#C88D5E]'
                              : 'text-cyan-text'
                          }`}
                        >
                          {roleTitle}
                        </span>
                        {specialTitle && (
                          <span className="text-[11px] font-semibold text-primary-text">
                            · {specialTitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <StatusIndicator tone={p.survived ? 'emerald' : 'crimson'}>
                    {p.survived
                      ? t('survivedLabel')
                      : p.eliminatedRound
                      ? t('eliminatedRoundLabel', { round: p.eliminatedRound })
                      : t('eliminatedLabel')}
                  </StatusIndicator>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-center">
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted">
                      {t('pointsEarnedLabel')}
                    </p>
                    <p className="text-xs font-bold text-text-main font-mono-code tabular-nums mt-0.5">
                      {p.pointsEarned >= 0 ? `+${p.pointsEarned}` : p.pointsEarned}
                      {p.xpEarned !== undefined && (
                        <span className="text-[10px] text-cyan-text block">
                          +{p.xpEarned} {t('xpEarnedLabel')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted">
                      {t('cluesCountLabel')}
                    </p>
                    <p className="text-xs font-bold text-text-main font-mono-code tabular-nums mt-0.5">
                      {p.cluesCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted">
                      {t('voteAccuracyLabel')}
                    </p>
                    {p.voteAccuracyStatus === 'verified' && p.voteAccuracyPct !== null ? (
                      <p className="text-xs font-bold text-cyan-text font-mono-code tabular-nums mt-0.5">
                        {p.voteAccuracyPct}%{' '}
                        <span className="text-[10px] text-text-muted">
                          ({p.accurateVotes}/{p.verifiableVotesCast})
                        </span>
                      </p>
                    ) : (
                      <p className="text-[10px] font-semibold text-text-muted mt-0.5">
                        {t('insufficientData')}
                      </p>
                    )}
                  </div>
                </div>

                {p.awardsEarned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-border">
                    {p.awardsEarned.map((awId) => (
                      <StatusIndicator key={awId} tone="gold" icon={<Award size={10} />}>
                        {t(`caseAwardTitle_${awId}`)}
                      </StatusIndicator>
                    ))}
                  </div>
                )}
              </PlayerIntelligenceCard>
            );
          })}
        </div>
      </IntelligencePanel>

      {/* 4 & 5. ROUND-BY-ROUND TIMELINE + VOTING ANALYSIS */}
      <IntelligencePanel className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className={`flex items-center gap-2 text-xs font-bold text-cyan-text ${
              !isRTL ? 'uppercase tracking-wider' : ''
            }`}
          >
            <Vote size={14} />
            <h2>
              {t('caseSectionTimeline')} · {t('caseSectionVoting')}
            </h2>
          </div>

          {rounds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rounds.map((r, idx) => (
                <button
                  key={r.roundNumber}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setSelectedRoundIdx(idx);
                  }}
                  className={`min-h-[44px] px-3 py-1.5 rounded-[8px] font-mono-code text-xs font-bold transition-colors tabular-nums border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 ${
                    idx === selectedRoundIdx
                      ? 'bg-[#668F9A] text-[#080B10] border-[#8CB3BE]/50'
                      : 'bg-bg-card text-text-muted hover:text-text-main border-border'
                  }`}
                >
                  {t('roundTabLabel', { round: r.roundNumber })}
                </button>
              ))}
            </div>
          )}
        </div>

        {!activeRound ? (
          <p className="text-xs font-medium text-text-muted py-4 text-center">
            {t('noVotesRecordedRound')}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Clues in Round */}
            <div className="rounded-[12px] bg-bg-card border border-border p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted">
                <MessageSquare size={13} />
                <span>{t('cluesFeedTitle')}</span>
              </div>
              {activeRound.clues.length === 0 ? (
                <p className="text-xs font-medium text-text-muted py-2">
                  {t('noCluesRecordedRound')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeRound.clues.map((clue) => (
                    <div
                      key={clue.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] bg-bg-surface border border-border"
                    >
                      <Avatar avatar={clue.playerAvatar} name={clue.playerName} size={28} />
                      <div className="min-w-0 text-start">
                        <span className="text-[11px] font-bold text-text-muted block truncate">
                          {clue.playerName}
                        </span>
                        <span
                          className={`text-xs font-medium break-words ${
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
            <div className="rounded-[12px] bg-bg-card border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-text-main">
                  {activeRound.voteMode === 'group'
                    ? t('groupConsensusVoteLabel')
                    : activeRound.voteMode === 'online_secret'
                    ? t('onlineSecretBallotLabel')
                    : t('secretBallotVoteLabel')}
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {activeRound.tieBrokenByJustice && (
                    <StatusIndicator tone="emerald">{t('tieBrokenByJusticeLabel')}</StatusIndicator>
                  )}
                  {activeRound.tieBroken && !activeRound.tieBrokenByJustice && (
                    <StatusIndicator tone="gold">{t('tieBrokenLabel')}</StatusIndicator>
                  )}
                  {activeRound.wasSavedBySpecial === 'protector' && (
                    <StatusIndicator tone="cyan">{t('savedByShieldLabel')}</StatusIndicator>
                  )}
                  {activeRound.bouncedFromName && (
                    <StatusIndicator tone="crimson">
                      {t('bouncedByBoomerangLabel')} ({activeRound.bouncedFromName})
                    </StatusIndicator>
                  )}
                </div>
              </div>

              {/* Target & Elimination Summary */}
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                {activeRound.mostVotedName && (
                  <span className="text-text-muted">
                    {t('mostVotedLabel')}:{' '}
                    <strong className="text-text-main">{activeRound.mostVotedName}</strong>
                  </span>
                )}
                {activeRound.eliminatedNames.length > 0 && (
                  <span className="text-danger-text">
                    {t('eliminatedOutcomeLabel')}:{' '}
                    <strong>{activeRound.eliminatedNames.join(', ')}</strong>
                  </span>
                )}
              </div>

              {activeRound.mrWhiteGuess && (
                <div
                  className={`p-3 rounded-[8px] border text-xs font-semibold flex flex-wrap items-center justify-between gap-2 ${
                    activeRound.mrWhiteGuess.isCorrect
                      ? 'bg-[#B49A62]/15 border-[#B49A62]/40 text-primary-text'
                      : 'bg-bg-surface border-border text-text-muted'
                  }`}
                >
                  <span>
                    {t('mrWhiteGuessAttemptLabel')} ({activeRound.mrWhiteGuess.playerName})
                    {activeRound.mrWhiteGuess.guess ? `: "${activeRound.mrWhiteGuess.guess}"` : ''}
                  </span>
                  <span className="font-bold">
                    {activeRound.mrWhiteGuess.forcedMissing
                      ? t('mrWhiteGuessMissing')
                      : activeRound.mrWhiteGuess.isCorrect
                      ? t('mrWhiteGuessSuccess')
                      : t('mrWhiteGuessFail')}
                  </span>
                </div>
              )}

              {activeRound.voteMode === 'group' ? (
                <div className="p-3 rounded-[8px] bg-[#B49A62]/10 border border-[#B49A62]/30 flex items-start gap-2.5 text-xs font-medium text-primary-text">
                  <Info size={15} className="shrink-0 mt-0.5" />
                  <span>{t('groupVoteNoBallotNote')}</span>
                </div>
              ) : (
                <>
                  {activeRound.voteTally.length > 0 && (
                    <div className="space-y-2">
                      {activeRound.voteTally.map((item) => {
                        const maxVotes = Math.max(1, activeRound.voteTally[0]?.count || 1);
                        const pct = Math.round((item.count / maxVotes) * 100);
                        return (
                          <div key={item.targetId} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-text-main">{item.targetName}</span>
                              <span className="text-cyan-text font-mono-code tabular-nums">
                                {item.count}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
                              <div
                                className="h-full bg-[#668F9A] rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeRound.votes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-border">
                      {activeRound.votes.map((v) => (
                        <div
                          key={`${v.voterId}-${v.targetId}`}
                          className="text-xs font-semibold text-text-muted bg-bg-surface px-3 py-1.5 rounded-[8px] flex items-center justify-between gap-2 border border-border"
                        >
                          <span className="text-text-main truncate">{v.voterName}</span>
                          <span className="text-[10px] opacity-70">{t('voteTargetLabel')}</span>
                          <span className="text-danger-text font-bold truncate">
                            {v.targetName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </IntelligencePanel>

      {/* 6. SPECIAL EVENTS & TURNING POINTS */}
      <IntelligencePanel className="p-5 space-y-4">
        <div
          className={`flex items-center gap-2 text-xs font-bold text-primary-text ${
            !isRTL ? 'uppercase tracking-wider' : ''
          }`}
        >
          <Zap size={14} />
          <h2>{t('caseSectionEvents')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-text-muted">{t('turningPointsHeading')}</h3>
            {resolvedFile.turningPoints.length === 0 ? (
              <p className="text-xs font-medium text-text-muted py-2">
                {t('noSpecialEventsRecorded')}
              </p>
            ) : (
              <div className="space-y-2">
                {resolvedFile.turningPoints.map((tp, idx) => (
                  <div
                    key={`${tp.kind}-${tp.round}-${idx}`}
                    className="rounded-[10px] bg-bg-card border border-border p-3 flex items-start gap-2.5"
                  >
                    <ClassifiedStamp tone="gold">R{tp.round}</ClassifiedStamp>
                    <div className="text-start min-w-0">
                      <p className="text-xs font-bold text-text-main">
                        {t(TURNING_POINT_KEY_MAP[tp.kind])}
                      </p>
                      {(tp.actorName || tp.targetName) && (
                        <p className="text-[11px] font-medium text-text-muted mt-0.5">
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
            <h3 className="text-xs font-bold text-text-muted">{t('eventsLogHeading')}</h3>
            {resolvedFile.specialEvents.length === 0 ? (
              <p className="text-xs font-medium text-text-muted py-2">
                {t('noSpecialEventsRecorded')}
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {resolvedFile.specialEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-[10px] bg-bg-card border border-border p-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 text-start">
                      <span className="font-bold text-text-main block truncate">
                        {t(EVENT_TYPE_KEY_MAP[ev.type])}
                      </span>
                      {(ev.actorName || ev.targetName) && (
                        <span className="text-[11px] font-medium text-text-muted">
                          {[ev.actorName, ev.targetName].filter(Boolean).join(' → ')}
                        </span>
                      )}
                    </div>
                    <ClassifiedStamp tone="cyan">R{ev.round}</ClassifiedStamp>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </IntelligencePanel>

      {/* 7. FINAL VERDICT & DETERMINISTIC AWARDS */}
      <ClassifiedDossierPanel className="p-5 space-y-4">
        <div
          className={`flex items-center gap-2 text-xs font-bold text-primary-text ${
            !isRTL ? 'uppercase tracking-wider' : ''
          }`}
        >
          <Sparkles size={14} />
          <h2>{t('caseSectionVerdict')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resolvedFile.awards.map((award) => {
            const isAwarded = award.status === 'awarded' && award.recipientName;
            return (
              <div
                key={award.awardId}
                className={`rounded-[12px] p-4 border flex flex-col justify-between gap-3 ${
                  isAwarded
                    ? 'bg-[#B49A62]/10 border-[#B49A62]/40'
                    : 'bg-bg-card/60 border-border opacity-75'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[8px] overflow-hidden bg-[#080B10] border border-border shrink-0">
                    <img
                      src={AWARD_IMAGE_MAP[award.awardId]}
                      alt={t(`caseAwardTitle_${award.awardId}`)}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover ${
                        isAwarded ? '' : 'grayscale opacity-50'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 text-start">
                    <h3 className="text-sm font-bold text-text-main leading-tight">
                      {t(`caseAwardTitle_${award.awardId}`)}
                    </h3>
                    {isAwarded ? (
                      <p className="text-xs font-bold text-primary-text mt-1 truncate">
                        {award.recipientName}
                      </p>
                    ) : (
                      <p className="text-[11px] font-semibold text-text-muted mt-1 flex items-center gap-1">
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
                    <p className="text-xs font-mono-code font-bold text-cyan-text tabular-nums">
                      {formatMetric(award.metricValue, award.metricUnit)}
                    </p>
                  )}
                  <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                    {t(award.reasonKey)}
                  </p>
                  {award.tiedCandidates && award.tiedCandidates.length > 1 && (
                    <p className="text-[10px] font-semibold text-primary-text">
                      {t('tiedWithLabel')}: {award.tiedCandidates.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ClassifiedDossierPanel>
    </div>
  );
};
