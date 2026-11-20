import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineRoom } from '../hooks/useOnlineRoom';
import { useTurnTimer } from '../hooks/useTurnTimer';
import {
  advanceOnlineTurn,
  getOnlineActionErrorKey,
  leaveOnlineRoom,
  markOnlineRevealReady,
  nextOnlineMatch,
  proceedAfterOnlineVoteReveal,
  resolveOnlineVotes,
  returnOnlineToLobby,
  startOnlineRound,
  startOnlineVoting,
  submitOnlineClue,
  submitOnlineMrWhiteGuess,
  submitOnlineVote,
} from '../utils/onlineRoomService';
import { RevealVoteResult } from './RevealVoteResult';
import { ImpostorGuessScreen } from './ImpostorGuessScreen';
import { ResultScreen } from './ResultScreen';
import { ChatBox } from './ChatBox';
import { Avatar } from './Avatar';
import { PlayerStatsModal } from './PlayerStatsModal';
import { getRoleAsset } from '../data/specialRoles';
import { playSound } from '../services/soundService';
import { Player, PlayerRole } from '../types';
import {
  MessageCircle,
  XCircle,
  Play,
  Eye,
  EyeOff,
  LogOut,
  Clock,
  Send,
  SkipForward,
  Check,
  ShieldAlert,
  Crown,
  Vote,
  HelpCircle,
} from 'lucide-react';
import { getUITranslation } from '../translations';
import { getSettings, recordOnlineSessionMatch } from '../services/storageService';
import { showToast } from '../utils/toast';
import { getPlayerRoundPoints } from '../src/game/winEngine';

interface OnlineClue {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  text: string;
  round: number;
  skipped?: boolean;
}

interface OnlineGameScreenProps {
  roomId: string;
  onBack: () => void;
  onReturnToLobby?: () => void;
}

