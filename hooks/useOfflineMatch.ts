import { useCallback, useRef, useState } from 'react';
import {
  DescriptionEntry,
  GamePhase,
  GameSettings,
  Player,
  PlayerRole,
  SpecialRoleId,
} from '../types';
import { VoteCompletionMeta } from '../components/VotingScreen';
import { getRandomWordPair } from '../services/geminiService';
import {
  getScores,
  recordOfflineSessionMatch,
  updatePlayerScore,
} from '../services/storageService';
import { auth } from '../firebase';
import { playSound } from '../services/soundService';
import { buildMainRolePool, buildSpecialRolePool } from '../src/game/roleEngine';
import {
  checkFoolFirstExitBonus,
  checkShieldProtection,
  getLinkedLoverPartnerId,
  hasSpecialRole,
  tallyVotes,
} from '../src/game/voteEngine';
import { evaluateWinCondition, getPlayerRoundPoints } from '../src/game/winEngine';

interface UseOfflineMatchOptions {
  navigate: (nextPhase: GamePhase) => void;
  t: (key: string) => string;
}

export function useOfflineMatch({ navigate, t }: UseOfflineMatchOptions) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tempPlayers, setTempPlayers] = useState<{ name: string; avatar: string }[]>([]);
  const [rolePool, setRolePool] = useState<string[]>([]);
  const [specialRolePool, setSpecialRolePool] = useState<(SpecialRoleId | null)[]>([]);
  const [secretWord, setSecretWord] = useState<string>('');
  const [undercoverWord, setUndercoverWord] = useState<string>('');
  const [relatedWords, setRelatedWords] = useState<string[]>([]);
  const [impostorIndex, setImpostorIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [voteData, setVoteData] = useState<Record<number, number>>({});
  const [mostVotedPlayerId, setMostVotedPlayerId] = useState<number | null>(null);
  const [blockedBySpecial, setBlockedBySpecial] = useState<'boomerang' | 'protector' | null>(null);
  const [bouncedFromName, setBouncedFromName] = useState<string | null>(null);
  const [foolBonusTriggered, setFoolBonusTriggered] = useState<boolean>(false);
  const [loversPartnerName, setLoversPartnerName] = useState<string | null>(null);

  const [pendingTieCandidates, setPendingTieCandidates] = useState<number[] | null>(null);
  const [pendingAvengerId, setPendingAvengerId] = useState<number | null>(null);
  const [pendingBoomerangId, setPendingBoomerangId] = useState<number | null>(null);
  const [pendingVoteMeta, setPendingVoteMeta] = useState<VoteCompletionMeta | null>(null);

  const [descriptionsLog, setDescriptionsLog] = useState<DescriptionEntry[]>([]);
  const [lastWinner, setLastWinner] = useState<'impostor' | 'citizens' | 'fool' | null>(null);
  const [winReason, setWinReason] = useState<
    'impostor_guessed' | 'citizens_wrong_vote' | 'impostor_caught' | 'fool_won' | null
  >(null);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const matchKeyRef = useRef<string>('');

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    mrWhiteCount: 1,
    undercoverCount: 0,
    category: 'standard',
    difficulty: 'easy',
    useSpecialRoles: false,
    selectedSpecialRoles: [],
    gameMode: 'expression',
    turnDurationSeconds: 45,
  });

  const resetPendingSpecialModals = useCallback(() => {
    setPendingTieCandidates(null);
    setPendingAvengerId(null);
    setPendingBoomerangId(null);
    setPendingVoteMeta(null);
  }, []);

  const setPlayerRole = useCallback(
    (playerId: number, role: string, specialRole: SpecialRoleId | null = null) => {
      setPlayers((prev) => {
        const typedRole = role as PlayerRole;
        const isLover = specialRole === 'lovers' || typedRole === 'lovers';
        const existingLover = isLover
          ? prev.find(
              (p) =>
                p.id !== playerId && (p.specialRole === 'lovers' || p.role === 'lovers')
            )
          : undefined;

        return prev.map((p) => {
          if (p.id === playerId) {
            const isImpostor = typedRole === 'mrwhite';
            if (isImpostor) setImpostorIndex(playerId);
            return {
              ...p,
              role: typedRole,
              specialRole: specialRole ?? null,
              isImpostor,
              loverPartnerId: existingLover ? existingLover.id : p.loverPartnerId,
            };
          }
          if (existingLover && p.id === existingLover.id) {
            return { ...p, loverPartnerId: playerId };
          }
          return p;
        });
      });
    },
    []
  );

  const initializeGame = useCallback(
    (
      activePlayers: { name: string; avatar: string }[],
      civWord: string,
      ucWord: string,
      decoys: string[] = [],
      settings: GameSettings
    ) => {
      const globalScores = getScores();
      const newPlayers: Player[] = activePlayers.map((p, index) => ({
        id: index,
        name: p.name,
        role: 'citizen',
        specialRole: null,
        isImpostor: false,
        score: globalScores[p.name] || 0,
        avatar: p.avatar,
        isEliminated: false,
        specialAbilityUsed: false,
        foolBonusAwarded: false,
        loverPartnerId: undefined,
      }));

      const pool = buildMainRolePool(
        activePlayers.length,
        settings.mrWhiteCount,
        settings.undercoverCount
      );
      const spPool =
        settings.useSpecialRoles && settings.selectedSpecialRoles?.length > 0
          ? buildSpecialRolePool(pool, settings.selectedSpecialRoles)
          : Array<SpecialRoleId | null>(activePlayers.length).fill(null);

      setPlayers(newPlayers);
      setRolePool(pool);
      setSpecialRolePool(spPool);
      setSecretWord(civWord);
      setUndercoverWord(ucWord);
      setRelatedWords(decoys);
      setImpostorIndex(-1);
      setLastWinner(null);
      setWinReason(null);
      setVoteData({});
      setMostVotedPlayerId(null);
      setBlockedBySpecial(null);
      setBouncedFromName(null);
      setFoolBonusTriggered(false);
      setLoversPartnerName(null);
      setPendingTieCandidates(null);
      setPendingAvengerId(null);
      setPendingBoomerangId(null);
      setPendingVoteMeta(null);
      setDescriptionsLog([]);
      setCurrentRound(1);
      matchKeyRef.current = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      navigate(GamePhase.REVEAL);
    },
    [navigate]
  );

  const handleGameSettingsConfirmed = async (settings: GameSettings) => {
    setGameSettings(settings);
    setIsLoading(true);
    setError(null);
    try {
      const { civilianWord, undercoverWord: ucWord, decoys } = await getRandomWordPair(
        undefined,
        settings.category
      );
      initializeGame(tempPlayers, civilianWord, ucWord, decoys, settings);
    } catch (err) {
      console.error(err);
      setError(t('errorLoadingWords'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameEnd = useCallback(
    (
      winner: 'impostor' | 'citizens' | 'fool',
      reason?: string,
      _explicitVotes?: Record<number, number>,
      playersOverride?: Player[],
      winningMrWhiteId?: number | null
    ) => {
      const resolvedWinner: 'impostor' | 'citizens' = winner === 'fool' ? 'citizens' : winner;
      const effectiveReason = reason ?? winReason;
      setLastWinner(resolvedWinner);
      const sourcePlayers = playersOverride || players;

      const outcomes: { name: string; role: string; specialRole?: string | null; won: boolean }[] =
        [];
      const updatedPlayers = sourcePlayers.map((p) => {
        const pointsToAdd = getPlayerRoundPoints(
          p,
          sourcePlayers,
          resolvedWinner,
          effectiveReason,
          winningMrWhiteId
        );
        outcomes.push({
          name: p.name,
          role: p.role,
          specialRole: p.specialRole ?? null,
          won: pointsToAdd > 0,
        });

        if (pointsToAdd > 0) {
          updatePlayerScore(p.name, pointsToAdd);
          return { ...p, score: p.score + pointsToAdd };
        }
        return p;
      });
      setPlayers(updatedPlayers);

      if (outcomes.length > 0) {
        const key =
          matchKeyRef.current || `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        matchKeyRef.current = key;
        recordOfflineSessionMatch({
          matchKey: key,
          uid: auth.currentUser?.uid || null,
          outcomes,
        });
      }
    },
    [players, winReason]
  );

  const evaluateWinOrContinue = useCallback(
    (updatedPlayers: Player[]) => {
      const evaluation = evaluateWinCondition(updatedPlayers);
      if (evaluation.isOver && evaluation.winner && evaluation.winReason) {
        setWinReason(evaluation.winReason);
        handleGameEnd(evaluation.winner, evaluation.winReason, undefined, updatedPlayers);
        navigate(GamePhase.RESULT);
      } else {
        setCurrentRound((prev) => prev + 1);
        setVoteData({});
        setMostVotedPlayerId(null);
        setBlockedBySpecial(null);
        setBouncedFromName(null);
        setFoolBonusTriggered(false);
        setLoversPartnerName(null);
        navigate(GamePhase.PLAYING);
      }
    },
    [handleGameEnd, navigate]
  );

  const eliminatePlayerAndCheckWin = useCallback(
    (eliminatedId: number) => {
      const eliminatedPlayer = players.find((p) => p.id === eliminatedId);
      const earnedFoolBonus = checkFoolFirstExitBonus(players, eliminatedId);
      const partnerId = getLinkedLoverPartnerId(players, eliminatedId);
      const hasAvenger = hasSpecialRole(eliminatedPlayer, 'avenger');

      const updatedPlayers = players.map((p) => {
        if (p.id === eliminatedId) {
          return {
            ...p,
            isEliminated: true,
            foolBonusAwarded: earnedFoolBonus ? true : p.foolBonusAwarded,
            specialAbilityUsed: hasAvenger ? true : p.specialAbilityUsed,
          };
        }
        if (partnerId !== undefined && p.id === partnerId) {
          return { ...p, isEliminated: true };
        }
        return p;
      });

      setPlayers(updatedPlayers);

      const remainingAlive = updatedPlayers.filter((p) => !p.isEliminated);
      const postEval = evaluateWinCondition(updatedPlayers);

      if (
        hasAvenger &&
        !eliminatedPlayer?.specialAbilityUsed &&
        !postEval.isOver &&
        remainingAlive.length > 1
      ) {
        setPendingAvengerId(eliminatedPlayer!.id);
        return;
      }

      evaluateWinOrContinue(updatedPlayers);
    },
    [players, evaluateWinOrContinue]
  );

  const handleAvengerTargetPick = (targetId: number) => {
    playSound('dramatic');
    const targetPlayer = players.find((p) => p.id === targetId);

    if (targetPlayer?.role === 'mrwhite' && relatedWords && relatedWords.length > 0) {
      const updatedAvengerOnly = players.map((p) =>
        p.id === pendingAvengerId
          ? { ...p, isEliminated: true, specialAbilityUsed: true }
          : p
      );
      setPendingAvengerId(null);
      setPlayers(updatedAvengerOnly);
      setMostVotedPlayerId(targetId);
      navigate(GamePhase.IMPOSTOR_GUESS);
      return;
    }

    const partnerId = getLinkedLoverPartnerId(players, targetId);
    const updatedPlayers = players.map((p) => {
      if (
        p.id === targetId ||
        p.id === pendingAvengerId ||
        (partnerId !== undefined && p.id === partnerId)
      ) {
        return { ...p, isEliminated: true, specialAbilityUsed: true };
      }
      return p;
    });

    setPendingAvengerId(null);
    setPlayers(updatedPlayers);
    evaluateWinOrContinue(updatedPlayers);
  };

  const finalizeVoteVictim = (target: Player, shieldedTargetId?: number | null) => {
    const shieldResult = checkShieldProtection(players, target.id, shieldedTargetId);

    if (shieldResult.shieldHolderId !== null) {
      const hasExplicitShield =
        shieldedTargetId !== null && shieldedTargetId !== undefined;
      if (hasExplicitShield) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === shieldResult.shieldHolderId ? { ...p, specialAbilityUsed: true } : p
          )
        );
        if (shieldResult.protected) {
          setBlockedBySpecial('protector');
          setMostVotedPlayerId(target.id);
          navigate(GamePhase.REVEAL_VOTE_RESULT);
          return;
        }
      } else if (shieldResult.protected) {
        setPlayers((prev) =>
          prev.map((p) => (p.id === target.id ? { ...p, specialAbilityUsed: true } : p))
        );
        setBlockedBySpecial('protector');
        setMostVotedPlayerId(target.id);
        navigate(GamePhase.REVEAL_VOTE_RESULT);
        return;
      }
    }

    if (target.role !== 'mrwhite') {
      if (checkFoolFirstExitBonus(players, target.id)) {
        setFoolBonusTriggered(true);
      }
      const partnerId = getLinkedLoverPartnerId(players, target.id);
      if (partnerId !== undefined) {
        const partner = players.find((p) => !p.isEliminated && p.id === partnerId);
        if (partner) setLoversPartnerName(partner.name);
      }
    }

    setMostVotedPlayerId(target.id);
    navigate(GamePhase.REVEAL_VOTE_RESULT);
  };

  const resolveVoteTarget = (
    targetId: number,
    votes: Record<number, number>,
    meta?: VoteCompletionMeta
  ) => {
    setBlockedBySpecial(null);
    setBouncedFromName(null);
    setFoolBonusTriggered(false);
    setLoversPartnerName(null);

    const votedPlayer = players.find((p) => p.id === targetId);
    if (!votedPlayer) return;

    if (meta?.shieldedTargetId === votedPlayer.id) {
      finalizeVoteVictim(votedPlayer, meta.shieldedTargetId);
      return;
    }

    if (hasSpecialRole(votedPlayer, 'boomerang') && !votedPlayer.specialAbilityUsed) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === votedPlayer.id ? { ...p, specialAbilityUsed: true } : p))
      );

      if (!meta?.isGroupVote) {
        const nonSelfVoters = Object.entries(votes)
          .filter(([vId, tId]) => tId === votedPlayer.id && Number(vId) !== votedPlayer.id)
          .map(([vId]) => Number(vId));
        const aliveVoters = nonSelfVoters.filter(
          (id) => !players.find((p) => p.id === id)?.isEliminated
        );
        const bouncePool = aliveVoters.length > 0 ? aliveVoters : nonSelfVoters;

        if (bouncePool.length > 0) {
          const bouncedId = bouncePool[Math.floor(Math.random() * bouncePool.length)];
          const bouncedPlayer = players.find((p) => p.id === bouncedId);
          if (bouncedPlayer) {
            setBouncedFromName(votedPlayer.name);
            finalizeVoteVictim(bouncedPlayer, meta?.shieldedTargetId);
            return;
          }
        }
      }

      const otherAlivePlayers = players.filter((p) => !p.isEliminated && p.id !== votedPlayer.id);
      if (otherAlivePlayers.length > 0) {
        setPendingVoteMeta(meta || null);
        setPendingBoomerangId(votedPlayer.id);
        return;
      }
    }

    finalizeVoteVictim(votedPlayer, meta?.shieldedTargetId);
  };

  const handleBoomerangTargetPick = (targetId: number) => {
    const boomerangPlayer =
      pendingBoomerangId !== null ? players.find((p) => p.id === pendingBoomerangId) : null;
    const victim = players.find((p) => p.id === targetId);
    const savedMeta = pendingVoteMeta;
    setPendingBoomerangId(null);
    setPendingVoteMeta(null);

    if (!victim) return;
    playSound('dramatic');
    if (boomerangPlayer) {
      setBouncedFromName(boomerangPlayer.name);
    }
    finalizeVoteVictim(victim, savedMeta?.shieldedTargetId);
  };

  const handleVotingComplete = (votes: Record<number, number>, meta?: VoteCompletionMeta) => {
    setVoteData(votes);
    setPendingVoteMeta(meta || null);

    const tally = tallyVotes(votes as Record<string, number>);
    if (tally.candidates.length === 0) return;

    if (tally.isTie) {
      const justicePlayer = players.find((p) => hasSpecialRole(p, 'justice'));
      if (justicePlayer) {
        setPendingTieCandidates(tally.candidates);
        return;
      }
      const randomTieLoser =
        tally.candidates[Math.floor(Math.random() * tally.candidates.length)];
      resolveVoteTarget(randomTieLoser, votes, meta);
      return;
    }

    resolveVoteTarget(tally.candidates[0], votes, meta);
  };

  const handleRevealNext = () => {
    const votedPlayer = players.find((p) => p.id === mostVotedPlayerId);
    if (!votedPlayer) return;

    if (blockedBySpecial) {
      setCurrentRound((prev) => prev + 1);
      setVoteData({});
      setMostVotedPlayerId(null);
      setBlockedBySpecial(null);
      setBouncedFromName(null);
      setFoolBonusTriggered(false);
      setLoversPartnerName(null);
      navigate(GamePhase.PLAYING);
      return;
    }

    if (votedPlayer.role === 'mrwhite') {
      navigate(GamePhase.IMPOSTOR_GUESS);
    } else {
      eliminatePlayerAndCheckWin(votedPlayer.id);
    }
  };

  const handleImpostorGuess = (isCorrect: boolean) => {
    if (isCorrect) {
      setWinReason('impostor_guessed');
      handleGameEnd('impostor', 'impostor_guessed', undefined, undefined, mostVotedPlayerId);
      navigate(GamePhase.RESULT);
    } else {
      eliminatePlayerAndCheckWin(mostVotedPlayerId!);
    }
  };

  const handlePlayAgain = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { civilianWord, undercoverWord: ucWord, decoys } = await getRandomWordPair(
        undefined,
        gameSettings.category
      );
      initializeGame(tempPlayers, civilianWord, ucWord, decoys, gameSettings);
    } catch (err) {
      console.error(err);
      setError(t('errorLoadingWords'));
    } finally {
      setIsLoading(false);
    }
  };

  const resolveTieWithJustice = (candId: number) => {
    playSound('vote');
    const savedMeta = pendingVoteMeta;
    setPendingTieCandidates(null);
    resolveVoteTarget(candId, voteData, savedMeta || undefined);
  };

  return {
    players,
    tempPlayers,
    setTempPlayers,
    rolePool,
    specialRolePool,
    secretWord,
    undercoverWord,
    relatedWords,
    impostorIndex,
    isLoading,
    error,
    setError,
    voteData,
    mostVotedPlayerId,
    blockedBySpecial,
    bouncedFromName,
    foolBonusTriggered,
    loversPartnerName,
    pendingTieCandidates,
    pendingAvengerId,
    pendingBoomerangId,
    descriptionsLog,
    setDescriptionsLog,
    lastWinner,
    winReason,
    currentRound,
    gameSettings,
    setPlayerRole,
    handleGameSettingsConfirmed,
    handleVotingComplete,
    handleRevealNext,
    handleImpostorGuess,
    handleAvengerTargetPick,
    handleBoomerangTargetPick,
    resolveTieWithJustice,
    handleGameEnd,
    handlePlayAgain,
    resetPendingSpecialModals,
  };
}
