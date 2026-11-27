import { useCallback, useEffect, useState } from 'react';
import { ClassifiedCaseFile, GamePhase } from '../types';
import {
  advanceAfterVoteResult,
  advanceFromDawn,
  clearConfidentialNightFeedback,
  createMafiaMatch,
  getDefaultMafiaSettings,
  resolveMafiaNight,
  resolveMafiaVoting,
  startNominationDefenseOrVoting,
  submitDetectiveInvestigation,
  submitDoctorProtection,
  submitMafiaNightKill,
  submitMafiaVote,
  toggleNomination,
} from '../src/game/mafia/mafiaEngine';
import {
  MafiaMatchState,
  MafiaPlayerInput,
  MafiaSettings,
} from '../src/game/mafia/mafiaTypes';
import {
  clearActiveMafiaMatch,
  loadActiveMafiaMatch,
  saveActiveMafiaMatch,
} from '../src/game/mafia/mafiaStorage';
import { buildMafiaCaseFile } from '../src/game/mafia/mafiaCaseFile';
import { getSettings, saveLocalCaseFile } from '../services/storageService';
import { playSound } from '../services/soundService';

interface UseMafiaMatchOptions {
  navigate: (nextPhase: GamePhase) => void;
}

export function phaseFromMafiaState(state: MafiaMatchState): GamePhase {
  switch (state.phase) {
    case 'opening_night':
    case 'night':
      return GamePhase.MAFIA_NIGHT;
    case 'dawn':
      return GamePhase.MAFIA_DAWN;
    case 'discussion':
    case 'defense':
      return GamePhase.MAFIA_DISCUSSION;
    case 'voting':
      return GamePhase.MAFIA_VOTING;
    case 'vote_result':
      return GamePhase.MAFIA_VOTE_RESULT;
    case 'ended':
      return GamePhase.MAFIA_RESULT;
  }
}

