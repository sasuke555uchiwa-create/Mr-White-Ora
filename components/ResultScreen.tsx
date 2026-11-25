import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Trophy, Check, Heart, FileText } from 'lucide-react';
import { Avatar } from './Avatar';
import { Player } from '../types';
import { playSound } from '../services/soundService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { getRoleAsset, getRoleTitle, getRoleVisualIdentity } from '../data/specialRoles';
import { getPlayerRoundPoints, resolveWinningFaction } from '../services/gameScoring';
import {
  BottomActionBar,
  ClassifiedStamp,
  IntelligencePanel,
  ModalShell,
  OperationPhaseBadge,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

interface ResultScreenProps {
  players: Player[];
  impostorIndex: number;
  secretWord: string;
  undercoverWord: string;
  voteData: Record<number, number>;
  onGameEnd: (winner: 'impostor' | 'citizens' | 'fool') => void;
  onNext: () => void;
  roundWinner: 'impostor' | 'citizens' | 'fool' | null;
  winReason?: 'impostor_guessed' | 'citizens_wrong_vote' | 'impostor_caught' | 'fool_won' | null;
  winningMrWhiteId?: number | null;
  isOnline?: boolean;
  isHost?: boolean;
  onBackToLobby?: () => void;
  onLeaveRoom?: () => void;
  onOpenCaseFile?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  players,
  secretWord,
  undercoverWord,
  voteData,
  onGameEnd,
  onNext,
  roundWinner,
  winReason,
  winningMrWhiteId = null,
  isOnline = false,
  isHost = true,
  onBackToLobby,
  onLeaveRoom,
  onOpenCaseFile,
}) => {
  const [winnerSelected, setWinnerSelected] = useState<boolean>(!!roundWinner);
  const [showWinOverlay, setShowWinOverlay] = useState<boolean>(!!roundWinner);
  const undercover = players.find((p) => p.role === 'undercover');
  const settings = getSettings();
  const lang = settings.language;
  const isRTL = ['ar', 'sa'].includes(lang);
  const t = (key: string) => getUITranslation(lang, key);

  const winningFaction = resolveWinningFaction(players, roundWinner, winReason);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (roundWinner) {
        playSound(winReason === 'impostor_guessed' ? 'mrWhiteWin' : 'verdict');
      } else {
        playSound('dramatic');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [roundWinner, winReason]);

  const handleWinSelection = (winner: 'impostor' | 'citizens') => {
    playSound('verdict');
    onGameEnd(winner);
    setWinnerSelected(true);
    setShowWinOverlay(true);
  };

  const getResultTitle = () => {
    if (!roundWinner) return '';
    switch (winningFaction) {
      case 'both':
        return t('impostorAndUndercoverWon');
      case 'mrwhite_solo':
        return t('impostorWon');
      case 'undercover_solo':
        return t('undercoverWon');
      default:
        return t('citizensWon');
    }
  };

  const getResultSubtitle = () => {
    if (!winReason) {
      switch (winningFaction) {
        case 'both':
          return t('impostorAndUndercoverTrickedThem');
        case 'mrwhite_solo':
          return t('impostorTrickedThem');
        case 'undercover_solo':
          return t('undercoverTrickedThem');
        default:
          return t('citizensCaughtImpostor');
      }
    }

    switch (winReason) {
      case 'impostor_guessed':
        return t('guessedWordLastMoment');
      case 'citizens_wrong_vote':
        if (winningFaction === 'undercover_solo') return t('undercoverControlledGame');
        if (winningFaction === 'mrwhite_solo') return t('impostorControlledGame');
        return t('evilsControlledGame');
      case 'impostor_caught':
        return t('allEvilsEliminated');
      default:
        return t('citizensCaughtImpostor');
    }
  };

  const getWinImage = () => {
    switch (winningFaction) {
      case 'citizens':
        return '/images/2.png';
      case 'undercover_solo':
        return '/images/3.png';
      case 'mrwhite_solo':
        return '/images/1.png';
      case 'both':
        return '/images/4.png';
      default:
        return '/images/2.png';
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex flex-col min-h-full items-center px-4 sm:px-6 pt-4 pb-0 animate-fade-in relative max-w-4xl mx-auto w-full">
      <div className="w-full max-w-2xl flex flex-col items-center text-center mb-6">
        {!winnerSelected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mb-4">
            <IntelligencePanel className="p-4 sm:p-5">
              <h3 className="text-center text-text-main font-bold mb-3 text-base flex items-center justify-center gap-2">
                <Trophy size={18} className="text-primary-text" />
                <span>{t('whoIsWinner')}</span>
              </h3>
              <div className="flex gap-2.5">
                <TacticalButton
                  onClick={() => handleWinSelection('impostor')}
                  variant="danger"
                  size="md"
                  className="flex-1"
                  icon={
                    <img
                      src={getRoleAsset('mrwhite')}
                      alt="Mr. White"
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-[4px] object-cover"
                    />
                  }
                >
                  {t('mrWhite')}
                </TacticalButton>
                <TacticalButton
                  onClick={() => handleWinSelection('citizens')}
                  variant="cyan"
                  size="md"
                  className="flex-1"
                  icon={
                    <img
                      src={getRoleAsset('citizen')}
                      alt="Citizen"
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-[4px] object-cover"
                    />
                  }
                >
                  {t('citizen')}
                </TacticalButton>
              </div>
            </IntelligencePanel>
          </motion.div>
        )}

        {winnerSelected && (
          <>
            {/* Official Debrief Summary + Secret Word Cipher */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="w-full mb-5"
            >
              <IntelligencePanel className="relative overflow-hidden border-[#B49A62]/40">
                <div aria-hidden="true" className="blacksite-hairline absolute inset-x-0 top-0 pointer-events-none" />

                <div className="grid grid-cols-1 sm:grid-cols-12 items-stretch">
                  {/* Faction Outcome Artwork Strip */}
                  <div className="sm:col-span-5 relative aspect-[16/9] sm:aspect-auto min-h-[130px] bg-[#080B10] overflow-hidden border-b sm:border-b-0 sm:border-e border-border">
                    <img
                      src={getWinImage()}
                      alt={getResultTitle()}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#080B10]/35 to-transparent flex flex-col justify-between p-3 text-start">
                      <OperationPhaseBadge phase="verdict" lang={lang} />
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-[#ECEFF4] leading-tight">
                          {getResultTitle()}
                        </h2>
                        <p className="text-[11px] font-medium text-[#C9B17B] line-clamp-2 mt-0.5">
                          {getResultSubtitle()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Secret Word Cipher Breakdown */}
                  <div className="sm:col-span-7 p-4 sm:p-5 flex flex-col justify-center gap-3 text-start">
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3">
                      <div className="rounded-[10px] bg-bg-card border border-[#668F9A]/35 p-3">
                        <h3
                          className={`text-text-muted mb-1 text-[11px] font-semibold flex items-center gap-1 ${
                            !isRTL ? 'uppercase tracking-wider' : ''
                          }`}
                        >
                          <Key size={11} className="text-cyan-text" />
                          <span>{t('citizenWord')}</span>
                        </h3>
                        <p className="text-lg sm:text-xl font-extrabold text-cyan-text truncate">
                          {secretWord}
                        </p>
                      </div>

                      {undercover && (
                        <div className="rounded-[10px] bg-bg-card border border-[#A46F44]/35 p-3">
                          <h3
                            className={`text-text-muted mb-1 text-[11px] font-semibold flex items-center gap-1 ${
                              !isRTL ? 'uppercase tracking-wider' : ''
                            }`}
                          >
                            <Key size={11} className="text-[#C88D5E]" />
                            <span>{t('undercoverWordLabel')}</span>
                          </h3>
                          <p className="text-lg sm:text-xl font-extrabold text-[#C88D5E] truncate">
                            {undercoverWord}
                          </p>
                        </div>
                      )}
                    </div>

                    {winReason === 'impostor_guessed' && (
                      <div className="flex justify-start">
                        <StatusIndicator tone="crimson">{t('heGuessedIt')}</StatusIndicator>
                      </div>
                    )}
                  </div>
                </div>
              </IntelligencePanel>
            </motion.div>

            {/* Players Roles & Scores Breakdown */}
            <div className="w-full">
              <h3
                className={`text-text-muted text-center text-xs font-semibold mb-3 ${
                  !isRTL ? 'uppercase tracking-wider' : ''
                }`}
              >
                {t('roundDetails')}
              </h3>
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-2.5"
              >
                {players.map((p) => {
                  const roundScore = winnerSelected
                    ? getPlayerRoundPoints(p, players, roundWinner, winReason, winningMrWhiteId)
                    : 0;
                  let correctVote = false;

                  if (winnerSelected && p.role !== 'mrwhite' && p.role !== 'undercover') {
                    const myVote = voteData[p.id];
                    correctVote = players.some(
                      (other) =>
                        (other.role === 'mrwhite' || other.role === 'undercover') &&
                        myVote === other.id
                    );
                  }

                  const roleTitle = getRoleTitle(p.role, lang);
                  const roleImg = getRoleAsset(p.role);
                  const roleVisual = getRoleVisualIdentity(p.role, lang);
                  const specialTitle = p.specialRole ? getRoleTitle(p.specialRole, lang) : null;
                  const partner =
                    p.loverPartnerId !== undefined
                      ? players.find((other) => other.id === p.loverPartnerId)
                      : null;

                  const cardAccent =
                    p.role === 'mrwhite'
                      ? 'border-[#B49A62]/45 bg-[#B49A62]/10'
                      : p.role === 'undercover'
                      ? 'border-[#A46F44]/45 bg-[#A46F44]/10'
                      : '';

                  return (
                    <motion.div key={p.id} variants={item}>
                      <PlayerIntelligenceCard
                        className={`flex items-center justify-between p-3 ${cardAccent}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar avatar={p.avatar} name={p.name} size={42} />
                          <div className="flex flex-col text-start min-w-0">
                            <span className="text-sm font-bold text-text-main truncate">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <img
                                src={roleImg}
                                alt={roleTitle}
                                referrerPolicy="no-referrer"
                                className={`w-4 h-4 rounded-[4px] object-cover border ${roleVisual.frameBorderClass}`}
                              />
                              <span className={`text-xs font-bold ${roleVisual.titleColorClass}`}>
                                {roleTitle}
                              </span>
                              {specialTitle && (
                                <span className="text-xs font-semibold text-primary-text">
                                  · {specialTitle}
                                </span>
                              )}
                              {partner && (
                                <span className="text-xs font-semibold text-[#C8A189] inline-flex items-center gap-0.5">
                                  <Heart size={11} className="fill-current" />
                                  {partner.name}
                                </span>
                              )}
                              {p.foolBonusAwarded && (
                                <span className="text-xs font-bold text-primary-text">
                                  · {lang === 'ar' ? 'مكافأة المهرج +4' : 'Mr. Joy +4'}
                                </span>
                              )}
                              {correctVote && (
                                <span className="text-xs text-emerald-text font-bold">
                                  · {t('correctVoteLabel')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {roundScore > 0 && (
                            <span className="text-emerald-text font-mono-code font-bold text-sm tabular-nums">
                              +{roundScore}
                            </span>
                          )}
                          <span className="bg-bg-surface px-2.5 py-1 rounded-[6px] text-xs text-text-main font-mono-code font-bold border border-border-strong tabular-nums">
                            {p.score}
                          </span>
                        </div>
                      </PlayerIntelligenceCard>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </>
        )}
      </div>

      {winnerSelected && !isOnline && (
        <BottomActionBar className="self-stretch mt-auto">
          <div className="w-full max-w-lg mx-auto flex flex-col sm:flex-row gap-2.5">
            {onOpenCaseFile && (
              <TacticalButton
                onClick={() => {
                  playSound('dossierOpen');
                  onOpenCaseFile();
                }}
                variant="cyan"
                size="lg"
                className="flex-1"
                icon={<FileText size={16} />}
              >
                {t('viewClassifiedCaseFile')}
              </TacticalButton>
            )}
            <TacticalButton
              onClick={() => {
                playSound('click');
                onNext();
              }}
              variant="primary"
              size="lg"
              className="flex-1"
            >
              {t('next')}
            </TacticalButton>
          </div>
        </BottomActionBar>
      )}

      {winnerSelected && isOnline && (
        <BottomActionBar className="self-stretch mt-auto">
          <div className="w-full max-w-lg mx-auto space-y-2.5">
            {onOpenCaseFile && (
              <TacticalButton
                onClick={() => {
                  playSound('dossierOpen');
                  onOpenCaseFile();
                }}
                variant="cyan"
                size="lg"
                fullWidth
                icon={<FileText size={16} />}
              >
                {t('viewClassifiedCaseFile')}
              </TacticalButton>
            )}
            {isHost ? (
              <div className="flex flex-col gap-2.5">
                <TacticalButton
                  onClick={() => {
                    playSound('click');
                    onNext();
                  }}
                  variant="primary"
                  size="lg"
                  fullWidth
                >
                  {t('nextRound')}
                </TacticalButton>
                <div className="flex gap-2.5">
                  {onBackToLobby && (
                    <TacticalButton
                      onClick={() => {
                        playSound('click');
                        onBackToLobby();
                      }}
                      variant="secondary"
                      size="md"
                      className="flex-1"
                    >
                      {t('backToLobby')}
                    </TacticalButton>
                  )}
                  {onLeaveRoom && (
                    <TacticalButton
                      onClick={() => {
                        playSound('click');
                        onLeaveRoom();
                      }}
                      variant="danger"
                      size="md"
                      className="flex-1"
                    >
                      {t('leaveRoom')}
                    </TacticalButton>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="w-full py-3 rounded-[10px] bg-bg-card border border-border text-center text-xs font-semibold text-text-muted">
                  {t('waitingForHostToStartNewRound')}
                </div>
                {onLeaveRoom && (
                  <TacticalButton
                    onClick={() => {
                      playSound('click');
                      onLeaveRoom();
                    }}
                    variant="danger"
                    size="md"
                    fullWidth
                  >
                    {t('leaveRoom')}
                  </TacticalButton>
                )}
              </div>
            )}
          </div>
        </BottomActionBar>
      )}

      {/* Restrained BLACKSITE Classified Verdict Overlay */}
      <AnimatePresence>
        {winnerSelected && showWinOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#080B10]/88 p-5"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                ariaLabel={getResultTitle()}
                className="border-[#B49A62]/45 p-4 flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <OperationPhaseBadge phase="verdict" lang={lang} />
                  <ClassifiedStamp tone={winningFaction === 'citizens' ? 'cyan' : 'gold'}>
                    OPERATION COMPLETE
                  </ClassifiedStamp>
                </div>

                <div className="relative w-full rounded-[12px] overflow-hidden aspect-[4/3] border border-border-strong bg-[#080B10]">
                  <img
                    src={getWinImage()}
                    alt={getResultTitle()}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#080B10]/95 via-[#080B10]/55 to-transparent flex items-end justify-center pb-4 px-5">
                    <h3 className="text-xl font-bold text-[#ECEFF4] text-center leading-tight">
                      {getResultTitle()}
                    </h3>
                  </div>
                </div>

                <p className="text-text-muted font-medium text-xs sm:text-sm text-center px-2">
                  {getResultSubtitle()}
                </p>

                <TacticalButton
                  onClick={() => {
                    playSound('click');
                    setShowWinOverlay(false);
                  }}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Check size={18} strokeWidth={2.5} />}
                >
                  {t('ok')}
                </TacticalButton>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
