import React, { useState, useEffect, useCallback } from 'react';
import { ClassifiedCaseFile, GamePhase, GameTypeId } from './types';
import { WelcomeScreen } from './components/WelcomeScreen';
import { PlayerSetup } from './components/PlayerSetup';
import { GameRound } from './components/GameRound';
import { GameSettingsScreen } from './components/GameSettingsScreen';
import { QuestionPhase } from './components/QuestionPhase';
import { DiscussionPhase } from './components/DiscussionPhase';
import { VotingScreen } from './components/VotingScreen';
import { RevealVoteResult } from './components/RevealVoteResult';
import { ResultScreen } from './components/ResultScreen';
import { CaseFileScreen } from './components/CaseFileScreen';
import { OperationArchiveScreen } from './components/OperationArchiveScreen';
import { ScoreboardScreen } from './components/ScoreboardScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { RulesScreen } from './components/RulesScreen';
import { ImpostorGuessScreen } from './components/ImpostorGuessScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { OnlineRoomsScreen } from './components/OnlineRoomsScreen';
import { OnlineLobbyScreen } from './components/OnlineLobbyScreen';
import { OnlineGameScreen } from './components/OnlineGameScreen';
import { LanguageDictionary } from './components/LanguageDictionary';
import { InventoryScreen } from './components/InventoryScreen';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Avatar } from './components/Avatar';
import { auth } from './firebase';
import { Header } from './components/Header';
import { saveRecentPlayers, getSettings } from './services/storageService';
import { playSound } from './services/soundService';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { getUITranslation } from './translations';
import { ToastHost } from './components/ToastHost';
import { showToast } from './utils/toast';
import {
  createOnlineRoom,
  getOnlineActionErrorKey,
  joinOnlineRoom,
  leaveOnlineRoom,
} from './utils/onlineRoomService';
import { getRoleAsset, getRoleTitle, getRoleVisualIdentity } from './data/specialRoles';
import { useOfflineMatch } from './hooks/useOfflineMatch';
import { useMafiaMatch } from './hooks/useMafiaMatch';
import { hasSpecialRole } from './src/game/voteEngine';
import { ClassifiedStamp, ModalShell, TacticalButton } from './components/ui/BlacksiteUI';
import { MafiaSettingsScreen } from './components/mafia/MafiaSettingsScreen';
import { MafiaRoleRevealScreen } from './components/mafia/MafiaRoleRevealScreen';
import { MafiaNightScreen } from './components/mafia/MafiaNightScreen';
import { MafiaDawnScreen } from './components/mafia/MafiaDawnScreen';
import { MafiaDiscussionScreen } from './components/mafia/MafiaDiscussionScreen';
import { MafiaVotingScreen } from './components/mafia/MafiaVotingScreen';
import { MafiaVoteResultScreen } from './components/mafia/MafiaVoteResultScreen';
import { MafiaResultScreen } from './components/mafia/MafiaResultScreen';

const ACTIVE_GAME_PHASES = [
  GamePhase.REVEAL,
  GamePhase.PLAYING,
  GamePhase.DISCUSSION,
  GamePhase.VOTING,
  GamePhase.REVEAL_VOTE_RESULT,
  GamePhase.IMPOSTOR_GUESS,
  GamePhase.ONLINE_LOBBY,
  GamePhase.ONLINE_GAME,
  GamePhase.MAFIA_REVEAL,
  GamePhase.MAFIA_NIGHT,
  GamePhase.MAFIA_DAWN,
  GamePhase.MAFIA_DISCUSSION,
  GamePhase.MAFIA_VOTING,
  GamePhase.MAFIA_VOTE_RESULT,
];

