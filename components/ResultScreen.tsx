import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Trophy, Check, Heart } from 'lucide-react';
import { Avatar } from './Avatar';
import { Player } from '../types';
import { playSound } from '../services/soundService';
import { getUITranslation } from '../translations';
import { getSettings } from '../services/storageService';
import { getRoleAsset, getRoleTitle } from '../data/specialRoles';
import { getPlayerRoundPoints, resolveWinningFaction } from '../services/gameScoring';

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
}

const SPARKLE_POSITIONS = [
  { top: '18%', left: '-6%' },
  { top: '28%', left: '98%' },
  { top: '48%', left: '-8%' },
  { top: '60%', left: '100%' },
  { top: '12%', left: '82%' },
  { top: '72%', left: '14%' },
  { top: '76%', left: '84%' },
  { top: '34%', left: '8%' },
];

export const ResultScreen: React.FC<ResultScreenProps> = ({
  players,
  impostorIndex,
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
}) => {
  const [winnerSelected, setWinnerSelected] = useState<boolean>(!!roundWinner);
  const [showWinOverlay, setShowWinOverlay] = useState<boolean>(!!roundWinner);
  const impostor = players[impostorIndex];
  const undercover = players.find((p) => p.role === 'undercover');
  const settings = getSettings();
  const lang = settings.language;
  const t = (key: string) => getUITranslation(lang, key);

  const winningFaction = resolveWinningFaction(players, roundWinner, winReason);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (roundWinner) {
        playSound(winReason === 'impostor_guessed' ? 'mrWhiteWin' : 'win');
      } else {
        playSound('dramatic');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [roundWinner, winReason]);

  const handleWinSelection = (winner: 'impostor' | 'citizens') => {
    playSound('win');
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
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -16 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <div className="flex flex-col min-h-full items-center p-4 animate-fade-in relative max-w-3xl mx-auto w-full pb-24">
      <div className="card-container w-full max-w-lg flex flex-col items-center text-center mb-4">
        {!winnerSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full card-modern p-4 mb-4"
          >
            <h3 className="text-center text-text-main font-black mb-3 text-base flex items-center justify-center gap-2">
              <Trophy size={18} className="text-accent" />
              <span>{t('whoIsWinner')}</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleWinSelection('impostor')}
                className="btn-modern btn-modern-danger flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2"
              >
                <img src={getRoleAsset('mrwhite')} alt="Mr. White" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover border border-white/30" />
                <span className="text-white">{t('mrWhite')}</span>
              </button>
              <button
                onClick={() => handleWinSelection('citizens')}
                className="btn-modern btn-modern-accent flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2"
              >
                <img src={getRoleAsset('citizen')} alt="Citizen" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover border border-white/30" />
                <span className="text-white">{t('citizen')}</span>
              </button>
            </div>
          </motion.div>
        )}

        {winnerSelected && (
          <>
            {/* Secret Word Reveal */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card-modern py-4 px-5 w-full mb-4 text-center relative overflow-hidden"
            >
              <div className="flex justify-around items-center relative z-10 gap-3">
                <div>
                  <h3 className="text-text-muted mb-1 text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1">
                    <Key size={12} />
                    <span>{t('citizenWord')}</span>
                  </h3>
                  <p className="text-xl font-black text-sky-400 drop-shadow-md">{secretWord}</p>
                </div>
                {undercover && (
                  <div>
                    <h3 className="text-text-muted mb-1 text-xs uppercase tracking-widest font-black flex items-center justify-center gap-1">
                      <Key size={12} />
                      <span>{t('undercoverWordLabel')}</span>
                    </h3>
                    <p className="text-xl font-black text-orange-400 drop-shadow-md">
                      {undercoverWord}
                    </p>
                  </div>
                )}
              </div>

              {winReason === 'impostor_guessed' && (
                <div className="mt-3 bg-rose-500 text-white text-xs py-1 px-3 rounded-full inline-block font-black shadow-lg">
                  {t('heGuessedIt')}
                </div>
              )}
            </motion.div>

            {/* Players Roles & Scores Breakdown (Official Yanstar Points) */}
            <div className="w-full">
              <h3 className="text-text-muted text-center text-xs font-black uppercase tracking-widest mb-3">
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
                  const specialTitle = p.specialRole ? getRoleTitle(p.specialRole, lang) : null;
                  const partner =
                    p.loverPartnerId !== undefined
                      ? players.find((other) => other.id === p.loverPartnerId)
                      : null;

                  const cardAccent =
                    p.role === 'mrwhite'
                      ? 'border-amber-400/40 bg-amber-500/10'
                      : p.role === 'undercover'
                      ? 'border-purple-500/40 bg-purple-500/10'
                      : 'border-border-strong bg-bg-surface/85';

                  return (
                    <motion.div
                      key={p.id}
                      variants={item}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${cardAccent}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar avatar={p.avatar} name={p.name} size={42} />
                        <div className="flex flex-col text-start min-w-0">
                          <span className="text-sm font-black text-text-main truncate">
                            {p.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <img
                              src={roleImg}
                              alt={roleTitle}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full object-cover border border-white/20"
                            />
                            <span
                              className={`text-xs font-black ${
                                p.role === 'mrwhite'
                                  ? 'text-amber-300'
                                  : p.role === 'undercover'
                                  ? 'text-purple-300'
                                  : 'text-sky-400'
                              }`}
                            >
                              {roleTitle}
                            </span>
                            {specialTitle && (
                              <span className="text-xs font-bold text-violet-300">
                                · {specialTitle}
                              </span>
                            )}
                            {partner && (
                              <span className="text-xs font-bold text-pink-400 inline-flex items-center gap-0.5">
                                <Heart size={11} className="fill-current" />
                                {partner.name}
                              </span>
                            )}
                            {p.foolBonusAwarded && (
                              <span className="text-xs font-black text-amber-300">
                                · {lang === 'ar' ? 'مكافأة المهرج +4' : 'Mr. Joy +4'}
                              </span>
                            )}
                            {correctVote && (
                              <span className="text-xs text-emerald-400 font-black">
                                · {t('correctVoteLabel')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {roundScore > 0 && (
                          <span className="text-emerald-400 font-black text-sm tabular-nums">
                            +{roundScore}
                          </span>
                        )}
                        <span className="bg-bg-dark px-2.5 py-1 rounded-xl text-xs text-text-main font-black border border-border-strong tabular-nums">
                          {p.score}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </>
        )}
      </div>

      {winnerSelected && !isOnline && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playSound('click');
            onNext();
          }}
          className="btn-modern w-full max-w-md py-4 rounded-[2rem] text-lg font-black mt-auto text-white"
        >
          <span className="tracking-wide">{t('next')}</span>
        </motion.button>
      )}

      {winnerSelected && isOnline && (
        <div className="w-full max-w-md mt-auto space-y-2.5">
          {isHost ? (
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  playSound('click');
                  onNext();
                }}
                className="btn-modern w-full py-4 rounded-[2rem] text-lg font-black text-white"
              >
                {t('nextRound')}
              </button>
              <div className="flex gap-2.5">
                {onBackToLobby && (
                  <button
                    onClick={() => {
                      playSound('click');
                      onBackToLobby();
                    }}
                    className="btn-modern btn-modern-outline flex-1 py-3 rounded-2xl text-sm font-black"
                  >
                    {t('backToLobby')}
                  </button>
                )}
                {onLeaveRoom && (
                  <button
                    onClick={() => {
                      playSound('click');
                      onLeaveRoom();
                    }}
                    className="flex-1 py-3 rounded-2xl text-sm font-black bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/30 transition-colors"
                  >
                    {t('leaveRoom')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-center text-sm font-bold text-text-muted">
                {t('waitingForHostToStartNewRound')}
              </div>
              {onLeaveRoom && (
                <button
                  onClick={() => {
                    playSound('click');
                    onLeaveRoom();
                  }}
                  className="w-full py-3.5 rounded-2xl text-sm font-black bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-400/30 transition-colors"
                >
                  {t('leaveRoom')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Win Card Overlay */}
      <AnimatePresence>
        {winnerSelected && showWinOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 18 }}
              className="w-full max-w-sm mx-auto relative"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                transition={{
                  opacity: { delay: 0.2, duration: 0.5 },
                  rotate: { duration: 30, repeat: Infinity, ease: 'linear' },
                }}
                className="absolute inset-[-45%] z-0 pointer-events-none flex items-center justify-center"
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background:
                      'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.14) 0deg 15deg, transparent 15deg 30deg)',
                    maskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 70%)',
                  }}
                />
              </motion.div>

              <div className="absolute inset-0 z-0 pointer-events-none">
                {SPARKLE_POSITIONS.map((pos, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [0, 1.3, 0],
                      opacity: [0, 1, 0],
                      rotate: [0, 90],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.28,
                      ease: 'easeInOut',
                    }}
                    className="absolute w-5 h-5 bg-yellow-300"
                    style={{
                      top: pos.top,
                      left: pos.left,
                      clipPath:
                        'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    }}
                  />
                ))}
              </div>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="relative z-10 w-full rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.55)] aspect-[3/4] border-2 border-white/25"
              >
                <img
                  src={getWinImage()}
                  alt={getResultTitle()}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-end justify-center pb-5 px-6">
                  <h3 className="text-2xl font-black text-white text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]">
                    {getResultTitle()}
                  </h3>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="relative z-10 w-full text-center mt-5 card-modern p-4"
              >
                <p className="text-text-main font-bold text-sm">{getResultSubtitle()}</p>
              </motion.div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 16, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.65, type: 'spring' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                playSound('click');
                setShowWinOverlay(false);
              }}
              className="mt-8 w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.5)] border-4 border-white/25 text-white"
            >
              <Check size={32} strokeWidth={3} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
