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
import { getRoleAsset, getRoleVisualIdentity } from '../data/specialRoles';
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
import {
  ClassifiedStamp,
  IconButton,
  IntelligencePanel,
  ModalShell,
  OperationPhaseBadge,
  PlayerIntelligenceCard,
  StatusIndicator,
  TacticalButton,
} from './ui/BlacksiteUI';

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
  onOpenCaseFile?: (reportId: string) => void;
}

export const OnlineGameScreen: React.FC<OnlineGameScreenProps> = ({
  roomId,
  onBack,
  onReturnToLobby,
  onOpenCaseFile,
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
      } else if (
        phase === 'REVEAL_VOTE_RESULT' &&
        p.uid === gameState.mostVotedId &&
        gameState.mostVotedRevealedRole
      ) {
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#B49A62]" />
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
      playSound('voteConfirm');
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
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B49A62] mb-2" />
        </div>
      );
    }

    if (privatePlayer.role === 'mrwhite') {
      const rv = getRoleVisualIdentity('mrwhite', settings.language);
      return (
        <div className="text-primary-text flex flex-col items-center">
          <ClassifiedStamp tone={rv.stampTone} className="mb-3">
            {rv.stamp}
          </ClassifiedStamp>
          <img
            src={getRoleAsset('mrwhite')}
            alt="Mr. White"
            referrerPolicy="no-referrer"
            className={`w-24 h-24 rounded-[12px] object-cover border-2 ${rv.frameBorderClass} shadow-lg mb-3 bg-[#080B10]`}
          />
          <span className="text-2xl sm:text-3xl font-bold block mb-2">{t('mrWhiteRole')}</span>
          <p className="text-xs sm:text-sm font-medium text-text-muted">{t('tryToGuessWord')}</p>
        </div>
      );
    }

    if (privatePlayer.role === 'hidden' || difficulty === 'hard') {
      return (
        <div className="text-cyan-text flex flex-col items-center">
          <ClassifiedStamp tone="cyan" className="mb-3">
            CLEARANCE · REDACTED
          </ClassifiedStamp>
          <div className="flex items-center justify-center gap-2 text-sm font-bold mb-3">
            <EyeOff size={18} />
            <span>{isRTL ? 'دورك مخفي (وضع صعب)' : 'Role Hidden (Hard Mode)'}</span>
          </div>
          <p className="text-xs font-semibold mb-2 text-text-muted">{t('secretWordIs')}</p>
          <div className="bg-bg-card py-3 px-6 rounded-[10px] border border-[#668F9A]/40 inline-block">
            <span className="text-2xl sm:text-3xl font-bold text-text-main">
              {privatePlayer.secretWord || '••••'}
            </span>
          </div>
        </div>
      );
    }

    if (privatePlayer.role === 'undercover') {
      const rv = getRoleVisualIdentity('undercover', settings.language);
      return (
        <div className="text-[#C88D5E] flex flex-col items-center">
          <ClassifiedStamp tone={rv.stampTone} className="mb-3">
            {rv.stamp}
          </ClassifiedStamp>
          <img
            src={getRoleAsset('undercover')}
            alt="Undercover"
            referrerPolicy="no-referrer"
            className={`w-24 h-24 rounded-[12px] object-cover border-2 ${rv.frameBorderClass} shadow-lg mb-3 bg-[#080B10]`}
          />
          <span className="text-2xl sm:text-3xl font-bold block mb-3">{t('undercoverRole')}</span>
          <p className="text-xs font-semibold mb-2 text-text-muted">{t('secretWordIs')}</p>
          <div className="bg-bg-card py-3 px-6 rounded-[10px] border border-[#A46F44]/40 inline-block">
            <span className="text-2xl sm:text-3xl font-bold text-text-main">
              {privatePlayer.secretWord}
            </span>
          </div>
        </div>
      );
    }

    const rv = getRoleVisualIdentity('citizen', settings.language);
    return (
      <div className="text-cyan-text flex flex-col items-center">
        <ClassifiedStamp tone={rv.stampTone} className="mb-3">
          {rv.stamp}
        </ClassifiedStamp>
        <img
          src={getRoleAsset('citizen')}
          alt="Citizen"
          referrerPolicy="no-referrer"
          className={`w-24 h-24 rounded-[12px] object-cover border-2 ${rv.frameBorderClass} shadow-lg mb-3 bg-[#080B10]`}
        />
        <span className="text-2xl sm:text-3xl font-bold block mb-3">{t('citizenRole')}</span>
        <p className="text-xs font-semibold mb-2 text-text-muted">{t('secretWordIs')}</p>
        <div className="bg-bg-card py-3 px-6 rounded-[10px] border border-[#668F9A]/40 inline-block">
          <span className="text-2xl sm:text-3xl font-bold text-text-main">
            {privatePlayer.secretWord}
          </span>
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
            <div className="mb-3">
              <OperationPhaseBadge phase="briefing" round={currentRound} lang={settings.language} />
            </div>
            <div className="w-16 h-16 rounded-[12px] bg-[#B49A62]/15 border border-[#B49A62]/35 flex items-center justify-center mb-4">
              <Play className="w-7 h-7 text-primary-text" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-text-main">
              {t('readyToStartRound')}
            </h2>

            <IntelligencePanel className="p-4 w-full mb-6 text-xs font-semibold text-text-muted space-y-2.5">
              <div className="flex items-center justify-between">
                <span>{t('playersLabel')}</span>
                <span className="text-text-main font-mono-code font-bold tabular-nums">
                  {players.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('difficulty')}</span>
                <span
                  className={
                    difficulty === 'hard'
                      ? 'text-danger-text font-bold'
                      : 'text-cyan-text font-bold'
                  }
                >
                  {difficulty === 'hard' ? t('difficultyHard') : t('difficultyEasy')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>{t('roleDistribution')}</span>
                <span className="text-text-main font-bold tabular-nums">
                  {scaledCitizens} {t('citizen')} · {scaledUndercover} {t('undercover')} · 1{' '}
                  {t('mrWhite')}
                </span>
              </div>
              <p className="text-[11px] font-medium text-text-muted pt-2.5 border-t border-border text-start leading-relaxed">
                {t('onlineClassicRolesNote')}
              </p>
            </IntelligencePanel>

            <TacticalButton
              onClick={handleStartRound}
              disabled={isLoading || players.length < 3}
              loading={isLoading}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Play size={18} />}
            >
              {t('startRound')}
            </TacticalButton>
            {error && <p className="text-danger-text mt-4 text-sm font-semibold">{error}</p>}
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#B49A62] mb-4" />
          <h2 className="text-xl font-bold text-text-main">{t('waitingForHost')}</h2>
          <p className="text-text-muted mt-2 text-sm font-medium">{t('hostPreparingRound')}</p>
        </div>
      );
    }

    if (phase === 'REVEAL') {
      const readyCount = gameState.readyPlayers?.length || 0;
      const isReady = gameState.readyPlayers?.includes(user.uid);

      return (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-5 max-w-md mx-auto w-full">
          <div className="mb-3">
            <OperationPhaseBadge phase="briefing" round={currentRound} lang={settings.language} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-text-main">{t('yourTurn')}</h2>
          <IntelligencePanel className="relative p-6 w-full border-[#B49A62]/40 overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#B49A62]/70 to-transparent"
            />
            <h3 className="text-sm font-semibold text-text-muted mb-4">{t('youAreLabel')}</h3>
            {renderWordCardInner()}
          </IntelligencePanel>

          {!isReady ? (
            <div className="mt-5 w-full">
              <TacticalButton
                onClick={handleRevealComplete}
                disabled={busyAction || !privatePlayer}
                loading={busyAction}
                variant="primary"
                size="lg"
                fullWidth
              >
                {t('iUnderstandReady')}
              </TacticalButton>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-1.5">
              <StatusIndicator tone="emerald">{t('waitingForOtherPlayers')}</StatusIndicator>
              <span className="text-xs font-mono-code font-bold text-text-muted tabular-nums">
                {readyCount} / {players.length}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (phase === 'PLAYING') {
      const activeSpeaker = players.find((p) => p.uid === activeSpeakerUid);
      const isMyTurn =
        activeSpeakerUid === user.uid && !currentPlayer?.isEliminated && !turnsCompleted;
      const roundClues = clues.filter((c) => c.round === currentRound);
      const spokenThisRoundUids = new Set(roundClues.map((c) => c.uid));

      return (
        <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto px-4 pb-24 pt-2 gap-4">
          <div className="flex items-center justify-between gap-2">
            <OperationPhaseBadge phase="active" round={currentRound} lang={settings.language} />
          </div>

          {currentPlayer?.isEliminated && (
            <div className="px-4 py-2.5 rounded-[10px] bg-[#963F46]/15 border border-[#963F46]/35 text-danger-text text-xs font-semibold flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{t('spectatorModeNote')}</span>
            </div>
          )}

          {/* Active Turn Spotlight */}
          {!turnsCompleted && activeSpeaker ? (
            <IntelligencePanel
              className={`p-4 ${
                isMyTurn
                  ? 'border-[#3E7B67]/55 bg-[#3E7B67]/10'
                  : 'border-[#668F9A]/45'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar avatar={activeSpeaker.avatar} name={activeSpeaker.name} size={46} />
                  <div className="min-w-0 text-start">
                    <p
                      className={`text-[11px] font-semibold text-text-muted ${
                        !isRTL ? 'uppercase tracking-wider' : ''
                      }`}
                    >
                      {t('currentSpeaker')}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-text-main truncate">
                      {activeSpeaker.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`px-3 py-1.5 rounded-[8px] font-mono-code font-bold text-sm tabular-nums flex items-center gap-1.5 border ${
                      timeLeftSeconds <= 10
                        ? 'bg-[#963F46]/15 text-danger-text border-[#963F46]/45'
                        : 'bg-bg-card text-primary-text border-border-strong'
                    }`}
                  >
                    <Clock size={14} />
                    <span>
                      {timeLeftSeconds}
                      {t('secondsShort')}
                    </span>
                  </div>
                  {(isHost || isMyTurn) && (
                    <IconButton
                      onClick={handleManualSkipTurn}
                      disabled={busyAction}
                      variant="secondary"
                      size="sm"
                      title={t('skipTurn')}
                      aria-label={t('skipTurn')}
                    >
                      <SkipForward size={15} />
                    </IconButton>
                  )}
                </div>
              </div>

              {isMyTurn && (
                <form onSubmit={handleSubmitClue} className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-bold text-emerald-text mb-2 text-start">
                    {t('yourTurnWriteClue')}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clueInput}
                      maxLength={80}
                      onChange={(e) => setClueInput(e.target.value)}
                      placeholder={t('cluePlaceholder')}
                      className="flex-1 bg-bg-card border border-[#3E7B67]/50 rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-text-main outline-none focus:border-[#3E7B67] min-h-[44px]"
                      autoFocus
                    />
                    <TacticalButton
                      type="submit"
                      disabled={!clueInput.trim() || submittingClue}
                      loading={submittingClue}
                      variant="primary"
                      size="md"
                      icon={<Send size={15} />}
                    >
                      {t('sendClue')}
                    </TacticalButton>
                  </div>
                </form>
              )}
            </IntelligencePanel>
          ) : (
            <IntelligencePanel className="p-4 border-[#B49A62]/40 bg-[#B49A62]/10 text-center">
              <p className="text-sm font-bold text-primary-text">{t('allTurnsFinished')}</p>
            </IntelligencePanel>
          )}

          {/* Clues Feed & Players Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <IntelligencePanel className="p-4 flex flex-col max-h-64 overflow-y-auto custom-scrollbar">
              <h3
                className={`text-xs font-semibold text-text-muted mb-3 text-start ${
                  !isRTL ? 'uppercase tracking-wider' : ''
                }`}
              >
                {t('cluesFeedTitle')}
              </h3>
              {clues.length === 0 ? (
                <p className="text-xs font-medium text-text-muted py-4 text-center">
                  {t('noCluesYet')}
                </p>
              ) : (
                <div className="space-y-2">
                  {clues.map((clue) => (
                    <div
                      key={clue.id}
                      className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-[10px] bg-bg-card border border-border"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar avatar={clue.avatar} name={clue.name} size={28} />
                        <div className="min-w-0 text-start">
                          <span className="text-[11px] font-bold text-text-muted block truncate">
                            {clue.name}
                          </span>
                          <span
                            className={`text-sm font-medium break-words ${
                              clue.skipped ? 'text-text-muted italic' : 'text-text-main'
                            }`}
                          >
                            {clue.text}
                          </span>
                        </div>
                      </div>
                      <ClassifiedStamp tone="neutral">R{clue.round}</ClassifiedStamp>
                    </div>
                  ))}
                  <div ref={cluesEndRef} />
                </div>
              )}
            </IntelligencePanel>

            <div className="grid grid-cols-2 gap-2.5">
              {players.map((p) => {
                const isSpeaking = p.uid === activeSpeakerUid && !turnsCompleted;
                const hasSpoken = p.uid ? spokenThisRoundUids.has(p.uid) : false;
                return (
                  <button
                    key={p.uid || p.id}
                    onClick={() => setSelectedPlayerForStats(p)}
                    className="text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/70 rounded-[12px]"
                  >
                    <PlayerIntelligenceCard
                      className={`p-3 flex flex-col items-center relative ${
                        p.isEliminated
                          ? 'opacity-45 border-[#963F46]/40'
                          : isSpeaking
                          ? 'border-[#B49A62] bg-[#B49A62]/10'
                          : 'hover:border-[#668F9A]/50'
                      }`}
                    >
                      {p.uid === room.hostId && (
                        <Crown size={13} className="absolute top-2 right-2 text-primary-text" />
                      )}
                      {!p.isEliminated && hasSpoken && (
                        <span className="absolute top-2 left-2 w-5 h-5 rounded-[6px] bg-[#3E7B67]/20 text-emerald-text flex items-center justify-center">
                          <Check size={12} />
                        </span>
                      )}
                      <div className="relative">
                        <Avatar avatar={p.avatar} name={p.name} size={48} className="mb-1.5" />
                        {p.isEliminated && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#080B10]/65 rounded-[10px]">
                            <XCircle size={20} className="text-danger-text" />
                          </div>
                        )}
                      </div>
                      <span
                        className={`font-bold text-xs sm:text-sm truncate max-w-full ${
                          p.isEliminated ? 'line-through text-danger-text' : 'text-text-main'
                        }`}
                      >
                        {p.name}
                      </span>
                    </PlayerIntelligenceCard>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-2">
            {isHost ? (
              <TacticalButton
                onClick={handleTimeUp}
                disabled={busyAction || !turnsCompleted}
                loading={busyAction}
                variant="danger"
                size="lg"
                fullWidth
                icon={<Vote size={18} />}
              >
                {t('endAndVote')}
              </TacticalButton>
            ) : (
              <IntelligencePanel className="p-3.5 text-center">
                <p className="text-cyan-text font-semibold text-xs sm:text-sm">
                  {t('waitingForHostToStartVote')}
                </p>
              </IntelligencePanel>
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
          <div className="flex flex-col items-center gap-1.5">
            <OperationPhaseBadge phase="tribunal" round={currentRound} lang={settings.language} />
            <h2 className="text-xl sm:text-2xl font-bold text-danger-text">{t('votingTime')}</h2>
            <p className="text-xs font-mono-code font-bold text-text-muted tabular-nums">
              {t('votedCount', { count: validVoteCount, total: alivePlayers.length })}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {alivePlayers.map((p) => {
              const voted = Boolean(p.uid && votedUids.includes(p.uid));
              return (
                <StatusIndicator key={p.uid} tone={voted ? 'emerald' : 'neutral'}>
                  {p.name} · {voted ? `✓ ${t('votedStatus')}` : t('decidingStatus')}
                </StatusIndicator>
              );
            })}
          </div>

          {isEliminated ? (
            <IntelligencePanel className="p-6 w-full max-w-md my-auto">
              <h3 className="text-lg font-bold text-danger-text mb-2">
                {t('youAreEliminated')}
              </h3>
              <p className="text-sm text-text-muted font-medium">{t('spectatorModeNote')}</p>
            </IntelligencePanel>
          ) : !hasMyVote ? (
            <>
              <p className="text-sm font-medium text-text-muted">{t('whoIsImpostor')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                {alivePlayers
                  .filter((p) => p.uid !== user.uid)
                  .map((p) => {
                    const playerClues = clues.filter((c) => c.uid === p.uid && !c.skipped);
                    const latestClue = playerClues[playerClues.length - 1];
                    return (
                      <button
                        key={p.uid}
                        disabled={submittingVote}
                        onClick={() => p.uid && handleVote(p.uid)}
                        className="text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#963F46]/70 rounded-[12px] disabled:opacity-50"
                      >
                        <PlayerIntelligenceCard className="min-h-[126px] p-3 flex flex-col items-center justify-center hover:bg-[#963F46]/10 hover:border-[#963F46]/55">
                          <Avatar avatar={p.avatar} name={p.name} size={54} className="mb-2" />
                          <span className="font-bold text-sm text-text-main truncate max-w-full">
                            {p.name}
                          </span>
                          {latestClue && (
                            <span className="mt-1 text-[11px] font-medium text-text-muted truncate max-w-full">
                              "{latestClue.text}"
                            </span>
                          )}
                        </PlayerIntelligenceCard>
                      </button>
                    );
                  })}
              </div>
            </>
          ) : (
            <IntelligencePanel className="flex flex-col items-center my-auto p-6 w-full max-w-sm">
              <div className="w-14 h-14 bg-[#3E7B67]/20 border border-[#3E7B67]/40 text-emerald-text rounded-[12px] flex items-center justify-center mb-4">
                <Check className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-text-main mb-1">{t('yourVoteRecorded')}</h3>
              <p className="text-text-muted text-sm font-medium">{t('waitingForOtherPlayers')}</p>
            </IntelligencePanel>
          )}

          {isHost && validVoteCount > 0 && validVoteCount < alivePlayers.length && (() => {
            const requiredMajority =
              alivePlayers.length <= 1
                ? Math.max(0, alivePlayers.length)
                : Math.min(
                    alivePlayers.length,
                    Math.max(2, Math.floor(alivePlayers.length / 2) + 1)
                  );
            const votingStartedAt = Number(gameState.votingStartedAt || 0);
            const elapsedMs = votingStartedAt > 0 ? Math.max(0, votingNowMs - votingStartedAt) : 0;
            const remainingSeconds = Math.max(0, Math.ceil((15000 - elapsedMs) / 1000));
            const canForceResolve = validVoteCount >= requiredMajority && remainingSeconds === 0;

            return (
              <div className="mt-auto flex flex-col items-center gap-1.5">
                <TacticalButton
                  onClick={handleForceResolveVotes}
                  disabled={busyAction || !canForceResolve}
                  variant="primary"
                  size="sm"
                >
                  {t('forceEndVote')}
                </TacticalButton>
                {!canForceResolve && (
                  <p className="text-[11px] font-mono-code font-bold text-text-muted tabular-nums">
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
            <h2 className="text-xl font-bold text-primary-text mb-4">{t('mrWhiteIsGuessing')}</h2>
            {isHost && (
              <TacticalButton
                onClick={() => void submitOnlineMrWhiteGuess(roomId, '', true)}
                variant="primary"
                size="md"
              >
                {t('ok')}
              </TacticalButton>
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
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#B49A62] mb-4" />
          <h2 className="text-xl font-bold text-primary-text">{t('mrWhiteIsGuessing')}</h2>
          <p className="text-text-muted mt-2 text-sm font-medium">
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

      const reportId: string =
        gameState.caseFileReportId ||
        (gameState.matchId
          ? `${roomId}_${gameState.matchId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128)
          : '');

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
            onOpenCaseFile={onOpenCaseFile && reportId ? () => onOpenCaseFile(reportId) : undefined}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
        <h2 className="text-xl font-bold text-text-main mb-4">
          {t('phaseLabel')} {phase}
        </h2>
        <TacticalButton onClick={() => setShowLeaveConfirm(true)} variant="secondary" size="md">
          {t('leaveRoom')}
        </TacticalButton>
      </div>
    );
  };

  return (
    <div className="relative min-h-full w-full flex flex-col">
      {showMatchHud && (
        <div className="w-full max-w-3xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusIndicator tone="gold">
              {t('roundNumberLabel', { round: currentRound })}
            </StatusIndicator>
            <StatusIndicator tone="neutral">
              {t('aliveCountLabel', { count: alivePlayers.length })}
            </StatusIndicator>
            <StatusIndicator
              tone="crimson"
              icon={difficulty === 'hard' ? <HelpCircle size={12} /> : undefined}
            >
              {t('remainingIntruders')}: {totalAliveInfiltrators}
            </StatusIndicator>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentPlayer && !currentPlayer.isEliminated && (
              <TacticalButton
                onClick={() => {
                  playSound('dossierOpen');
                  setPeekRevealed(false);
                  setShowWordPeek(true);
                }}
                variant="secondary"
                size="sm"
                icon={<Eye size={15} className="text-cyan-text" />}
              >
                {t('myWordPeek')}
              </TacticalButton>
            )}
            <IconButton
              onClick={() => setShowLeaveConfirm(true)}
              variant="danger"
              size="sm"
              aria-label={t('leaveRoom')}
              title={t('leaveRoom')}
            >
              <LogOut size={16} />
            </IconButton>
          </div>
        </div>
      )}

      {!showMatchHud && phase !== 'RESULT' && (
        <div className="w-full max-w-3xl mx-auto px-4 pt-3 flex justify-end z-20">
          <TacticalButton
            onClick={() => setShowLeaveConfirm(true)}
            variant="danger"
            size="sm"
            icon={<LogOut size={14} />}
          >
            {t('leaveRoom')}
          </TacticalButton>
        </div>
      )}

      <div className="flex-1 flex flex-col">{renderPhase()}</div>

      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-5 left-5 min-h-[50px] min-w-[50px] flex items-center justify-center bg-[#668F9A] text-[#080B10] border border-[#8CB3BE]/50 rounded-[12px] shadow-lg hover:bg-[#77A0AB] transition-colors z-40"
        aria-label={t('chat')}
      >
        <MessageCircle className="w-5 h-5" />
        {room.messages?.length > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#963F46] rounded-[4px] border border-[#080B10]" />
        )}
      </button>

      {showWordPeek && currentPlayer && (
        <div
          onClick={() => setShowWordPeek(false)}
          className="fixed inset-0 z-50 bg-[#080B10]/90 backdrop-blur-md flex items-center justify-center p-5"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <ModalShell
              onClose={() => setShowWordPeek(false)}
              ariaLabel={t('myWordPeek')}
              className="p-6 text-center"
            >
              {!peekRevealed ? (
                <div className="py-4 flex flex-col items-center gap-4">
                  <ClassifiedStamp tone="cyan">CONFIDENTIAL PEEK</ClassifiedStamp>
                  <div className="w-14 h-14 rounded-[12px] bg-[#668F9A]/15 border border-[#668F9A]/35 flex items-center justify-center">
                    <EyeOff size={28} className="text-cyan-text" />
                  </div>
                  <p className="text-sm font-medium text-text-muted">{t('tapToRevealWord')}</p>
                  <TacticalButton
                    onClick={() => {
                      playSound('roleReveal');
                      setPeekRevealed(true);
                    }}
                    variant="cyan"
                    size="lg"
                    fullWidth
                  >
                    {t('myWordPeek')}
                  </TacticalButton>
                </div>
              ) : (
                <div className="space-y-5">
                  {renderWordCardInner()}
                  <TacticalButton
                    onClick={() => setShowWordPeek(false)}
                    variant="secondary"
                    size="lg"
                    fullWidth
                  >
                    {t('hideWord')}
                  </TacticalButton>
                </div>
              )}
            </ModalShell>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div
          onClick={() => setShowLeaveConfirm(false)}
          className="fixed inset-0 z-50 bg-[#080B10]/85 backdrop-blur-sm flex items-center justify-center p-5"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <ModalShell
              onClose={() => setShowLeaveConfirm(false)}
              ariaLabel={t('leaveRoom')}
              className="p-6 text-center"
            >
              <h3 className="text-lg font-bold text-text-main mb-2">{t('leaveRoom')}</h3>
              <p className="text-sm font-medium text-text-muted mb-6">{t('leaveRoomConfirm')}</p>
              <div className="flex gap-3">
                <TacticalButton
                  onClick={() => setShowLeaveConfirm(false)}
                  variant="secondary"
                  size="md"
                  className="flex-1"
                >
                  {t('stay')}
                </TacticalButton>
                <TacticalButton
                  onClick={handleLeaveConfirmed}
                  variant="danger"
                  size="md"
                  className="flex-1"
                >
                  {t('leave')}
                </TacticalButton>
              </div>
            </ModalShell>
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
