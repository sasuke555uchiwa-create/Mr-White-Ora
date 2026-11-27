import { useCallback, useRef, useState } from 'react';
import {
  CaseFileEvent,
  CaseFileWinReason,
  ClassifiedCaseFile,
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
  getSettings,
  recordOfflineSessionMatch,
  saveLocalCaseFile,
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
import { buildClassifiedCaseFile, CaseFileRoundInput } from '../src/game/caseFileEngine';
import { OperationEventCard, pickOperationEvent } from '../data/operationEvents';

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
  const [latestCaseFile, setLatestCaseFile] = useState<ClassifiedCaseFile | null>(null);
  const [currentOperationEvent, setCurrentOperationEvent] = useState<OperationEventCard | null>(
    null
  );

  const matchKeyRef = useRef<string>('');
  const matchStartedAtMsRef = useRef<number>(0);
  const descriptionsLogRef = useRef<DescriptionEntry[]>([]);
  const roundRecordsRef = useRef<CaseFileRoundInput[]>([]);
  const matchEventsRef = useRef<CaseFileEvent[]>([]);
  const activeRoundVoteRef = useRef<CaseFileRoundInput | null>(null);
  const pendingRoundElimsRef = useRef<string[]>([]);
  const usedOperationEventIdsRef = useRef<string[]>([]);

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    mrWhiteCount: 1,
    undercoverCount: 0,
    category: 'standard',
    difficulty: 'easy',
    useSpecialRoles: false,
    selectedSpecialRoles: [],
    gameMode: 'expression',
    turnDurationSeconds: 45,
    enableOperationEvents: true,
  });

  const appendDescriptionEntry = useCallback(
    (updater: DescriptionEntry[] | ((prev: DescriptionEntry[]) => DescriptionEntry[])) => {
      setDescriptionsLog((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        descriptionsLogRef.current = next;
        return next;
      });
    },
    []
  );

  const commitActiveRound = useCallback((extraEliminatedIds: string[] = []) => {
    const active = activeRoundVoteRef.current;
    const combinedElims = Array.from(
      new Set([...pendingRoundElimsRef.current, ...extraEliminatedIds])
    );
    if (active) {
      roundRecordsRef.current = [
        ...roundRecordsRef.current,
        {
          ...active,
          eliminatedIds: Array.from(new Set([...(active.eliminatedIds || []), ...combinedElims])),
        },
      ];
    } else if (combinedElims.length > 0) {
      roundRecordsRef.current = [
        ...roundRecordsRef.current,
        {
          roundNumber: roundRecordsRef.current.length + 1,
          voteMode: 'group',
          votesByPlayerId: {},
          mostVotedId: combinedElims[0] || null,
          eliminatedIds: combinedElims,
        },
      ];
    }
    activeRoundVoteRef.current = null;
    pendingRoundElimsRef.current = [];
  }, []);

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
      descriptionsLogRef.current = [];
      setCurrentRound(1);
      setLatestCaseFile(null);

      const nowMs = Date.now();
      matchStartedAtMsRef.current = nowMs;
      roundRecordsRef.current = [];
      matchEventsRef.current = [];
      activeRoundVoteRef.current = null;
      pendingRoundElimsRef.current = [];
      usedOperationEventIdsRef.current = [];
      if (settings.enableOperationEvents !== false) {
        const firstEvt = pickOperationEvent({
          gameMode: settings.gameMode,
          round: 1,
        });
        usedOperationEventIdsRef.current = [firstEvt.id];
        setCurrentOperationEvent(firstEvt);
      } else {
        setCurrentOperationEvent(null);
      }
      matchKeyRef.current = `offline_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;

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
      const effectiveReason = (reason ?? winReason ?? (resolvedWinner === 'citizens' ? 'impostor_caught' : 'citizens_wrong_vote')) as CaseFileWinReason;
      setLastWinner(resolvedWinner);
      const sourcePlayers = playersOverride || players;

      if (activeRoundVoteRef.current || pendingRoundElimsRef.current.length > 0) {
        commitActiveRound();
      }

      const outcomes: { name: string; role: string; specialRole?: string | null; won: boolean }[] =
        [];
      const pointsByPlayerId = new Map<number, number>();
      const updatedPlayers = sourcePlayers.map((p) => {
        const pointsToAdd = getPlayerRoundPoints(
          p,
          sourcePlayers,
          resolvedWinner,
          effectiveReason,
          winningMrWhiteId
        );
        pointsByPlayerId.set(p.id, pointsToAdd);
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

      const nowMs = Date.now();
      const key =
        matchKeyRef.current || `offline_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
      matchKeyRef.current = key;

      if (outcomes.length > 0) {
        recordOfflineSessionMatch({
          matchKey: key,
          uid: auth.currentUser?.uid || null,
          outcomes,
        });
      }

      if (sourcePlayers.length > 0) {
        const appLang = getSettings().language || 'ar';
        const clues = descriptionsLogRef.current.map((entry, idx) => ({
          id: `clue_${entry.round}_${entry.playerId}_${idx}`,
          round: entry.round,
          playerId: String(entry.playerId),
          playerName: entry.playerName,
          playerAvatar: entry.playerAvatar,
          text: entry.text,
          skipped: false,
        }));

        const caseFile = buildClassifiedCaseFile({
          reportId: key,
          mode: 'local',
          matchId: key,
          startedAtMs: matchStartedAtMsRef.current || nowMs,
          endedAtMs: nowMs,
          language: appLang,
          category: gameSettings.category,
          difficulty: gameSettings.difficulty,
          gameMode: gameSettings.gameMode,
          winner: resolvedWinner,
          winReason: effectiveReason,
          winningMrWhiteId:
            winningMrWhiteId !== null && winningMrWhiteId !== undefined
              ? String(winningMrWhiteId)
              : null,
          secretWord,
          undercoverWord,
          players: sourcePlayers.map((p) => {
            const pts = pointsByPlayerId.get(p.id) || 0;
            return {
              playerId: String(p.id),
              uid: p.uid,
              name: p.name,
              avatar: p.avatar,
              role: p.role,
              specialRole: p.specialRole ?? null,
              isEliminated: Boolean(p.isEliminated),
              pointsEarned: pts,
              won: pts > 0,
              foolBonusAwarded: Boolean(p.foolBonusAwarded),
            };
          }),
          clues,
          rounds: roundRecordsRef.current,
          specialEvents: matchEventsRef.current,
        });

        saveLocalCaseFile(caseFile);
        setLatestCaseFile(caseFile);
      }
    },
    [commitActiveRound, gameSettings.category, gameSettings.difficulty, gameSettings.gameMode, players, secretWord, undercoverWord, winReason]
  );

  const evaluateWinOrContinue = useCallback(
    (updatedPlayers: Player[]) => {
      const evaluation = evaluateWinCondition(updatedPlayers);
      if (evaluation.isOver && evaluation.winner && evaluation.winReason) {
        commitActiveRound();
        setWinReason(evaluation.winReason);
        handleGameEnd(evaluation.winner, evaluation.winReason, undefined, updatedPlayers);
        navigate(GamePhase.RESULT);
      } else {
        commitActiveRound();
        setCurrentRound((prev) => {
          const nextRound = prev + 1;
          if (gameSettings.enableOperationEvents !== false) {
            const nextEvt = pickOperationEvent({
              gameMode: gameSettings.gameMode,
              round: nextRound,
              excludeIds: usedOperationEventIdsRef.current,
            });
            usedOperationEventIdsRef.current = [...usedOperationEventIdsRef.current, nextEvt.id];
            setCurrentOperationEvent(nextEvt);
          } else {
            setCurrentOperationEvent(null);
          }
          return nextRound;
        });
        setVoteData({});
        setMostVotedPlayerId(null);
        setBlockedBySpecial(null);
        setBouncedFromName(null);
        setFoolBonusTriggered(false);
        setLoversPartnerName(null);
        navigate(GamePhase.PLAYING);
      }
    },
    [commitActiveRound, handleGameEnd, navigate, gameSettings]
  );

  const eliminatePlayerAndCheckWin = useCallback(
    (eliminatedId: number) => {
      const eliminatedPlayer = players.find((p) => p.id === eliminatedId);
      const earnedFoolBonus = checkFoolFirstExitBonus(players, eliminatedId);
      const partnerId = getLinkedLoverPartnerId(players, eliminatedId);
      const hasAvenger = hasSpecialRole(eliminatedPlayer, 'avenger');

      if (eliminatedPlayer) {
        matchEventsRef.current.push({
          id: `ev_elim_r${currentRound}_${eliminatedId}`,
          round: currentRound,
          type: 'player_eliminated',
          targetId: String(eliminatedId),
          targetName: eliminatedPlayer.name,
          outcome: eliminatedPlayer.role,
          timestampMs: Date.now(),
        });
      }
      if (earnedFoolBonus && eliminatedPlayer) {
        matchEventsRef.current.push({
          id: `ev_joy_r${currentRound}_${eliminatedId}`,
          round: currentRound,
          type: 'mr_joy_bonus',
          actorId: String(eliminatedId),
          actorName: eliminatedPlayer.name,
          outcome: '+4',
          timestampMs: Date.now(),
        });
      }
      if (partnerId !== undefined && eliminatedPlayer) {
        const partner = players.find((p) => p.id === partnerId && !p.isEliminated);
        if (partner) {
          matchEventsRef.current.push({
            id: `ev_lover_r${currentRound}_${partnerId}`,
            round: currentRound,
            type: 'lovers_heartbreak',
            actorId: String(eliminatedId),
            actorName: eliminatedPlayer.name,
            targetId: String(partnerId),
            targetName: partner.name,
            timestampMs: Date.now(),
          });
        }
      }

      const newlyEliminated = [
        String(eliminatedId),
        ...(partnerId !== undefined ? [String(partnerId)] : []),
      ];
      pendingRoundElimsRef.current = Array.from(
        new Set([...pendingRoundElimsRef.current, ...newlyEliminated])
      );

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
    [currentRound, players, evaluateWinOrContinue]
  );

  const handleAvengerTargetPick = (targetId: number) => {
    playSound('dramatic');
    const avengerPlayer = players.find((p) => p.id === pendingAvengerId);
    const targetPlayer = players.find((p) => p.id === targetId);

    if (avengerPlayer && targetPlayer) {
      matchEventsRef.current.push({
        id: `ev_avenger_r${currentRound}_${targetId}`,
        round: currentRound,
        type: 'avenger_strike',
        actorId: String(avengerPlayer.id),
        actorName: avengerPlayer.name,
        targetId: String(targetId),
        targetName: targetPlayer.name,
        timestampMs: Date.now(),
      });
    }

    // Mr. White always receives their last-chance guess regardless of decoy word array presence
    if (targetPlayer?.role === 'mrwhite') {
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
    if (targetPlayer) {
      matchEventsRef.current.push({
        id: `ev_elim_av_r${currentRound}_${targetId}`,
        round: currentRound,
        type: 'player_eliminated',
        targetId: String(targetId),
        targetName: targetPlayer.name,
        outcome: targetPlayer.role,
        timestampMs: Date.now(),
      });
      if (partnerId !== undefined) {
        const partner = players.find((p) => p.id === partnerId && !p.isEliminated);
        if (partner) {
          matchEventsRef.current.push({
            id: `ev_lover_av_r${currentRound}_${partnerId}`,
            round: currentRound,
            type: 'lovers_heartbreak',
            actorId: String(targetId),
            actorName: targetPlayer.name,
            targetId: String(partnerId),
            targetName: partner.name,
            timestampMs: Date.now(),
          });
        }
      }
    }

    pendingRoundElimsRef.current = Array.from(
      new Set([
        ...pendingRoundElimsRef.current,
        String(targetId),
        ...(partnerId !== undefined ? [String(partnerId)] : []),
      ])
    );

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

    if (activeRoundVoteRef.current) {
      activeRoundVoteRef.current.mostVotedId = String(target.id);
    }

    if (shieldResult.shieldHolderId !== null) {
      const hasExplicitShield =
        shieldedTargetId !== null && shieldedTargetId !== undefined;
      if (hasExplicitShield || shieldResult.protected) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === shieldResult.shieldHolderId ? { ...p, specialAbilityUsed: true } : p
          )
        );
      }
      if (shieldResult.protected) {
        const holder = players.find((p) => p.id === shieldResult.shieldHolderId);
        if (activeRoundVoteRef.current) {
          activeRoundVoteRef.current.wasSavedBySpecial = 'protector';
        }
        matchEventsRef.current.push({
          id: `ev_shield_r${currentRound}_${target.id}`,
          round: currentRound,
          type: 'shield_block',
          actorId: String(shieldResult.shieldHolderId),
          actorName: holder?.name,
          targetId: String(target.id),
          targetName: target.name,
          timestampMs: Date.now(),
        });
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
            if (activeRoundVoteRef.current) {
              activeRoundVoteRef.current.bouncedFromName = votedPlayer.name;
            }
            matchEventsRef.current.push({
              id: `ev_boom_r${currentRound}_${bouncedPlayer.id}`,
              round: currentRound,
              type: 'boomerang_bounce',
              actorId: String(votedPlayer.id),
              actorName: votedPlayer.name,
              targetId: String(bouncedPlayer.id),
              targetName: bouncedPlayer.name,
              timestampMs: Date.now(),
            });
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
      if (activeRoundVoteRef.current) {
        activeRoundVoteRef.current.bouncedFromName = boomerangPlayer.name;
      }
      matchEventsRef.current.push({
        id: `ev_boom_r${currentRound}_${victim.id}`,
        round: currentRound,
        type: 'boomerang_bounce',
        actorId: String(boomerangPlayer.id),
        actorName: boomerangPlayer.name,
        targetId: String(victim.id),
        targetName: victim.name,
        timestampMs: Date.now(),
      });
      setBouncedFromName(boomerangPlayer.name);
    }
    finalizeVoteVictim(victim, savedMeta?.shieldedTargetId);
  };

  const handleVotingComplete = (votes: Record<number, number>, meta?: VoteCompletionMeta) => {
    setVoteData(votes);
    setPendingVoteMeta(meta || null);

    const tally = tallyVotes(votes as Record<string, number>);
    if (tally.candidates.length === 0) return;

    const isGroup = Boolean(meta?.isGroupVote);
    const serializedVotes: Record<string, string> = {};
    Object.entries(votes).forEach(([k, v]) => {
      serializedVotes[String(k)] = String(v);
    });

    activeRoundVoteRef.current = {
      roundNumber: currentRound,
      voteMode: isGroup ? 'group' : 'secret',
      votesByPlayerId: serializedVotes,
      mostVotedId: null,
      eliminatedIds: [],
      wasSavedBySpecial: null,
      bouncedFromName: null,
      tieBroken: tally.isTie,
      tieBrokenByJustice: false,
      mrWhiteGuess: null,
    };

    if (!isGroup) {
      players.forEach((p) => {
        if (p.isEliminated && hasSpecialRole(p, 'ghost') && votes[p.id] !== undefined) {
          const target = players.find((t) => t.id === votes[p.id]);
          matchEventsRef.current.push({
            id: `ev_ghost_r${currentRound}_${p.id}`,
            round: currentRound,
            type: 'ghost_vote',
            actorId: String(p.id),
            actorName: p.name,
            targetId: String(votes[p.id]),
            targetName: target?.name,
            timestampMs: Date.now(),
          });
        }
      });
    }

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
      commitActiveRound([]);
      setCurrentRound((prev) => {
        const nextRound = prev + 1;
        if (gameSettings.enableOperationEvents !== false) {
          const nextEvt = pickOperationEvent({
            gameMode: gameSettings.gameMode,
            round: nextRound,
            excludeIds: usedOperationEventIdsRef.current,
          });
          usedOperationEventIdsRef.current = [...usedOperationEventIdsRef.current, nextEvt.id];
          setCurrentOperationEvent(nextEvt);
        } else {
          setCurrentOperationEvent(null);
        }
        return nextRound;
      });
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

  const handleImpostorGuess = (isCorrect: boolean, guessedWord?: string) => {
    const guesser = players.find((p) => p.id === mostVotedPlayerId);
    if (guesser) {
      if (activeRoundVoteRef.current) {
        activeRoundVoteRef.current.mrWhiteGuess = {
          playerId: String(guesser.id),
          playerName: guesser.name,
          guess: guessedWord,
          isCorrect,
        };
      }
      matchEventsRef.current.push({
        id: `ev_mw_guess_r${currentRound}_${guesser.id}`,
        round: currentRound,
        type: 'mr_white_guess',
        actorId: String(guesser.id),
        actorName: guesser.name,
        outcome: isCorrect ? 'correct' : 'wrong',
        timestampMs: Date.now(),
      });
    }

    if (isCorrect) {
      commitActiveRound([]);
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
    const justicePlayer = players.find((p) => hasSpecialRole(p, 'justice'));
    const chosenTarget = players.find((p) => p.id === candId);
    if (activeRoundVoteRef.current) {
      activeRoundVoteRef.current.tieBrokenByJustice = true;
    }
    matchEventsRef.current.push({
      id: `ev_justice_r${currentRound}_${candId}`,
      round: currentRound,
      type: 'justice_tiebreak',
      actorId: justicePlayer ? String(justicePlayer.id) : undefined,
      actorName: justicePlayer?.name,
      targetId: String(candId),
      targetName: chosenTarget?.name,
      timestampMs: Date.now(),
    });
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
    setDescriptionsLog: appendDescriptionEntry,
    lastWinner,
    winReason,
    currentRound,
    currentOperationEvent,
    latestCaseFile,
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