function AppContent() {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.WELCOME);
  const [selectedGameType, setSelectedGameType] = useState<GameTypeId>('mr_white');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [activeCaseFile, setActiveCaseFile] = useState<ClassifiedCaseFile | null>(null);
  const [activeCaseFileReportId, setActiveCaseFileReportId] = useState<string | null>(null);
  const [activeCaseFileModeHint, setActiveCaseFileModeHint] = useState<'local' | 'online' | undefined>(
    undefined
  );
  const [caseFileReturnPhase, setCaseFileReturnPhase] = useState<GamePhase>(GamePhase.WELCOME);

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'gray' | 'light' | 'system'>(
    getSettings().theme || 'dark'
  );
  const [currentButtonColor, setCurrentButtonColor] = useState(
    getSettings().buttonColor || 'default'
  );
  const [currentLanguage, setCurrentLanguage] = useState(getSettings().language || 'ar');
  const t = useCallback((key: string) => getUITranslation(currentLanguage, key), [currentLanguage]);

  const navigate = useCallback((newPhase: GamePhase) => {
    setPhase(newPhase);
    window.history.pushState({ phase: newPhase }, '');
  }, []);

  const openCaseFileView = useCallback(
    (opts: {
      caseFile?: ClassifiedCaseFile | null;
      reportId?: string | null;
      modeHint?: 'local' | 'online';
      returnPhase: GamePhase;
    }) => {
      setActiveCaseFile(opts.caseFile ?? null);
      setActiveCaseFileReportId(opts.reportId ?? opts.caseFile?.reportId ?? null);
      setActiveCaseFileModeHint(opts.modeHint ?? opts.caseFile?.mode);
      setCaseFileReturnPhase(opts.returnPhase);
      navigate(GamePhase.CASE_FILE);
    },
    [navigate]
  );

  const offline = useOfflineMatch({ navigate, t });
  const mafia = useMafiaMatch({ navigate });

  const bgClass = (() => {
    if (
      phase === GamePhase.VOTING ||
      phase === GamePhase.REVEAL_VOTE_RESULT ||
      phase === GamePhase.MAFIA_NIGHT ||
      phase === GamePhase.MAFIA_VOTING ||
      phase === GamePhase.MAFIA_VOTE_RESULT
    ) {
      return 'bg-game-danger';
    }
    if (
      phase === GamePhase.PLAYING ||
      phase === GamePhase.DISCUSSION ||
      phase === GamePhase.MAFIA_DAWN ||
      phase === GamePhase.MAFIA_DISCUSSION
    ) {
      return 'bg-game-accent';
    }
    return 'bg-game-premium';
  })();

  useEffect(() => {
    const applyTheme = () => {
      let activeTheme = currentTheme;
      if (currentTheme === 'system') {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = isDarkMode ? 'dark' : 'light';
      }
      document.documentElement.className = `theme-${activeTheme} color-${currentButtonColor}`;
    };

    applyTheme();

    if (currentTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [currentTheme, currentButtonColor]);

  useEffect(() => {
    document.body.className = `${bgClass} text-text-main min-h-screen transition-colors duration-1000`;
    const isRTL = currentLanguage === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, phase, bgClass]);

  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ phase: GamePhase.WELCOME }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (showExitConfirmation) {
        setShowExitConfirmation(false);
        window.history.pushState({ phase }, '');
        return;
      }

      if (ACTIVE_GAME_PHASES.includes(phase)) {
        window.history.pushState({ phase }, '');
        setShowExitConfirmation(true);
        playSound('pop');
        return;
      }

      if (event.state && event.state.phase) {
        setPhase(event.state.phase);
      } else {
        setPhase(GamePhase.WELCOME);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [phase, showExitConfirmation]);

  const handlePlayersConfirmed = async (
    playersData: { name: string; avatar: string; isSleeping?: boolean }[]
  ) => {
    const activePlayers = playersData.filter((p) => !p.isSleeping);
    saveRecentPlayers(playersData);
    if (selectedGameType === 'mafia_shadow_city') {
      mafia.setTempPlayers(activePlayers.map((p) => ({ name: p.name, avatar: p.avatar })));
      navigate(GamePhase.MAFIA_SETTINGS);
      return;
    }
    offline.setTempPlayers(activePlayers);
    navigate(GamePhase.GAME_SETTINGS);
  };

  const handleGoHome = () => {
    if (ACTIVE_GAME_PHASES.includes(phase)) {
      setShowExitConfirmation(true);
      playSound('pop');
    } else {
      setCurrentRoomId(null);
      navigate(GamePhase.WELCOME);
    }
  };

  const confirmExit = async () => {
    const roomToLeave = currentRoomId;
    const uid = auth.currentUser?.uid;
    setShowExitConfirmation(false);
    setCurrentRoomId(null);
    offline.resetPendingSpecialModals();
    if (String(phase).startsWith('MAFIA_')) {
      mafia.resetMafiaMatch();
    }
    navigate(GamePhase.WELCOME);

    if (roomToLeave && uid) {
      try {
        await leaveOnlineRoom(roomToLeave, uid);
      } catch (err) {
        console.error('Failed to leave online room on exit:', err);
      }
    }
  };

  const handleCreateRoom = async (settings: {
    maxPlayers: number;
    language: string;
    isPrivate: boolean;
    category: string;
    difficulty: 'easy' | 'hard';
    turnDurationSeconds?: number;
  }) => {
    if (!auth.currentUser) {
      navigate(GamePhase.PROFILE);
      return;
    }
    if (onlineBusy) return;
    setOnlineBusy(true);
    try {
      const { roomId } = await createOnlineRoom({
        maxPlayers: settings.maxPlayers,
        language: settings.language,
        isPrivate: settings.isPrivate,
        category: settings.category || 'standard',
        difficulty: settings.difficulty || 'easy',
        turnDurationSeconds: settings.turnDurationSeconds || 45,
      });
      setCurrentRoomId(roomId);
      navigate(GamePhase.ONLINE_LOBBY);
    } catch (err) {
      console.warn('Error creating room:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setOnlineBusy(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!auth.currentUser) {
      navigate(GamePhase.PROFILE);
      return;
    }
    if (onlineBusy) return;
    setOnlineBusy(true);
    try {
      const res = await joinOnlineRoom({ roomId });
      if (res.success && res.roomId) {
        setCurrentRoomId(res.roomId);
        navigate(GamePhase.ONLINE_LOBBY);
      } else {
        const msgKey =
          res.reason === 'kickedFromRoom'
            ? 'kickedFromRoom'
            : res.reason === 'roomFull' || res.reason === 'matchAlreadyStarted'
            ? 'roomFull'
            : 'roomNotFound';
        showToast(t(msgKey), 'warning');
      }
    } catch (err) {
      console.warn('Error joining room:', err);
      showToast(t(getOnlineActionErrorKey(err)), 'error');
    } finally {
      setOnlineBusy(false);
    }
  };

  const handleLeaveOnlineToRooms = () => {
    setCurrentRoomId(null);
    navigate(GamePhase.ONLINE_ROOMS);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  };

  const pageTransition = {
    type: 'tween' as const,
    ease: 'easeOut' as const,
    duration: 0.2,
  };

  const justicePlayer = offline.players.find((p) => hasSpecialRole(p, 'justice'));
  const avengerPlayer =
    offline.pendingAvengerId !== null
      ? offline.players.find((p) => p.id === offline.pendingAvengerId)
      : null;
  const boomerangPlayer =
    offline.pendingBoomerangId !== null
      ? offline.players.find((p) => p.id === offline.pendingBoomerangId)
      : null;

  return (
    <div
      className={`h-[100dvh] text-text-main flex flex-col w-full relative overflow-hidden ${bgClass} ${
        currentLanguage === 'ar' ? 'font-cairo' : 'font-sans'
      }`}
    >
      <div className="bg-mesh" />
      <div className="bg-vignette" />
      <div className="bg-scanlines" />
      <ToastHost />
      {phase !== GamePhase.WELCOME && <Header onHome={handleGoHome} showHome={true} />}

      {offline.error && (
        <div className="mx-auto mt-2 px-4 py-2 rounded-[10px] bg-[#963F46]/15 border border-[#963F46]/45 text-danger-text text-xs font-bold z-30 flex items-center gap-3">
          <span>{offline.error}</span>
          <button onClick={() => offline.setError(null)} className="underline font-bold">
            {t('ok')}
          </button>
        </div>
      )}

      {(offline.isLoading || onlineBusy) && (
        <div className="fixed inset-0 z-50 bg-[#080B10]/85 flex items-center justify-center p-4">
          <div className="blacksite-panel rounded-[14px] px-8 py-6 text-center">
            <div className="w-9 h-9 border-[3px] border-[#B49A62] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-text-main">{t('preparing')}</p>
          </div>
        </div>
      )}

      <main className="w-full flex-1 flex flex-col relative overflow-y-auto custom-scrollbar overflow-x-hidden">
        <AnimatePresence mode="wait">
          {phase === GamePhase.WELCOME && (
            <motion.div
              key="welcome"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <WelcomeScreen
                onStart={() => {
                  setSelectedGameType('mr_white');
                  navigate(GamePhase.SETUP);
                }}
                onStartMafia={() => {
                  setSelectedGameType('mafia_shadow_city');
                  navigate(GamePhase.SETUP);
                }}
                hasSavedMafiaMatch={Boolean(
                  mafia.savedSavedSession || (mafia.matchState && mafia.matchState.phase !== 'ended')
                )}
                onResumeMafia={() => {
                  setSelectedGameType('mafia_shadow_city');
                  mafia.resumeSavedMatch();
                }}
                onShowScoreboard={() => navigate(GamePhase.SCOREBOARD)}
                onManagePlayers={() => navigate(GamePhase.PLAYERS_LIST)}
                onOpenSettings={() => navigate(GamePhase.SETTINGS)}
                onShowRules={() => navigate(GamePhase.RULES)}
                onShowProfile={() => navigate(GamePhase.PROFILE)}
                onShowOnline={() => navigate(GamePhase.ONLINE_ROOMS)}
                onShowDictionary={() => navigate(GamePhase.DICTIONARY)}
                onShowInventory={() => navigate(GamePhase.INVENTORY)}
                onLanguageChange={setCurrentLanguage}
                currentTheme={currentTheme}
              />
            </motion.div>
          )}

          {phase === GamePhase.DICTIONARY && (
            <motion.div
              key="dictionary"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <LanguageDictionary onBack={handleGoHome} />
            </motion.div>
          )}

          {phase === GamePhase.INVENTORY && (
            <motion.div
              key="inventory"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <InventoryScreen onBack={handleGoHome} />
            </motion.div>
          )}

          {phase === GamePhase.PROFILE && (
            <motion.div
              key="profile"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <ProfileScreen
                onBack={handleGoHome}
                onOpenArchive={() => {
                  setCaseFileReturnPhase(GamePhase.PROFILE);
                  navigate(GamePhase.OPERATION_ARCHIVE);
                }}
              />
            </motion.div>
          )}

          {phase === GamePhase.ONLINE_ROOMS && (
            <motion.div
              key="online_rooms"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <OnlineRoomsScreen
                onBack={handleGoHome}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                currentLanguage={currentLanguage}
              />
            </motion.div>
          )}

          {phase === GamePhase.ONLINE_LOBBY && currentRoomId && (
            <motion.div
              key="online_lobby"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <OnlineLobbyScreen
                roomId={currentRoomId}
                onBack={handleLeaveOnlineToRooms}
                onStartGame={() => navigate(GamePhase.ONLINE_GAME)}
              />
            </motion.div>
          )}

          {phase === GamePhase.ONLINE_GAME && currentRoomId && (
            <motion.div
              key="online_game"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <OnlineGameScreen
                roomId={currentRoomId}
                onBack={handleLeaveOnlineToRooms}
                onReturnToLobby={() => navigate(GamePhase.ONLINE_LOBBY)}
                onOpenCaseFile={(reportId) =>
                  openCaseFileView({
                    reportId,
                    modeHint: 'online',
                    returnPhase: GamePhase.ONLINE_GAME,
                  })
                }
              />
            </motion.div>
          )}

          {phase === GamePhase.SETUP && (
            <motion.div
              key="setup"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <PlayerSetup
                mode="setup"
                onNext={handlePlayersConfirmed}
                minPlayers={selectedGameType === 'mafia_shadow_city' ? 6 : 3}
                maxPlayers={selectedGameType === 'mafia_shadow_city' ? 14 : 20}
                gameType={selectedGameType}
              />
            </motion.div>
          )}

          {phase === GamePhase.GAME_SETTINGS && (
            <motion.div
              key="game_settings"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <GameSettingsScreen
                playersCount={offline.tempPlayers.length}
                onStart={offline.handleGameSettingsConfirmed}
                onBack={handleGoHome}
                onEditPlayers={() => navigate(GamePhase.SETUP)}
              />
            </motion.div>
          )}

          {phase === GamePhase.PLAYERS_LIST && (
            <motion.div
              key="players_list"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <PlayerSetup mode="manage" onBack={handleGoHome} />
            </motion.div>
          )}

          {phase === GamePhase.REVEAL && (
            <motion.div
              key="reveal"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <GameRound
                players={offline.players}
                rolePool={offline.rolePool}
                specialRolePool={offline.specialRolePool}
                secretWord={offline.secretWord}
                undercoverWord={offline.undercoverWord}
                relatedWords={offline.relatedWords}
                difficulty={offline.gameSettings.difficulty}
                onAssignRole={offline.setPlayerRole}
                onAllRevealed={() => navigate(GamePhase.PLAYING)}
              />
            </motion.div>
          )}

          {phase === GamePhase.PLAYING && (
            <motion.div
              key="playing"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <QuestionPhase
                players={offline.players}
                onTimeUp={() => navigate(GamePhase.VOTING)}
                gameMode={offline.gameSettings.gameMode}
                difficulty={offline.gameSettings.difficulty}
                currentRound={offline.currentRound}
                turnDurationSeconds={offline.gameSettings.turnDurationSeconds}
                secretWord={offline.secretWord}
                undercoverWord={offline.undercoverWord}
                descriptionsLog={offline.descriptionsLog}
                onAddDescription={(entry) => offline.setDescriptionsLog((prev) => [...prev, entry])}
                operationEvent={offline.currentOperationEvent}
              />
            </motion.div>
          )}

          {phase === GamePhase.DISCUSSION && (
            <motion.div
              key="discussion"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <DiscussionPhase
                players={offline.players}
                onTimeUp={() => navigate(GamePhase.VOTING)}
                onSkip={() => navigate(GamePhase.VOTING)}
              />
            </motion.div>
          )}

          {phase === GamePhase.VOTING && (
            <motion.div
              key="voting"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <VotingScreen
                players={offline.players}
                onVoteComplete={offline.handleVotingComplete}
                currentRound={offline.currentRound}
                difficulty={offline.gameSettings.difficulty}
                descriptionsLog={offline.descriptionsLog}
              />
            </motion.div>
          )}

          {phase === GamePhase.REVEAL_VOTE_RESULT && offline.mostVotedPlayerId !== null && (
            <motion.div
              key="reveal_vote_result"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <RevealVoteResult
                votedPlayerId={offline.mostVotedPlayerId}
                impostorId={offline.players[offline.impostorIndex]?.id ?? -1}
                undercoverId={offline.players.find((p) => p.role === 'undercover')?.id}
                players={offline.players}
                onNext={offline.handleRevealNext}
                voters={offline.players.filter((p) => offline.voteData[p.id] === offline.mostVotedPlayerId)}
                isOnline={false}
                blockedBySpecial={offline.blockedBySpecial}
                bouncedFromName={offline.bouncedFromName}
                foolBonusTriggered={offline.foolBonusTriggered}
                loversPartnerName={offline.loversPartnerName}
              />
            </motion.div>
          )}

          {phase === GamePhase.IMPOSTOR_GUESS && (
            <motion.div
              key="impostor_guess"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <ImpostorGuessScreen
                impostor={
                  offline.players.find((p) => p.id === offline.mostVotedPlayerId) ||
                  offline.players[offline.impostorIndex] ||
                  offline.players[0]
                }
                secretWord={offline.secretWord}
                undercoverWord={offline.undercoverWord}
                relatedWords={offline.relatedWords}
                onGuess={offline.handleImpostorGuess}
              />
            </motion.div>
          )}

          {phase === GamePhase.RESULT && (
            <motion.div
              key="result"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <ResultScreen
                players={offline.players}
                impostorIndex={offline.impostorIndex}
                secretWord={offline.secretWord}
                undercoverWord={offline.undercoverWord}
                voteData={offline.voteData}
                onGameEnd={(w) => offline.handleGameEnd(w)}
                onNext={() => navigate(GamePhase.SCOREBOARD)}
                roundWinner={offline.lastWinner}
                winReason={offline.winReason}
                winningMrWhiteId={
                  offline.winReason === 'impostor_guessed' ? offline.mostVotedPlayerId : null
                }
                onOpenCaseFile={
                  offline.latestCaseFile
                    ? () =>
                        openCaseFileView({
                          caseFile: offline.latestCaseFile,
                          modeHint: 'local',
                          returnPhase: GamePhase.RESULT,
                        })
                    : undefined
                }
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_SETTINGS && (
            <motion.div
              key="mafia_settings"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaSettingsScreen
                playersCount={mafia.tempPlayers.length}
                onStart={(mafiaSettings) => mafia.startNewMafiaMatch(mafiaSettings)}
                onBack={handleGoHome}
                onEditPlayers={() => navigate(GamePhase.SETUP)}
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_REVEAL && mafia.matchState && (
            <motion.div
              key="mafia_reveal"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaRoleRevealScreen
                match={mafia.matchState}
                onComplete={mafia.finishRoleReveal}
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_NIGHT && mafia.matchState && (
            <motion.div
              key="mafia_night"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaNightScreen
                key={`night-${mafia.matchState.nightNumber}`}
                match={mafia.matchState}
                onCompleteNight={mafia.completeNightPhase}
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_DAWN && mafia.matchState && (
            <motion.div
              key="mafia_dawn"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaDawnScreen
                match={mafia.matchState}
                onContinue={mafia.continueFromDawn}
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_DISCUSSION && mafia.matchState && (
            <motion.div
              key="mafia_discussion"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaDiscussionScreen
                match={mafia.matchState}
                onToggleNomination={mafia.toggleDiscussionNomination}
                onProceedToDefenseOrVoting={mafia.proceedToDefenseOrVoting}
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_VOTING && mafia.matchState && (
            <motion.div
              key="mafia_voting"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaVotingScreen
                key={`vote-${mafia.matchState.dayNumber}-${mafia.matchState.isRevote ? 'revote' : 'primary'}`}
                match={mafia.matchState}
                onVotingComplete={mafia.completeSecretVoting}
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_VOTE_RESULT && mafia.matchState && (
            <motion.div
              key="mafia_vote_result"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaVoteResultScreen
                match={mafia.matchState}
                onContinue={mafia.continueAfterVoteResult}
              />
            </motion.div>
          )}

          {phase === GamePhase.MAFIA_RESULT && mafia.matchState && (
            <motion.div
              key="mafia_result"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <MafiaResultScreen
                match={mafia.matchState}
                caseFile={mafia.latestCaseFile}
                onOpenCaseFile={
                  mafia.latestCaseFile
                    ? () =>
                        openCaseFileView({
                          caseFile: mafia.latestCaseFile,
                          modeHint: 'local',
                          returnPhase: GamePhase.MAFIA_RESULT,
                        })
                    : undefined
                }
                onPlayAgain={mafia.playAgainSameSquad}
                onGoHome={() => {
                  mafia.resetMafiaMatch();
                  navigate(GamePhase.WELCOME);
                }}
              />
            </motion.div>
          )}

          {phase === GamePhase.CASE_FILE && (
            <motion.div
              key="case_file"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <CaseFileScreen
                caseFile={activeCaseFile}
                reportId={activeCaseFileReportId}
                modeHint={activeCaseFileModeHint}
                onBack={() => navigate(caseFileReturnPhase)}
              />
            </motion.div>
          )}

          {phase === GamePhase.OPERATION_ARCHIVE && (
            <motion.div
              key="operation_archive"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <OperationArchiveScreen
                onBack={() =>
                  navigate(
                    caseFileReturnPhase === GamePhase.OPERATION_ARCHIVE
                      ? GamePhase.WELCOME
                      : caseFileReturnPhase
                  )
                }
                onOpenCaseFile={(cf) =>
                  openCaseFileView({
                    caseFile: cf,
                    modeHint: cf.mode,
                    returnPhase: GamePhase.OPERATION_ARCHIVE,
                  })
                }
              />
            </motion.div>
          )}

          {phase === GamePhase.SCOREBOARD && (
            <motion.div
              key="scoreboard"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <ScoreboardScreen
                onBack={handleGoHome}
                onNextRound={offline.tempPlayers.length > 0 ? offline.handlePlayAgain : undefined}
                onOpenArchive={() => {
                  setCaseFileReturnPhase(GamePhase.SCOREBOARD);
                  navigate(GamePhase.OPERATION_ARCHIVE);
                }}
              />
            </motion.div>
          )}

          {phase === GamePhase.SETTINGS && (
            <motion.div
              key="settings"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <SettingsScreen
                onBack={handleGoHome}
                onThemeChange={setCurrentTheme}
                onButtonColorChange={setCurrentButtonColor}
                onLanguageChange={setCurrentLanguage}
              />
            </motion.div>
          )}

          {phase === GamePhase.RULES && (
            <motion.div
              key="rules"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              <RulesScreen onBack={handleGoHome} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mr. Justice Tiebreaker Modal */}
      <AnimatePresence>
        {offline.pendingTieCandidates && justicePlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B10]/85 p-5"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 6 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                maxWidthClass="max-w-sm"
                ariaLabel={getRoleTitle('justice', currentLanguage)}
                className="p-6 text-center border-[#3E7B67]/45"
              >
                <div className="flex justify-center mb-3">
                  <ClassifiedStamp tone={getRoleVisualIdentity('justice', currentLanguage).stampTone}>
                    {getRoleVisualIdentity('justice', currentLanguage).stamp}
                  </ClassifiedStamp>
                </div>
                <div className="w-20 h-20 rounded-[12px] bg-bg-card border border-[#3E7B67]/40 p-1.5 mx-auto mb-3 overflow-hidden">
                  <img
                    src={getRoleAsset('justice')}
                    alt={getRoleTitle('justice', currentLanguage)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-[8px]"
                  />
                </div>
                <h3 className="text-lg font-extrabold text-emerald-text mb-1">
                  {getRoleTitle('justice', currentLanguage)} ({justicePlayer.name})
                </h3>
                <p className="text-xs font-medium text-text-muted mb-5 leading-relaxed">
                  {currentLanguage === 'ar'
                    ? 'حدث تعادل في الأصوات! اختر من سيتم إقصاؤه من بين المتعادلين:'
                    : 'Tie vote! Choose which tied player gets eliminated:'}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {offline.pendingTieCandidates.map((candId) => {
                    const cand = offline.players.find((p) => p.id === candId);
                    if (!cand) return null;
                    return (
                      <button
                        key={cand.id}
                        onClick={() => {
                          playSound('abilityActivate');
                          offline.resolveTieWithJustice(cand.id);
                        }}
                        className="p-3 rounded-[10px] blacksite-card-interactive hover:bg-[#3E7B67]/15 hover:border-[#3E7B67]/50 flex flex-col items-center gap-2 min-h-[44px]"
                      >
                        <Avatar avatar={cand.avatar} name={cand.name} size={52} />
                        <span className="text-sm font-bold text-text-main truncate max-w-full">
                          {cand.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mr. Boomerang Reflection Picker Modal */}
      <AnimatePresence>
        {boomerangPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B10]/85 p-5"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 6 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                maxWidthClass="max-w-sm"
                ariaLabel={getRoleTitle('boomerang', currentLanguage)}
                className="p-6 text-center border-[#963F46]/45"
              >
                <div className="flex justify-center mb-3">
                  <ClassifiedStamp tone={getRoleVisualIdentity('boomerang', currentLanguage).stampTone}>
                    {getRoleVisualIdentity('boomerang', currentLanguage).stamp}
                  </ClassifiedStamp>
                </div>
                <div className="w-20 h-20 rounded-[12px] bg-bg-card border border-[#963F46]/40 p-1.5 mx-auto mb-3 overflow-hidden">
                  <img
                    src={getRoleAsset('boomerang')}
                    alt={getRoleTitle('boomerang', currentLanguage)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-[8px]"
                  />
                </div>
                <h3 className="text-lg font-extrabold text-danger-text mb-1">
                  {getRoleTitle('boomerang', currentLanguage)} ({boomerangPlayer.name})
                </h3>
                <p className="text-xs font-medium text-text-muted mb-5 leading-relaxed">
                  {currentLanguage === 'ar'
                    ? 'ارتد التصويت! اختر أحد المصوتين ضدك ليواجه الإقصاء بدلاً منك:'
                    : 'Counter-bounce activated! Pick an accuser to take the elimination instead:'}
                </p>
                <div className="grid grid-cols-3 gap-2.5 max-h-64 overflow-y-auto">
                  {offline.players
                    .filter((p) => !p.isEliminated && p.id !== boomerangPlayer.id)
                    .map((target) => (
                      <button
                        key={target.id}
                        onClick={() => {
                          playSound('abilityActivate');
                          offline.handleBoomerangTargetPick(target.id);
                        }}
                        className="p-2.5 rounded-[10px] blacksite-card-interactive hover:bg-[#963F46]/15 hover:border-[#963F46]/50 flex flex-col items-center gap-1.5 min-h-[44px]"
                      >
                        <Avatar avatar={target.avatar} name={target.name} size={46} />
                        <span className="text-xs font-bold text-text-main truncate max-w-full">
                          {target.name}
                        </span>
                      </button>
                    ))}
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mr. Avenger Revenge Picker Modal */}
      <AnimatePresence>
        {avengerPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B10]/85 p-5"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 6 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                maxWidthClass="max-w-sm"
                ariaLabel={getRoleTitle('avenger', currentLanguage)}
                className="p-6 text-center border-[#A45A44]/45"
              >
                <div className="flex justify-center mb-3">
                  <ClassifiedStamp tone={getRoleVisualIdentity('avenger', currentLanguage).stampTone}>
                    {getRoleVisualIdentity('avenger', currentLanguage).stamp}
                  </ClassifiedStamp>
                </div>
                <div className="w-20 h-20 rounded-[12px] bg-bg-card border border-[#A45A44]/40 p-1.5 mx-auto mb-3 overflow-hidden">
                  <img
                    src={getRoleAsset('avenger')}
                    alt={getRoleTitle('avenger', currentLanguage)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-[8px]"
                  />
                </div>
                <h3 className="text-lg font-extrabold text-primary-text mb-1">
                  {getRoleTitle('avenger', currentLanguage)} ({avengerPlayer.name})
                </h3>
                <p className="text-xs font-medium text-text-muted mb-5 leading-relaxed">
                  {currentLanguage === 'ar'
                    ? 'انتقم قبل مغادرتك! اختر لاعباً ليخرج معك الآن:'
                    : 'Take your revenge! Pick one player to eliminate with you:'}
                </p>
                <div className="grid grid-cols-3 gap-2.5 max-h-64 overflow-y-auto">
                  {offline.players
                    .filter((p) => !p.isEliminated)
                    .map((target) => (
                      <button
                        key={target.id}
                        onClick={() => {
                          playSound('abilityActivate');
                          offline.handleAvengerTargetPick(target.id);
                        }}
                        className="p-2.5 rounded-[10px] blacksite-card-interactive hover:bg-[#A45A44]/15 hover:border-[#A45A44]/50 flex flex-col items-center gap-1.5 min-h-[44px]"
                      >
                        <Avatar avatar={target.avatar} name={target.name} size={46} />
                        <span className="text-xs font-bold text-text-main truncate max-w-full">
                          {target.name}
                        </span>
                      </button>
                    ))}
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#080B10]/85 p-6"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 6 }}
              className="w-full max-w-sm"
            >
              <ModalShell
                maxWidthClass="max-w-sm"
                onClose={() => setShowExitConfirmation(false)}
                ariaLabel={t('alert')}
                className="p-6"
              >
                <h3 className="text-text-main font-bold text-lg mb-2 text-start">{t('alert')}</h3>
                <p className="text-text-muted text-sm font-medium mb-6 text-start leading-relaxed">
                  {t('exitGameConfirmation')}
                </p>

                <div className="flex gap-3">
                  <TacticalButton variant="danger" onClick={confirmExit} className="flex-1">
                    {t('leave')}
                  </TacticalButton>
                  <TacticalButton
                    variant="secondary"
                    onClick={() => setShowExitConfirmation(false)}
                    className="flex-1"
                  >
                    {t('stay')}
                  </TacticalButton>
                </div>
              </ModalShell>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <AppContent />
        </MotionConfig>
      </AuthProvider>
    </ErrorBoundary>
  );
}