export const OnlineGameScreen: React.FC<OnlineGameScreenProps> = ({
  roomId,
  onBack,
  onReturnToLobby,
}) => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<any>(null);
  const [showWordPeek, setShowWordPeek] = useState(false);
  const [peekRevealed, setPeekRevealed] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [clueInput, setClueInput] = useState('');
  const [submittingClue, setSubmittingClue] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [votingNowMs, setVotingNowMs] = useState(() => Date.now());

  const isLeavingRef = useRef(false);
  const lastAutoAdvancedTurnRef = useRef<string | null>(null);
  const cluesEndRef = useRef<HTMLDivElement>(null);

  const settings = getSettings();
  const isRTL = ['ar', 'sa'].includes(settings.language);
  const t = (key: string, params?: Record<string, any>) => {
    let text = getUITranslation(settings.language, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const { room, privatePlayer } = useOnlineRoom({
    roomId,
    user,
    isLeavingRef,
    subscribePrivatePlayer: true,
    onRoomClosed: () => {
      showToast(t('roomClosed'), 'warning');
      onBack();
    },
    onKicked: () => {
      showToast(t('kickedFromRoom'), 'error');
      onBack();
    },
    onHostPromoted: () => {
      showToast(t('hostPromoted'), 'info');
    },
    onOfflineLeave: () => {
      showToast(t('lostConnectionGame'), 'error');
      onBack();
    },
  });

  useEffect(() => {
    if (!room || isLeavingRef.current) return;
    if (room.status === 'waiting' && onReturnToLobby) {
      onReturnToLobby();
    }
  }, [room, onReturnToLobby]);

  useEffect(() => {
    if (!user?.uid || !room?.gameState) return;
    const gs = room.gameState;
    if (gs.phase !== 'RESULT' || !gs.matchId || !gs.revealedResult?.rolesByUid) return;

    const myRole = gs.revealedResult.rolesByUid[user.uid];
    if (!myRole) return;

    const mappedPlayers: Player[] = (room.players || []).map((p: any, idx: number) => ({
      id: idx,
      uid: p.uid,
      name: p.name,
      avatar: p.avatar || '',
      role: (gs.revealedResult.rolesByUid[p.uid] || 'citizen') as PlayerRole,
      isImpostor: gs.revealedResult.rolesByUid[p.uid] === 'mrwhite',
      score: p.score || 0,
      isEliminated: Boolean(p.isEliminated),
    }));

    const me = mappedPlayers.find((p) => p.uid === user.uid);
    if (!me) return;

    const winningMrWhiteUid = gs.winningMrWhiteUid || gs.revealedResult.impostorId;
    const winningMrWhiteId =
      gs.winReason === 'impostor_guessed'
        ? mappedPlayers.find((p) => p.uid === winningMrWhiteUid)?.id ?? null
        : null;

    const serverWinnerFlag = gs.revealedResult?.winnersByUid?.[user.uid];
    const didWin =
      typeof serverWinnerFlag === 'boolean'
        ? serverWinnerFlag
        : getPlayerRoundPoints(me, mappedPlayers, gs.winner, gs.winReason, winningMrWhiteId) > 0;

    recordOnlineSessionMatch({
      uid: user.uid,
      matchKey: `${roomId}:${gs.matchId}`,
      role: myRole,
      won: didWin,
    });
  }, [room, roomId, user?.uid]);

  const isHost = room?.hostId === user?.uid;
  const gameState = room?.gameState || {};
  const phase: string = gameState.phase || 'SETUP_PENDING';
  const difficulty: 'easy' | 'hard' = gameState.difficulty || room?.difficulty || 'easy';
  const currentRound: number = gameState.round || 1;
  const turnsCompleted: boolean = Boolean(gameState.turnsCompleted);

  const timeLeftSeconds = useTurnTimer(
    phase === 'PLAYING' && !turnsCompleted,
    gameState.turnEndsAt,
    500
  );

  // Map public players without ever exposing unrevealed opponent roles during active play
  const players: Player[] = useMemo(() => {
    const revealedMap: Record<string, PlayerRole> | undefined =
      phase === 'RESULT' ? gameState.revealedResult?.rolesByUid : undefined;

    return (room?.players || []).map((p: any, index: number) => {
      let resolvedRole: PlayerRole = 'citizen';

      if (phase === 'RESULT' && revealedMap?.[p.uid]) {
        resolvedRole = revealedMap[p.uid];
      } else if (phase === 'REVEAL_VOTE_RESULT' && p.uid === gameState.mostVotedId && gameState.mostVotedRevealedRole) {
        resolvedRole = gameState.mostVotedRevealedRole as PlayerRole;
      } else if (p.revealedRole) {
        resolvedRole = p.revealedRole as PlayerRole;
      } else if (
        user &&
        p.uid === user.uid &&
        privatePlayer?.role &&
        privatePlayer.role !== 'hidden'
      ) {
        resolvedRole = privatePlayer.role as PlayerRole;
      }

      return {
        id: index,
        uid: p.uid,
        name: p.name,
        role: resolvedRole,
        isImpostor: resolvedRole === 'mrwhite' || resolvedRole === 'undercover',
        isEliminated: Boolean(p.isEliminated),
        score: p.score || 0,
        avatar: p.avatar,
      };
    });
  }, [
    room?.players,
    phase,
    gameState.revealedResult,
    gameState.mostVotedId,
    gameState.mostVotedRevealedRole,
    privatePlayer?.role,
    user,
  ]);

  const alivePlayers = useMemo(() => players.filter((p) => !p.isEliminated), [players]);
  const turnOrder: string[] = Array.isArray(gameState.turnOrder) ? gameState.turnOrder : [];
  const currentTurnIndex: number = gameState.currentTurnIndex || 0;
  const clues: OnlineClue[] = Array.isArray(gameState.clues) ? gameState.clues : [];
  const activeSpeakerUid: string | null = !turnsCompleted
    ? turnOrder[currentTurnIndex] || null
    : null;

  useEffect(() => {
    if (phase === 'PLAYING' && cluesEndRef.current) {
      cluesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [clues.length, phase]);

  useEffect(() => {
    if (phase !== 'VOTING') return;
    setVotingNowMs(Date.now());
    const id = window.setInterval(() => setVotingNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Auto-advance via server if timer hits 0 OR active speaker left/was eliminated
  useEffect(() => {
    if (!room || !user || phase !== 'PLAYING' || turnsCompleted || turnOrder.length === 0) return;

    const aliveSet = new Set(alivePlayers.map((p) => p.uid));
    const currentSpeakerAlive = activeSpeakerUid ? aliveSet.has(activeSpeakerUid) : false;
    const turnKey = `${currentRound}-${currentTurnIndex}`;

    if (!currentSpeakerAlive && isHost) {
      if (lastAutoAdvancedTurnRef.current !== turnKey) {
        lastAutoAdvancedTurnRef.current = turnKey;
        void advanceOnlineTurn(roomId, 'skip', currentTurnIndex).catch((err) =>
          console.warn('Auto advance missing speaker error:', err)
        );
      }
      return;
    }

    if (
      gameState.turnEndsAt &&
      timeLeftSeconds <= 0 &&
      (isHost || activeSpeakerUid === user.uid)
    ) {
      if (lastAutoAdvancedTurnRef.current !== turnKey) {
        lastAutoAdvancedTurnRef.current = turnKey;
        void advanceOnlineTurn(roomId, 'timeout', currentTurnIndex).catch((err) =>
          console.warn('Auto advance timeout error:', err)
        );
      }
    }
  }, [
    room,
    roomId,
    user,
    phase,
    turnsCompleted,
    timeLeftSeconds,
    activeSpeakerUid,
    alivePlayers,
    isHost,
    currentRound,
    currentTurnIndex,
    gameState.turnEndsAt,
    turnOrder.length,
  ]);

  if (!room || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLeaveConfirmed = async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    setShowLeaveConfirm(false);
    try {
      await leaveOnlineRoom(roomId, user.uid);
    } catch (err) {
      console.error('Leave room failed', err);
    } finally {
      onBack();
    }
  };

  const handleStartRound = async () => {
    if (!isHost || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await startOnlineRound(roomId);
    } catch (err) {
      console.error(err);
      setError(t('errorLoadingWords'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevealComplete = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      playSound('click');
      await markOnlineRevealReady(roomId);
    } catch (err) {
      console.error('Mark reveal ready failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSubmitClue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = clueInput.trim();
    if (!trimmed || submittingClue || activeSpeakerUid !== user.uid) return;
    const me = players.find((p) => p.uid === user.uid);
    if (!me || me.isEliminated) return;

    setSubmittingClue(true);
    try {
      playSound('pop');
      setClueInput('');
      await submitOnlineClue(roomId, trimmed.slice(0, 80));
    } catch (err) {
      console.error('Submit clue failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setSubmittingClue(false);
    }
  };

  const handleManualSkipTurn = async () => {
    if (!activeSpeakerUid || (!isHost && activeSpeakerUid !== user.uid) || busyAction) return;
    setBusyAction(true);
    try {
      playSound('click');
      await advanceOnlineTurn(roomId, 'skip', currentTurnIndex);
    } catch (err) {
      console.error('Skip turn failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleTimeUp = async () => {
    if (!isHost || busyAction) return;
    setBusyAction(true);
    try {
      playSound('vote');
      await startOnlineVoting(roomId);
    } catch (err) {
      console.error('Start voting failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleVote = async (suspectUid: string) => {
    if (submittingVote || !suspectUid) return;
    setSubmittingVote(true);
    try {
      playSound('vote');
      await submitOnlineVote(roomId, suspectUid);
    } catch (err) {
      console.error('Vote submission failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleForceResolveVotes = async () => {
    if (!isHost || busyAction) return;
    setBusyAction(true);
    try {
      await resolveOnlineVotes(roomId);
    } catch (err) {
      console.error('Force resolve votes failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleProceedVoteReveal = async () => {
    if (!isHost || busyAction) return;
    setBusyAction(true);
    try {
      await proceedAfterOnlineVoteReveal(roomId);
    } catch (err) {
      console.error('Proceed after vote reveal failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleBackToLobbyFromResult = async () => {
    if (!isHost || busyAction) return;
    setBusyAction(true);
    try {
      await returnOnlineToLobby(roomId);
    } catch (err) {
      console.error('Return to lobby failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleNextMatch = async () => {
    if (!isHost || busyAction) return;
    setBusyAction(true);
    try {
      await nextOnlineMatch(roomId);
    } catch (err) {
      console.error('Next match failed:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const currentPlayer = players.find((p) => p.uid === user.uid);
  const totalAliveInfiltrators =
    typeof gameState.aliveInfiltratorsCount === 'number'
      ? gameState.aliveInfiltratorsCount
      : Number(gameState.infiltratorsCount || 0);
  const showMatchHud = ['PLAYING', 'VOTING', 'REVEAL_VOTE_RESULT'].includes(phase);
  const votedUids: string[] = Array.isArray(gameState.votedUids) ? gameState.votedUids : [];
  const hasMyVote = votedUids.includes(user.uid);

  const renderWordCardInner = () => {
    if (!privatePlayer) {
      return (
        <div className="py-6 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
        </div>
      );
    }

    if (privatePlayer.role === 'mrwhite') {
      return (
        <div className="text-danger flex flex-col items-center">
          <img
            src={getRoleAsset('mrwhite')}
            alt="Mr. White"
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-3xl object-cover border border-amber-400/45 shadow-lg mb-3 bg-[#0B1120]"
          />
          <span className="text-3xl sm:text-4xl font-black block mb-2">{t('mrWhiteRole')}</span>
          <p className="text-sm font-bold text-text-muted">{t('tryToGuessWord')}</p>
        </div>
      );
    }

    if (privatePlayer.role === 'hidden' || difficulty === 'hard') {
      return (
        <div className="text-sky-400 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 text-base font-black mb-3">
            <EyeOff size={20} />
            <span>{isRTL ? 'دورك مخفي (وضع صعب)' : 'Role Hidden (Hard Mode)'}</span>
          </div>
          <p className="text-sm font-bold mb-2 text-text-muted">{t('secretWordIs')}</p>
          <div className="bg-bg-dark py-3 px-6 rounded-xl border border-sky-400/30 inline-block">
            <span className="text-3xl font-black text-text-main">
              {privatePlayer.secretWord || '••••'}
            </span>
          </div>
        </div>
      );
    }

    if (privatePlayer.role === 'undercover') {
      return (
        <div className="text-orange-400 flex flex-col items-center">
          <img
            src={getRoleAsset('undercover')}
            alt="Undercover"
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-3xl object-cover border border-orange-400/45 shadow-lg mb-3 bg-[#0B1120]"
          />
          <span className="text-3xl sm:text-4xl font-black block mb-3">{t('undercoverRole')}</span>
          <p className="text-sm font-bold mb-2 text-text-muted">{t('secretWordIs')}</p>
          <div className="bg-bg-dark py-3 px-6 rounded-xl border border-orange-500/30 inline-block">
            <span className="text-3xl font-black text-white">{privatePlayer.secretWord}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="text-primary flex flex-col items-center">
        <img
          src={getRoleAsset('citizen')}
          alt="Citizen"
          referrerPolicy="no-referrer"
          className="w-24 h-24 rounded-3xl object-cover border border-sky-400/45 shadow-lg mb-3 bg-[#0B1120]"
        />
        <span className="text-3xl sm:text-4xl font-black block mb-3">{t('citizenRole')}</span>
        <p className="text-sm font-bold mb-2 text-text-muted">{t('secretWordIs')}</p>
        <div className="bg-bg-dark py-3 px-6 rounded-xl border border-primary/30 inline-block">
          <span className="text-3xl font-black text-white">{privatePlayer.secretWord}</span>
        </div>
      </div>
    );
  };

  const renderPhase = () => {
    if (phase === 'SETUP_PENDING' || phase === 'CATEGORY_SELECT') {
      const scaledUndercover = players.length >= 8 ? 2 : players.length >= 5 ? 1 : 0;
      const scaledCitizens = Math.max(1, players.length - 1 - scaledUndercover);

      if (isHost) {
        return (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-6 max-w-md mx-auto w-full">
            <div className="w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
              <Play className="w-9 h-9 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mb-3 text-primary">
              {t('readyToStartRound')}
            </h2>

            <div className="card-modern p-4 w-full mb-6 text-xs font-bold text-text-muted space-y-2">
              <div className="flex items-center justify-between">
                <span>{t('playersLabel')}</span>
                <span className="text-text-main font-black tabular-nums">{players.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('difficulty')}</span>
                <span className={difficulty === 'hard' ? 'text-rose-400 font-black' : 'text-sky-400 font-black'}>
                  {difficulty === 'hard' ? t('difficultyHard') : t('difficultyEasy')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('roleDistribution')}</span>
                <span className="text-text-main font-black tabular-nums">
                  {scaledCitizens} {t('citizen')} · {scaledUndercover} {t('undercover')} · 1 {t('mrWhite')}
                </span>
              </div>
              <p className="text-[11px] font-bold text-text-muted/85 pt-2 border-t border-white/10 text-start leading-relaxed">
                {t('onlineClassicRolesNote')}
              </p>
            </div>

            <button
              onClick={handleStartRound}
              disabled={isLoading || players.length < 3}
              className="btn-modern w-full min-h-[54px] py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
              ) : (
                <>
                  <Play size={22} />
                  <span>{t('startRound')}</span>
                </>
              )}
            </button>
            {error && <p className="text-danger mt-4 text-sm font-bold">{error}</p>}
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <h2 className="text-2xl font-black text-primary">{t('waitingForHost')}</h2>
          <p className="text-text-muted mt-2 font-bold">{t('hostPreparingRound')}</p>
        </div>
      );
    }

    if (phase === 'REVEAL') {
      const readyCount = gameState.readyPlayers?.length || 0;
      const isReady = gameState.readyPlayers?.includes(user.uid);

      return (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-5 max-w-md mx-auto w-full">
          <h2 className="text-2xl sm:text-3xl font-black mb-5 text-primary">{t('yourTurn')}</h2>
          <div className="card-modern p-7 w-full">
            <h3 className="text-lg font-bold text-text-muted mb-4">{t('youAreLabel')}</h3>
            {renderWordCardInner()}
          </div>

          {!isReady ? (
            <button
              onClick={handleRevealComplete}
              disabled={busyAction || !privatePlayer}
              className="btn-modern mt-6 w-full min-h-[54px] py-4 rounded-2xl font-black text-lg disabled:opacity-50"
            >
              {t('iUnderstandReady')}
            </button>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-1">
              <p className="text-emerald-400 font-black text-sm">{t('waitingForOtherPlayers')}</p>
              <span className="text-xs font-black text-text-muted tabular-nums">
                {readyCount} / {players.length}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (phase === 'PLAYING') {
      const activeSpeaker = players.find((p) => p.uid === activeSpeakerUid);
      const isMyTurn = activeSpeakerUid === user.uid && !currentPlayer?.isEliminated && !turnsCompleted;
      const roundClues = clues.filter((c) => c.round === currentRound);
      const spokenThisRoundUids = new Set(roundClues.map((c) => c.uid));

      return (
        <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto px-4 pb-24 pt-2 gap-4">
          {currentPlayer?.isEliminated && (
            <div className="px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-400/35 text-rose-200 text-xs font-black flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{t('spectatorModeNote')}</span>
            </div>
          )}

          {/* Active Turn Spotlight */}
          {!turnsCompleted && activeSpeaker ? (
            <div
              className={`card-modern p-4 border ${
                isMyTurn
                  ? 'border-emerald-400/60 bg-emerald-500/10'
                  : 'border-primary/40 bg-primary/5'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar avatar={activeSpeaker.avatar} name={activeSpeaker.name} size={48} />
                  <div className="min-w-0 text-start">
                    <p className="text-[11px] font-black text-text-muted uppercase tracking-wider">
                      {t('currentSpeaker')}
                    </p>
                    <p className="text-lg font-black text-text-main truncate">
                      {activeSpeaker.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`px-3 py-1.5 rounded-xl font-black text-sm tabular-nums flex items-center gap-1.5 border ${
                      timeLeftSeconds <= 10
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/50'
                        : 'bg-bg-dark text-amber-300 border-white/10'
                    }`}
                  >
                    <Clock size={14} />
                    <span>
                      {timeLeftSeconds}
                      {t('secondsShort')}
                    </span>
                  </div>
                  {(isHost || isMyTurn) && (
                    <button
                      onClick={handleManualSkipTurn}
                      disabled={busyAction}
                      className="min-h-[40px] min-w-[40px] px-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-text-muted hover:text-white border border-white/10 flex items-center justify-center gap-1 text-xs font-black disabled:opacity-40"
                      title={t('skipTurn')}
                      aria-label={t('skipTurn')}
                    >
                      <SkipForward size={15} />
                    </button>
                  )}
                </div>
              </div>

              {isMyTurn && (
                <form onSubmit={handleSubmitClue} className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-black text-emerald-300 mb-2 text-start">
                    {t('yourTurnWriteClue')}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clueInput}
                      maxLength={80}
                      onChange={(e) => setClueInput(e.target.value)}
                      placeholder={t('cluePlaceholder')}
                      className="flex-1 bg-bg-dark border border-emerald-400/40 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!clueInput.trim() || submittingClue}
                      className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-1.5 disabled:opacity-40 shrink-0"
                    >
                      <Send size={16} />
                      <span>{t('sendClue')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="card-modern p-4 border border-amber-400/40 bg-amber-500/10 text-center">
              <p className="text-sm font-black text-amber-200">{t('allTurnsFinished')}</p>
            </div>
          )}

          {/* Clues Feed & Players Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="card-modern p-4 flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-wider mb-3 text-start">
                {t('cluesFeedTitle')}
              </h3>
              {clues.length === 0 ? (
                <p className="text-xs font-bold text-text-muted/70 py-4 text-center">
                  {t('noCluesYet')}
                </p>
              ) : (
                <div className="space-y-2">
                  {clues.map((clue) => (
                    <div
                      key={clue.id}
                      className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-bg-dark/70 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar avatar={clue.avatar} name={clue.name} size={28} />
                        <div className="min-w-0 text-start">
                          <span className="text-[11px] font-black text-text-muted block truncate">
                            {clue.name}
                          </span>
                          <span
                            className={`text-sm font-bold break-words ${
                              clue.skipped ? 'text-text-muted italic' : 'text-text-main'
                            }`}
                          >
                            {clue.text}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-primary/80 px-2 py-0.5 rounded-md bg-primary/10 shrink-0 tabular-nums">
                        R{clue.round}
                      </span>
                    </div>
                  ))}
                  <div ref={cluesEndRef} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {players.map((p) => {
                const isSpeaking = p.uid === activeSpeakerUid && !turnsCompleted;
                const hasSpoken = p.uid ? spokenThisRoundUids.has(p.uid) : false;
                return (
                  <button
                    key={p.uid || p.id}
                    onClick={() => setSelectedPlayerForStats(p)}
                    className={`card-modern p-3 flex flex-col items-center transition-all relative ${
                      p.isEliminated
                        ? 'opacity-45 border-danger/40'
                        : isSpeaking
                        ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/30'
                        : 'hover:bg-primary/10 hover:border-primary'
                    }`}
                  >
                    {p.uid === room.hostId && (
                      <Crown size={13} className="absolute top-2 right-2 text-amber-400" />
                    )}
                    {!p.isEliminated && hasSpoken && (
                      <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                    <div className="relative">
                      <Avatar avatar={p.avatar} name={p.name} size={50} className="mb-1.5" />
                      {p.isEliminated && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-full">
                          <XCircle size={22} className="text-danger" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`font-black text-xs sm:text-sm truncate max-w-full ${
                        p.isEliminated ? 'line-through text-danger' : ''
                      }`}
                    >
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-2">
            {isHost ? (
              <button
                onClick={handleTimeUp}
                disabled={busyAction || !turnsCompleted}
                className="btn-modern w-full min-h-[52px] py-3.5 rounded-[2rem] font-black text-base flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Vote size={20} />
                <span>{t('endAndVote')}</span>
              </button>
            ) : (
              <div className="card-modern p-3.5 bg-primary/5 border-primary/20 text-center">
                <p className="text-primary font-black text-xs sm:text-sm">
                  {t('waitingForHostToStartVote')}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (phase === 'VOTING') {
      const isEliminated = currentPlayer?.isEliminated;
      const aliveUids = new Set(alivePlayers.map((p) => p.uid));
      const validVoteCount = votedUids.filter((id) => aliveUids.has(id)).length;

      return (
        <div className="flex flex-col items-center flex-1 text-center p-4 pb-24 w-full max-w-2xl mx-auto gap-4">
          <div>
            <h2 className="text-2xl font-black text-danger">{t('votingTime')}</h2>
            <p className="text-xs font-black text-text-muted mt-1 tabular-nums">
              {t('votedCount', { count: validVoteCount, total: alivePlayers.length })}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {alivePlayers.map((p) => {
              const voted = Boolean(p.uid && votedUids.includes(p.uid));
              return (
                <div
                  key={p.uid}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black border flex items-center gap-1.5 ${
                    voted
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-text-muted'
                  }`}
                >
                  <span>{p.name}</span>
                  <span>{voted ? `✓ ${t('votedStatus')}` : t('decidingStatus')}</span>
                </div>
              );
            })}
          </div>

          {isEliminated ? (
            <div className="card-modern p-6 w-full max-w-md my-auto">
              <h3 className="text-xl font-black text-danger mb-2">{t('youAreEliminated')}</h3>
              <p className="text-sm text-text-muted font-bold">{t('spectatorModeNote')}</p>
            </div>
          ) : !hasMyVote ? (
            <>
              <p className="text-sm font-bold text-text-muted">{t('whoIsImpostor')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                {alivePlayers
                  .filter((p) => p.uid !== user.uid)
                  .map((p) => (
                    <button
                      key={p.uid}
                      disabled={submittingVote}
                      onClick={() => p.uid && handleVote(p.uid)}
                      className="card-modern min-h-[116px] p-3 flex flex-col items-center justify-center hover:bg-danger/15 hover:border-danger active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Avatar avatar={p.avatar} name={p.name} size={56} className="mb-1.5" />
                      <span className="font-black text-sm truncate max-w-full">{p.name}</span>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center my-auto card-modern p-6 w-full max-w-sm">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8" strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black mb-1">{t('yourVoteRecorded')}</h3>
              <p className="text-text-muted text-sm font-bold">{t('waitingForOtherPlayers')}</p>
            </div>
          )}

          {isHost && validVoteCount > 0 && validVoteCount < alivePlayers.length && (() => {
            const requiredMajority =
              alivePlayers.length <= 1
                ? Math.max(0, alivePlayers.length)
                : Math.min(alivePlayers.length, Math.max(2, Math.floor(alivePlayers.length / 2) + 1));
            const votingStartedAt = Number(gameState.votingStartedAt || 0);
            const elapsedMs = votingStartedAt > 0 ? Math.max(0, votingNowMs - votingStartedAt) : 0;
            const remainingSeconds = Math.max(0, Math.ceil((15000 - elapsedMs) / 1000));
            const canForceResolve = validVoteCount >= requiredMajority && remainingSeconds === 0;

            return (
              <div className="mt-auto flex flex-col items-center gap-1.5">
                <button
                  onClick={handleForceResolveVotes}
                  disabled={busyAction || !canForceResolve}
                  className="px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-black text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('forceEndVote')}
                </button>
                {!canForceResolve && (
                  <p className="text-[11px] font-bold text-text-muted tabular-nums">
                    {validVoteCount}/{requiredMajority} {t('votedStatus')} · {remainingSeconds}s
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      );
    }

    if (phase === 'REVEAL_VOTE_RESULT') {
      const votedPlayer = players.find((p) => p.uid === gameState.mostVotedId);
      const votersForEliminated: string[] = Array.isArray(gameState.votersForEliminated)
        ? gameState.votersForEliminated
        : [];
      return (
        <div className="relative h-full w-full">
          <RevealVoteResult
            votedPlayerId={votedPlayer?.id ?? -1}
            impostorId={votedPlayer?.role === 'mrwhite' ? votedPlayer.id : -1}
            undercoverId={votedPlayer?.role === 'undercover' ? votedPlayer.id : null}
            players={players}
            onNext={handleProceedVoteReveal}
            voters={players.filter((p) => p.uid && votersForEliminated.includes(p.uid))}
            isOnline={true}
            isHost={isHost}
            tieBroken={Boolean(gameState.tieBroken)}
          />
        </div>
      );
    }

    if (phase === 'IMPOSTOR_GUESS') {
      const guesserUid = gameState.guesserUid || gameState.mostVotedId;
      const isImpostor = guesserUid === user.uid;
      const impostorPlayer = players.find((p) => p.uid === guesserUid);

      if (!impostorPlayer) {
        return (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
            <h2 className="text-xl font-black text-amber-300 mb-4">{t('mrWhiteIsGuessing')}</h2>
            {isHost && (
              <button
                onClick={() => void submitOnlineMrWhiteGuess(roomId, '', true)}
                className="btn-modern px-6 py-3 rounded-2xl font-black"
              >
                {t('ok')}
              </button>
            )}
          </div>
        );
      }

      if (isImpostor) {
        return (
          <ImpostorGuessScreen
            impostor={impostorPlayer}
            onSubmitGuessText={(guessText) => submitOnlineMrWhiteGuess(roomId, guessText)}
            onGuess={() => {}}
          />
        );
      }

      return (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-danger mb-4"></div>
          <h2 className="text-2xl font-black text-danger">{t('mrWhiteIsGuessing')}</h2>
          <p className="text-text-muted mt-2 font-bold">
            {t('waitingForMrWhiteToChoose', { name: impostorPlayer.name })}
          </p>
        </div>
      );
    }

    if (phase === 'RESULT') {
      const revealedResult = gameState.revealedResult || {};
      const votesByUid: Record<string, string> = revealedResult.votesByUid || {};
      const mappedVotes: Record<number, number> = {};
      Object.entries(votesByUid).forEach(([voterUid, votedUid]) => {
        const voterId = players.find((p) => p.uid === voterUid)?.id;
        const votedId = players.find((p) => p.uid === votedUid)?.id;
        if (voterId !== undefined && votedId !== undefined) {
          mappedVotes[voterId] = votedId;
        }
      });

      const winningMrWhiteId =
        gameState.winReason === 'impostor_guessed'
          ? (players.find((p) => p.uid === (gameState.winningMrWhiteUid || revealedResult.impostorId))
              ?.id ?? null)
          : null;

      return (
        <div className="relative h-full w-full">
          <ResultScreen
            players={players}
            impostorIndex={players.find((p) => p.uid === revealedResult.impostorId)?.id ?? -1}
            secretWord={revealedResult.secretWord || ''}
            undercoverWord={revealedResult.undercoverWord || ''}
            voteData={mappedVotes}
            onGameEnd={() => {}}
            onNext={handleNextMatch}
            roundWinner={gameState.winner}
            winReason={gameState.winReason}
            winningMrWhiteId={winningMrWhiteId}
            isOnline={true}
            isHost={isHost}
            onBackToLobby={handleBackToLobbyFromResult}
            onLeaveRoom={() => setShowLeaveConfirm(true)}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
        <h2 className="text-2xl font-bold text-primary mb-4">
          {t('phaseLabel')} {phase}
        </h2>
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="btn-modern btn-modern-outline mt-6 px-6 py-3 rounded-xl"
        >
          {t('leaveRoom')}
        </button>
      </div>
    );
  };

  return (
    <div className="relative min-h-full w-full flex flex-col">
      {showMatchHud && (
        <div className="w-full max-w-3xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-black text-text-main tabular-nums">
              {t('roundNumberLabel', { round: currentRound })}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-bg-surface/80 border border-white/10 text-xs font-bold text-text-muted tabular-nums">
              {t('aliveCountLabel', { count: alivePlayers.length })}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-xs font-black text-rose-200 tabular-nums flex items-center gap-1.5">
              {difficulty === 'hard' ? (
                <>
                  <HelpCircle size={15} className="text-rose-300 shrink-0" />
                  <span>
                    {t('remainingIntruders')}: {totalAliveInfiltrators}
                  </span>
                </>
              ) : (
                <span>
                  {t('remainingIntruders')}: {totalAliveInfiltrators}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentPlayer && !currentPlayer.isEliminated && (
              <button
                onClick={() => {
                  setPeekRevealed(false);
                  setShowWordPeek(true);
                }}
                className="min-h-[40px] px-3 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-black flex items-center gap-1.5"
              >
                <Eye size={15} />
                <span>{t('myWordPeek')}</span>
              </button>
            )}
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="min-h-[40px] min-w-[40px] px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 flex items-center justify-center"
              aria-label={t('leaveRoom')}
              title={t('leaveRoom')}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}

      {!showMatchHud && phase !== 'RESULT' && (
        <div className="w-full max-w-3xl mx-auto px-4 pt-3 flex justify-end z-20">
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="min-h-[40px] px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 text-xs font-black flex items-center gap-1.5"
          >
            <LogOut size={15} />
            <span>{t('leaveRoom')}</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col">{renderPhase()}</div>

      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-5 left-5 min-h-[54px] min-w-[54px] flex items-center justify-center bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-all z-40"
        aria-label={t('chat')}
      >
        <MessageCircle className="w-6 h-6" />
        {room.messages?.length > 0 && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-danger rounded-full border-2 border-bg-dark"></span>
        )}
      </button>

      {showWordPeek && currentPlayer && (
        <div
          onClick={() => setShowWordPeek(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-modern p-6 w-full max-w-sm text-center"
          >
            {!peekRevealed ? (
              <div className="py-6 flex flex-col items-center gap-4">
                <EyeOff size={40} className="text-primary" />
                <p className="text-sm font-bold text-text-muted">{t('tapToRevealWord')}</p>
                <button
                  onClick={() => setPeekRevealed(true)}
                  className="btn-modern w-full min-h-[48px] rounded-2xl font-black"
                >
                  {t('myWordPeek')}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {renderWordCardInner()}
                <button
                  onClick={() => setShowWordPeek(false)}
                  className="btn-modern btn-modern-outline w-full min-h-[48px] rounded-2xl font-black"
                >
                  {t('hideWord')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="card-modern p-6 w-full max-w-sm text-center">
            <h3 className="text-lg font-black mb-2">{t('leaveRoom')}</h3>
            <p className="text-sm font-bold text-text-muted mb-6">{t('leaveRoomConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="btn-modern btn-modern-outline flex-1 min-h-[48px] rounded-2xl font-black"
              >
                {t('stay')}
              </button>
              <button
                onClick={handleLeaveConfirmed}
                className="flex-1 min-h-[48px] rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black transition-colors"
              >
                {t('leave')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatBox
        roomId={roomId}
        messages={room.messages || []}
        currentUser={user}
        currentProfile={profile}
        showChat={showChat}
        setShowChat={setShowChat}
      />

      {selectedPlayerForStats && (
        <PlayerStatsModal
          isOpen={!!selectedPlayerForStats}
          onClose={() => setSelectedPlayerForStats(null)}
          uid={selectedPlayerForStats.uid}
          name={selectedPlayerForStats.name}
          avatar={selectedPlayerForStats.avatar}
          isVotingPhase={
            phase === 'VOTING' &&
            !currentPlayer?.isEliminated &&
            !selectedPlayerForStats.isEliminated &&
            selectedPlayerForStats.uid !== user.uid &&
            !hasMyVote
          }
          onVote={() => handleVote(selectedPlayerForStats.uid)}
        />
      )}
    </div>
  );
};