export function useMafiaMatch({ navigate }: UseMafiaMatchOptions) {
  const [tempPlayers, setTempPlayers] = useState<MafiaPlayerInput[]>([]);
  const [matchState, setMatchState] = useState<MafiaMatchState | null>(null);
  const [latestCaseFile, setLatestCaseFile] = useState<ClassifiedCaseFile | null>(null);
  const [savedSavedSession] = useState<MafiaMatchState | null>(() => loadActiveMafiaMatch());

  // Persist active match locally while running; clear or keep finalized cleanly
  useEffect(() => {
    if (!matchState) return;
    if (matchState.phase === 'ended') {
      clearActiveMafiaMatch();
    } else {
      saveActiveMafiaMatch(matchState);
    }
  }, [matchState]);

  const finalizeIfEnded = useCallback((next: MafiaMatchState): MafiaMatchState => {
    if (next.phase === 'ended' && next.winner && next.winReason) {
      const lang = getSettings().language || 'ar';
      const cf = buildMafiaCaseFile({ state: next, language: lang });
      saveLocalCaseFile(cf);
      setLatestCaseFile(cf);
      playSound('verdict');
    }
    return next;
  }, []);

  const startNewMafiaMatch = useCallback(
    (settingsOverrides?: Partial<MafiaSettings>, explicitPlayers?: MafiaPlayerInput[]) => {
      const roster = explicitPlayers ?? tempPlayers;
      if (roster.length < 6) return;
      const defaults = getDefaultMafiaSettings(roster.length);
      const next = createMafiaMatch({
        players: roster,
        settings: { ...defaults, ...settingsOverrides },
      });
      setLatestCaseFile(null);
      setMatchState(next);
      playSound('startGame');
      navigate(GamePhase.MAFIA_REVEAL);
    },
    [tempPlayers, navigate]
  );

  const finishRoleReveal = useCallback(() => {
    if (!matchState) return;
    playSound('handoff');
    navigate(phaseFromMafiaState(matchState));
  }, [matchState, navigate]);

  const completeNightPhase = useCallback(
    (opts?: {
      mafiaActorId?: string | null;
      mafiaTargetId?: string | null;
      doctorActorId?: string | null;
      doctorTargetId?: string | null;
      detectiveActorId?: string | null;
      detectiveTargetId?: string | null;
    }) => {
      if (!matchState) return;
      let next = matchState;
      if (next.phase === 'night') {
        if (opts?.mafiaActorId && opts?.mafiaTargetId) {
          next = submitMafiaNightKill(next, opts.mafiaActorId, opts.mafiaTargetId);
        }
        if (opts?.doctorActorId && opts?.doctorTargetId) {
          next = submitDoctorProtection(next, opts.doctorActorId, opts.doctorTargetId);
        }
        if (opts?.detectiveActorId && opts?.detectiveTargetId) {
          next = submitDetectiveInvestigation(next, opts.detectiveActorId, opts.detectiveTargetId).state;
        }
      }
      next = clearConfidentialNightFeedback(next);
      const resolved = finalizeIfEnded(resolveMafiaNight(next));
      setMatchState(resolved);
      if (resolved.winner) {
        navigate(GamePhase.MAFIA_RESULT);
      } else {
        if (resolved.latestDawnReport?.wasSavedByDoctor) {
          playSound('shield');
        } else if (resolved.latestDawnReport?.eliminatedPlayerId) {
          playSound('eliminate');
        } else {
          playSound('dossierOpen');
        }
        navigate(GamePhase.MAFIA_DAWN);
      }
    },
    [matchState, finalizeIfEnded, navigate]
  );

  const continueFromDawn = useCallback(() => {
    if (!matchState) return;
    const next = advanceFromDawn(matchState);
    setMatchState(next);
    playSound('click');
    navigate(phaseFromMafiaState(next));
  }, [matchState, navigate]);

  const toggleDiscussionNomination = useCallback(
    (targetId: string) => {
      if (!matchState) return;
      playSound('click');
      setMatchState(toggleNomination(matchState, targetId));
    },
    [matchState]
  );

  const proceedToDefenseOrVoting = useCallback(() => {
    if (!matchState) return;
    const next = startNominationDefenseOrVoting(matchState);
    setMatchState(next);
    playSound('vote');
    navigate(phaseFromMafiaState(next));
  }, [matchState, navigate]);

  const completeSecretVoting = useCallback(
    (votesByVoterId: Record<string, string>) => {
      if (!matchState) return;
      let next = matchState;
      Object.entries(votesByVoterId).forEach(([voterId, targetId]) => {
        next = submitMafiaVote(next, voterId, targetId);
      });
      const resolved = finalizeIfEnded(resolveMafiaVoting(next));
      setMatchState(resolved);
      if (resolved.winner) {
        navigate(GamePhase.MAFIA_RESULT);
      } else {
        if (resolved.latestVoteRecord?.eliminatedPlayerId) {
          playSound('eliminate');
        } else {
          playSound('voteClose');
        }
        navigate(GamePhase.MAFIA_VOTE_RESULT);
      }
    },
    [matchState, finalizeIfEnded, navigate]
  );

  const continueAfterVoteResult = useCallback(() => {
    if (!matchState) return;
    const next = advanceAfterVoteResult(matchState);
    setMatchState(next);
    playSound('handoff');
    navigate(phaseFromMafiaState(next));
  }, [matchState, navigate]);

  const resumeSavedMatch = useCallback(() => {
    if (!savedSavedSession) return;
    setMatchState(savedSavedSession);
    navigate(phaseFromMafiaState(savedSavedSession));
  }, [savedSavedSession, navigate]);

  const resetMafiaMatch = useCallback(() => {
    clearActiveMafiaMatch();
    setMatchState(null);
    setLatestCaseFile(null);
  }, []);

  const playAgainSameSquad = useCallback(() => {
    if (!matchState) return;
    const squad: MafiaPlayerInput[] = matchState.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
    }));
    setTempPlayers(squad);
    startNewMafiaMatch(matchState.settings, squad);
  }, [matchState, startNewMafiaMatch]);

  return {
    tempPlayers,
    setTempPlayers,
    matchState,
    latestCaseFile,
    savedSavedSession,
    startNewMafiaMatch,
    finishRoleReveal,
    completeNightPhase,
    continueFromDawn,
    toggleDiscussionNomination,
    proceedToDefenseOrVoting,
    completeSecretVoting,
    continueAfterVoteResult,
    resumeSavedMatch,
    resetMafiaMatch,
    playAgainSameSquad,
  };
}
