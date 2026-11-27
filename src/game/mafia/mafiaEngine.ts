import { shuffleArray } from '../roleEngine';
import {
  MafiaDawnReport,
  MafiaFaction,
  MafiaMatchState,
  MafiaNightAuditEntry,
  MafiaPlayer,
  MafiaPlayerInput,
  MafiaPublicEvent,
  MafiaRoleId,
  MafiaRolePreset,
  MafiaSettings,
  MafiaVoteRoundRecord,
  MafiaVoteTallyItem,
  MafiaWinReason,
} from './mafiaTypes';

export const MAFIA_MIN_PLAYERS = 6;
export const MAFIA_MAX_PLAYERS = 14;

export function getDefaultMafiaSettings(playerCount: number): MafiaSettings {
  const recommendedMafia = playerCount >= 11 ? 3 : playerCount >= 8 ? 2 : 1;
  return {
    mafiaCount: recommendedMafia,
    enableDetective: true,
    enableDoctor: true,
    enableMafiaBoss: false,
    doctorAllowConsecutiveProtection: false,
    discussionDurationSeconds: 120,
    votingDurationSeconds: 60,
    enableNominationDefense: true,
    revealRoleOnExit: true,
    tieRule: 'revote',
    allowAbstention: true,
  };
}

export function validateMafiaPlayerCount(playerCount: number): {
  valid: boolean;
  reason?: string;
} {
  if (!Number.isInteger(playerCount) || playerCount < MAFIA_MIN_PLAYERS) {
    return { valid: false, reason: 'MIN_PLAYERS_REQUIRED' };
  }
  if (playerCount > MAFIA_MAX_PLAYERS) {
    return { valid: false, reason: 'MAX_PLAYERS_EXCEEDED' };
  }
  return { valid: true };
}

export function getRoleFaction(role: MafiaRoleId): MafiaFaction {
  return role === 'mafia' || role === 'mafia_boss' ? 'mafia' : 'city';
}

export function getInvestigationResult(targetRole: MafiaRoleId): MafiaFaction {
  // Mafia Boss maintains false City cover against Detective investigations
  if (targetRole === 'mafia_boss') return 'city';
  return getRoleFaction(targetRole);
}

export function getRecommendedMafiaPreset(
  playerCount: number,
  overrides: Partial<
    Pick<MafiaSettings, 'mafiaCount' | 'enableDetective' | 'enableDoctor' | 'enableMafiaBoss'>
  > = {}
): MafiaRolePreset {
  const countCheck = validateMafiaPlayerCount(playerCount);
  const base = getDefaultMafiaSettings(Math.max(MAFIA_MIN_PLAYERS, Math.min(MAFIA_MAX_PLAYERS, playerCount)));
  const enableDetective = overrides.enableDetective ?? base.enableDetective;
  const enableDoctor = overrides.enableDoctor ?? base.enableDoctor;
  const enableMafiaBoss = overrides.enableMafiaBoss ?? base.enableMafiaBoss;
  const maxSafeMafia = Math.max(1, Math.floor((playerCount - 1) / 2));
  const requestedMafia = overrides.mafiaCount ?? base.mafiaCount;
  const mafiaCount = Math.max(1, Math.min(requestedMafia, maxSafeMafia));

  const detectiveCount = enableDetective ? 1 : 0;
  const doctorCount = enableDoctor ? 1 : 0;
  const mafiaBossCount = enableMafiaBoss && mafiaCount >= 1 ? 1 : 0;
  const regularMafiaCount = Math.max(0, mafiaCount - mafiaBossCount);
  const cityCount = Math.max(0, playerCount - mafiaCount);
  const citizenCount = Math.max(0, cityCount - detectiveCount - doctorCount);

  if (!countCheck.valid) {
    return {
      playerCount,
      mafiaCount,
      mafiaBossCount,
      regularMafiaCount,
      detectiveCount,
      doctorCount,
      citizenCount,
      isValid: false,
      validationReason: countCheck.reason,
    };
  }

  const requestedCityCount = playerCount - requestedMafia;
  if (
    requestedMafia < 1 ||
    requestedMafia >= requestedCityCount ||
    mafiaCount >= cityCount
  ) {
    return {
      playerCount,
      mafiaCount,
      mafiaBossCount,
      regularMafiaCount,
      detectiveCount,
      doctorCount,
      citizenCount,
      isValid: false,
      validationReason: 'FACTION_BALANCE_INVALID',
    };
  }

  if (detectiveCount + doctorCount > cityCount) {
    return {
      playerCount,
      mafiaCount,
      mafiaBossCount,
      regularMafiaCount,
      detectiveCount,
      doctorCount,
      citizenCount,
      isValid: false,
      validationReason: 'CITY_ROLES_EXCEED_CITY_COUNT',
    };
  }

  return {
    playerCount,
    mafiaCount,
    mafiaBossCount,
    regularMafiaCount,
    detectiveCount,
    doctorCount,
    citizenCount,
    isValid: true,
  };
}

export function assignMafiaRoles(
  players: readonly MafiaPlayerInput[],
  settings: MafiaSettings,
  rng: () => number = Math.random
): MafiaPlayer[] {
  const preset = getRecommendedMafiaPreset(players.length, settings);
  if (!preset.isValid) {
    throw new Error(`Invalid Mafia configuration: ${preset.validationReason || 'UNKNOWN'}`);
  }

  const rolePool: MafiaRoleId[] = [];
  for (let i = 0; i < preset.mafiaBossCount; i++) rolePool.push('mafia_boss');
  for (let i = 0; i < preset.regularMafiaCount; i++) rolePool.push('mafia');
  for (let i = 0; i < preset.detectiveCount; i++) rolePool.push('detective');
  for (let i = 0; i < preset.doctorCount; i++) rolePool.push('doctor');
  while (rolePool.length < players.length) rolePool.push('citizen');

  const shuffledRoles = shuffleArray(rolePool, rng);
  return players.map((p, idx) => {
    const role = shuffledRoles[idx];
    return {
      id: p.id || `mafia-p-${idx + 1}`,
      name: p.name.trim(),
      avatar: p.avatar || '',
      role,
      faction: getRoleFaction(role),
      isAlive: true,
      eliminatedRound: null,
      eliminatedAtPhase: null,
    };
  });
}

export function getMafiaTeammatesForPlayer(
  players: readonly MafiaPlayer[],
  viewerPlayerId: string
): MafiaPlayer[] {
  const viewer = players.find((p) => p.id === viewerPlayerId);
  if (!viewer || viewer.faction !== 'mafia') {
    return [];
  }
  return players.filter((p) => p.faction === 'mafia' && p.id !== viewerPlayerId);
}

export function checkMafiaVictory(
  players: readonly MafiaPlayer[]
): { winner: MafiaFaction; reason: MafiaWinReason } | null {
  const alive = players.filter((p) => p.isAlive);
  const aliveMafia = alive.filter((p) => p.faction === 'mafia').length;
  const aliveCity = alive.filter((p) => p.faction === 'city').length;

  if (aliveMafia === 0) {
    return { winner: 'city', reason: 'all_mafia_eliminated' };
  }
  if (aliveMafia >= aliveCity) {
    return { winner: 'mafia', reason: 'mafia_parity_reached' };
  }
  return null;
}

export function createMafiaMatch(params: {
  players: readonly MafiaPlayerInput[];
  settings?: Partial<MafiaSettings>;
  startedAtMs?: number;
  matchId?: string;
  rng?: () => number;
}): MafiaMatchState {
  const countCheck = validateMafiaPlayerCount(params.players.length);
  if (!countCheck.valid) {
    throw new Error(`Invalid Mafia player count: ${countCheck.reason}`);
  }

  const baseSettings = getDefaultMafiaSettings(params.players.length);
  const mergedSettings: MafiaSettings = {
    ...baseSettings,
    ...params.settings,
  };
  const preset = getRecommendedMafiaPreset(params.players.length, mergedSettings);
  if (!preset.isValid) {
    throw new Error(`Invalid Mafia settings: ${preset.validationReason}`);
  }
  mergedSettings.mafiaCount = preset.mafiaCount;

  const assignedPlayers = assignMafiaRoles(params.players, mergedSettings, params.rng);
  const startedAtMs = params.startedAtMs ?? Date.now();

  return {
    matchId: params.matchId || `mafia-${startedAtMs}`,
    startedAtMs,
    endedAtMs: null,
    phase: 'opening_night',
    dayNumber: 0,
    nightNumber: 0,
    settings: mergedSettings,
    players: assignedPlayers,
    lastDoctorTargetId: null,
    currentNight: {
      nightNumber: 0,
      isOpeningNight: true,
      mafiaTargetId: null,
      mafiaConfirmedById: null,
      doctorTargetId: null,
      doctorConfirmed: false,
      detectiveTargetId: null,
      detectiveResult: null,
      detectiveConfirmed: false,
    },
    latestDawnReport: null,
    nightAuditLog: [],
    nominatedPlayerIds: [],
    revoteCandidateIds: null,
    isRevote: false,
    pendingVotes: {},
    latestVoteRecord: null,
    voteHistory: [],
    publicEvents: [],
    winner: null,
    winReason: null,
  };
}

export type NightActionStepKind = 'mafia_coordination' | 'mafia' | 'doctor' | 'detective';

export function getActiveNightSteps(state: MafiaMatchState): NightActionStepKind[] {
  if (state.phase === 'opening_night') {
    return ['mafia_coordination'];
  }
  if (state.phase !== 'night') return [];

  const steps: NightActionStepKind[] = [];
  if (state.players.some((p) => p.isAlive && p.faction === 'mafia')) {
    steps.push('mafia');
  }
  if (
    state.settings.enableDoctor &&
    state.players.some((p) => p.isAlive && p.role === 'doctor')
  ) {
    steps.push('doctor');
  }
  if (
    state.settings.enableDetective &&
    state.players.some((p) => p.isAlive && p.role === 'detective')
  ) {
    steps.push('detective');
  }
  return steps;
}

export function completeOpeningNight(state: MafiaMatchState): MafiaMatchState {
  if (state.phase !== 'opening_night') {
    throw new Error('Opening night can only be completed from opening_night phase.');
  }

  const dawnReport: MafiaDawnReport = {
    nightNumber: 0,
    isOpeningNight: true,
    eliminatedPlayerId: null,
    eliminatedPlayerName: null,
    eliminatedPlayerRole: null,
    wasSavedByDoctor: false,
    peacefulNight: true,
  };

  const event: MafiaPublicEvent = {
    id: `evt-open-${state.matchId}`,
    roundNumber: 0,
    phase: 'opening_night',
    type: 'opening_coordination',
  };

  return {
    ...state,
    phase: 'dawn',
    latestDawnReport: dawnReport,
    publicEvents: [...state.publicEvents, event],
  };
}

export function submitMafiaNightKill(
  state: MafiaMatchState,
  actorId: string,
  targetId: string
): MafiaMatchState {
  if (state.phase !== 'night' || state.currentNight.isOpeningNight) {
    throw new Error('Mafia night kill is not allowed during opening night or outside night phase.');
  }
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor || !actor.isAlive || actor.faction !== 'mafia') {
    throw new Error('Only a living Mafia player may select a night target.');
  }
  const target = state.players.find((p) => p.id === targetId);
  if (!target || !target.isAlive || target.faction === 'mafia') {
    throw new Error('Mafia night target must be a living City player.');
  }

  return {
    ...state,
    currentNight: {
      ...state.currentNight,
      mafiaTargetId: target.id,
      mafiaConfirmedById: actor.id,
    },
  };
}

export function canDoctorProtectTarget(
  state: MafiaMatchState,
  targetId: string
): { allowed: boolean; reason?: 'TARGET_NOT_ALIVE' | 'CONSECUTIVE_PROTECTION_BLOCKED' } {
  const target = state.players.find((p) => p.id === targetId);
  if (!target || !target.isAlive) {
    return { allowed: false, reason: 'TARGET_NOT_ALIVE' };
  }
  if (!state.settings.doctorAllowConsecutiveProtection && state.lastDoctorTargetId === targetId) {
    return { allowed: false, reason: 'CONSECUTIVE_PROTECTION_BLOCKED' };
  }
  return { allowed: true };
}

export function submitDoctorProtection(
  state: MafiaMatchState,
  actorId: string,
  targetId: string
): MafiaMatchState {
  if (state.phase !== 'night' || state.currentNight.isOpeningNight) {
    throw new Error('Doctor protection is only allowed during active night phases.');
  }
  if (!state.settings.enableDoctor) {
    throw new Error('Doctor role is disabled in match settings.');
  }
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor || !actor.isAlive || actor.role !== 'doctor') {
    throw new Error('Only the living Doctor may protect a player.');
  }

  const check = canDoctorProtectTarget(state, targetId);
  if (!check.allowed) {
    throw new Error(check.reason || 'DOCTOR_PROTECTION_INVALID');
  }

  return {
    ...state,
    currentNight: {
      ...state.currentNight,
      doctorTargetId: targetId,
      doctorConfirmed: true,
    },
  };
}

export function submitDetectiveInvestigation(
  state: MafiaMatchState,
  actorId: string,
  targetId: string
): { state: MafiaMatchState; result: MafiaFaction } {
  if (state.phase !== 'night' || state.currentNight.isOpeningNight) {
    throw new Error('Detective investigation is only allowed during active night phases.');
  }
  if (!state.settings.enableDetective) {
    throw new Error('Detective role is disabled in match settings.');
  }
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor || !actor.isAlive || actor.role !== 'detective') {
    throw new Error('Only the living Detective may investigate.');
  }
  const target = state.players.find((p) => p.id === targetId);
  if (!target || !target.isAlive || target.id === actor.id) {
    throw new Error('Detective must choose another living player.');
  }

  const result = getInvestigationResult(target.role);

  return {
    result,
    state: {
      ...state,
      currentNight: {
        ...state.currentNight,
        detectiveTargetId: target.id,
        detectiveResult: result,
        detectiveConfirmed: true,
      },
    },
  };
}

export function clearConfidentialNightFeedback(state: MafiaMatchState): MafiaMatchState {
  return {
    ...state,
    currentNight: {
      ...state.currentNight,
      detectiveResult: null,
    },
  };
}

export function resolveMafiaNight(
  state: MafiaMatchState,
  nowMs: number = Date.now()
): MafiaMatchState {
  if (state.phase === 'opening_night') {
    return completeOpeningNight(state);
  }
  if (state.phase !== 'night') {
    throw new Error('resolveMafiaNight must be called during night phase.');
  }

  const { mafiaTargetId, doctorTargetId, detectiveTargetId } = state.currentNight;
  const mafiaTarget = mafiaTargetId ? state.players.find((p) => p.id === mafiaTargetId) : null;
  const doctorTarget = doctorTargetId ? state.players.find((p) => p.id === doctorTargetId) : null;
  const detectiveTarget = detectiveTargetId
    ? state.players.find((p) => p.id === detectiveTargetId)
    : null;

  const doctorSaved = Boolean(mafiaTarget && mafiaTarget.isAlive && doctorTargetId === mafiaTarget.id);
  const removedPlayer = !doctorSaved && mafiaTarget && mafiaTarget.isAlive ? mafiaTarget : null;

  const updatedPlayers = removedPlayer
    ? state.players.map((p) =>
        p.id === removedPlayer.id
          ? {
              ...p,
              isAlive: false,
              eliminatedRound: state.nightNumber,
              eliminatedAtPhase: 'night' as const,
            }
          : p
      )
    : state.players;

  const dawnReport: MafiaDawnReport = {
    nightNumber: state.nightNumber,
    isOpeningNight: false,
    eliminatedPlayerId: removedPlayer ? removedPlayer.id : null,
    eliminatedPlayerName: removedPlayer ? removedPlayer.name : null,
    eliminatedPlayerRole:
      removedPlayer && state.settings.revealRoleOnExit ? removedPlayer.role : null,
    wasSavedByDoctor: doctorSaved,
    peacefulNight: !removedPlayer,
  };

  const auditEntry: MafiaNightAuditEntry = {
    nightNumber: state.nightNumber,
    mafiaTargetId: mafiaTarget?.id ?? null,
    mafiaTargetName: mafiaTarget?.name ?? null,
    doctorTargetId: doctorTarget?.id ?? null,
    doctorTargetName: doctorTarget?.name ?? null,
    wasSavedByDoctor: doctorSaved,
    eliminatedPlayerId: removedPlayer?.id ?? null,
    eliminatedPlayerName: removedPlayer?.name ?? null,
    detectiveTargetId: detectiveTarget?.id ?? null,
    detectiveTargetName: detectiveTarget?.name ?? null,
    detectiveReportedFaction: detectiveTarget
      ? getInvestigationResult(detectiveTarget.role)
      : null,
  };

  const publicEvent: MafiaPublicEvent = removedPlayer
    ? {
        id: `evt-night-${state.nightNumber}`,
        roundNumber: state.nightNumber,
        phase: 'dawn',
        type: 'night_removal',
        subjectName: removedPlayer.name,
        roleRevealed: state.settings.revealRoleOnExit ? removedPlayer.role : null,
      }
    : {
        id: `evt-night-${state.nightNumber}`,
        roundNumber: state.nightNumber,
        phase: 'dawn',
        type: doctorSaved ? 'doctor_save' : 'peaceful_night',
      };

  const victory = checkMafiaVictory(updatedPlayers);
  const nextEvents = [...state.publicEvents, publicEvent];
  if (victory) {
    nextEvents.push({
      id: `evt-win-night-${state.nightNumber}`,
      roundNumber: state.nightNumber,
      phase: 'dawn',
      type: 'victory',
      subjectName: victory.winner,
    });
  }

  return {
    ...state,
    phase: victory ? 'ended' : 'dawn',
    endedAtMs: victory ? nowMs : null,
    players: updatedPlayers,
    lastDoctorTargetId: doctorTargetId ?? state.lastDoctorTargetId,
    currentNight: {
      ...state.currentNight,
      detectiveResult: null,
    },
    latestDawnReport: dawnReport,
    nightAuditLog: [...state.nightAuditLog, auditEntry],
    publicEvents: nextEvents,
    winner: victory ? victory.winner : null,
    winReason: victory ? victory.reason : null,
  };
}

export function advanceFromDawn(state: MafiaMatchState): MafiaMatchState {
  if (state.winner) {
    return { ...state, phase: 'ended' };
  }
  if (state.phase !== 'dawn') {
    throw new Error('advanceFromDawn requires dawn phase.');
  }

  return {
    ...state,
    phase: 'discussion',
    dayNumber: state.dayNumber + 1,
    nominatedPlayerIds: [],
    revoteCandidateIds: null,
    isRevote: false,
    pendingVotes: {},
    latestVoteRecord: null,
  };
}

export function toggleNomination(state: MafiaMatchState, targetId: string): MafiaMatchState {
  if (state.phase !== 'discussion' && state.phase !== 'defense') {
    throw new Error('Nominations are only open during discussion.');
  }
  const target = state.players.find((p) => p.id === targetId);
  if (!target || !target.isAlive) {
    throw new Error('Only living players can be nominated.');
  }
  const exists = state.nominatedPlayerIds.includes(targetId);
  const nextIds = exists
    ? state.nominatedPlayerIds.filter((id) => id !== targetId)
    : [...state.nominatedPlayerIds, targetId];
  return {
    ...state,
    nominatedPlayerIds: nextIds,
  };
}

export function startNominationDefenseOrVoting(state: MafiaMatchState): MafiaMatchState {
  if (state.phase !== 'discussion' && state.phase !== 'defense') {
    throw new Error('Can only transition to defense or voting from discussion/defense.');
  }
  if (
    state.phase === 'discussion' &&
    state.settings.enableNominationDefense &&
    state.nominatedPlayerIds.length > 0
  ) {
    return {
      ...state,
      phase: 'defense',
    };
  }
  return {
    ...state,
    phase: 'voting',
    pendingVotes: {},
    revoteCandidateIds: null,
    isRevote: false,
  };
}

export function submitMafiaVote(
  state: MafiaMatchState,
  voterId: string,
  targetId: string
): MafiaMatchState {
  if (state.phase !== 'voting') {
    throw new Error('Votes can only be cast during voting phase.');
  }
  const voter = state.players.find((p) => p.id === voterId);
  if (!voter || !voter.isAlive) {
    throw new Error('Only living players may vote.');
  }
  if (state.pendingVotes[voterId] !== undefined) {
    throw new Error('Duplicate votes from the same player are not allowed.');
  }

  if (targetId === 'ABSTAIN') {
    if (!state.settings.allowAbstention) {
      throw new Error('Abstention is disabled in match settings.');
    }
  } else {
    const target = state.players.find((p) => p.id === targetId);
    if (!target || !target.isAlive) {
      throw new Error('Vote target must be a living player.');
    }
    if (state.revoteCandidateIds && !state.revoteCandidateIds.includes(targetId)) {
      throw new Error('Revote targets are restricted to tied candidates.');
    }
  }

  return {
    ...state,
    pendingVotes: {
      ...state.pendingVotes,
      [voterId]: targetId,
    },
  };
}

export function resolveMafiaVoting(
  state: MafiaMatchState,
  nowMs: number = Date.now()
): MafiaMatchState {
  if (state.phase !== 'voting') {
    throw new Error('resolveMafiaVoting must be called during voting phase.');
  }

  const nameById = new Map(state.players.map((p) => [p.id, p.name]));
  const counts = new Map<string, number>();
  let abstainCount = 0;

  Object.entries(state.pendingVotes).forEach(([, targetId]) => {
    if (targetId === 'ABSTAIN') {
      abstainCount += 1;
      return;
    }
    counts.set(targetId, (counts.get(targetId) || 0) + 1);
  });

  const tally: MafiaVoteTallyItem[] = Array.from(counts.entries())
    .map(([targetId, count]) => ({
      targetId,
      targetName: nameById.get(targetId) || targetId,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.targetName.localeCompare(b.targetName));

  if (tally.length === 0) {
    const record: MafiaVoteRoundRecord = {
      dayNumber: state.dayNumber,
      isRevote: state.isRevote,
      votesByVoterId: { ...state.pendingVotes },
      tally: [],
      abstainCount,
      eliminatedPlayerId: null,
      eliminatedPlayerName: null,
      eliminatedPlayerRole: null,
      outcome: 'all_abstain',
    };

    const event: MafiaPublicEvent = {
      id: `evt-vote-abstain-${state.dayNumber}-${state.isRevote ? 2 : 1}`,
      roundNumber: state.dayNumber,
      phase: 'vote',
      type: 'tie_no_removal',
    };

    return {
      ...state,
      phase: 'vote_result',
      latestVoteRecord: record,
      voteHistory: [...state.voteHistory, record],
      publicEvents: [...state.publicEvents, event],
      revoteCandidateIds: null,
      isRevote: false,
    };
  }

  const maxCount = tally[0].count;
  const topCandidates = tally.filter((t) => t.count === maxCount);

  if (topCandidates.length > 1) {
    if (state.settings.tieRule === 'revote' && !state.isRevote) {
      const tiedIds = topCandidates.map((c) => c.targetId);
      const record: MafiaVoteRoundRecord = {
        dayNumber: state.dayNumber,
        isRevote: false,
        votesByVoterId: { ...state.pendingVotes },
        tally,
        abstainCount,
        eliminatedPlayerId: null,
        eliminatedPlayerName: null,
        eliminatedPlayerRole: null,
        outcome: 'tie_revote',
      };
      const event: MafiaPublicEvent = {
        id: `evt-vote-tie-revote-${state.dayNumber}`,
        roundNumber: state.dayNumber,
        phase: 'vote',
        type: 'tie_revote',
      };

      return {
        ...state,
        phase: 'vote_result',
        revoteCandidateIds: tiedIds,
        latestVoteRecord: record,
        voteHistory: [...state.voteHistory, record],
        publicEvents: [...state.publicEvents, event],
      };
    }

    const record: MafiaVoteRoundRecord = {
      dayNumber: state.dayNumber,
      isRevote: state.isRevote,
      votesByVoterId: { ...state.pendingVotes },
      tally,
      abstainCount,
      eliminatedPlayerId: null,
      eliminatedPlayerName: null,
      eliminatedPlayerRole: null,
      outcome: 'tie_no_elimination',
    };
    const event: MafiaPublicEvent = {
      id: `evt-vote-tie-none-${state.dayNumber}-${state.isRevote ? 2 : 1}`,
      roundNumber: state.dayNumber,
      phase: 'vote',
      type: 'tie_no_removal',
    };

    return {
      ...state,
      phase: 'vote_result',
      revoteCandidateIds: null,
      isRevote: false,
      latestVoteRecord: record,
      voteHistory: [...state.voteHistory, record],
      publicEvents: [...state.publicEvents, event],
    };
  }

  // Unique top candidate eliminated
  const eliminatedId = topCandidates[0].targetId;
  const eliminatedPlayer = state.players.find((p) => p.id === eliminatedId) || null;
  const updatedPlayers = eliminatedPlayer
    ? state.players.map((p) =>
        p.id === eliminatedPlayer.id
          ? {
              ...p,
              isAlive: false,
              eliminatedRound: state.dayNumber,
              eliminatedAtPhase: 'vote' as const,
            }
          : p
      )
    : state.players;

  const revealedRole =
    eliminatedPlayer && state.settings.revealRoleOnExit ? eliminatedPlayer.role : null;

  const record: MafiaVoteRoundRecord = {
    dayNumber: state.dayNumber,
    isRevote: state.isRevote,
    votesByVoterId: { ...state.pendingVotes },
    tally,
    abstainCount,
    eliminatedPlayerId: eliminatedPlayer?.id ?? null,
    eliminatedPlayerName: eliminatedPlayer?.name ?? null,
    eliminatedPlayerRole: revealedRole,
    outcome: 'eliminated',
  };

  const nextEvents: MafiaPublicEvent[] = [
    ...state.publicEvents,
    {
      id: `evt-vote-elim-${state.dayNumber}-${state.isRevote ? 2 : 1}`,
      roundNumber: state.dayNumber,
      phase: 'vote',
      type: 'vote_removal',
      subjectName: eliminatedPlayer?.name ?? null,
      roleRevealed: revealedRole,
    },
  ];

  const victory = checkMafiaVictory(updatedPlayers);
  if (victory) {
    nextEvents.push({
      id: `evt-win-vote-${state.dayNumber}`,
      roundNumber: state.dayNumber,
      phase: 'vote',
      type: 'victory',
      subjectName: victory.winner,
    });
  }

  return {
    ...state,
    phase: victory ? 'ended' : 'vote_result',
    endedAtMs: victory ? nowMs : null,
    players: updatedPlayers,
    revoteCandidateIds: null,
    isRevote: false,
    latestVoteRecord: record,
    voteHistory: [...state.voteHistory, record],
    publicEvents: nextEvents,
    winner: victory ? victory.winner : null,
    winReason: victory ? victory.reason : null,
  };
}

export function advanceAfterVoteResult(state: MafiaMatchState): MafiaMatchState {
  if (state.winner) {
    return { ...state, phase: 'ended' };
  }
  if (state.phase !== 'vote_result') {
    throw new Error('advanceAfterVoteResult must be called during vote_result phase.');
  }

  // Trigger revote if tie_revote was just recorded
  if (state.latestVoteRecord?.outcome === 'tie_revote' && state.revoteCandidateIds?.length) {
    return {
      ...state,
      phase: 'voting',
      isRevote: true,
      pendingVotes: {},
    };
  }

  // Advance to next Night
  const nextNightNumber = state.nightNumber + 1;
  return {
    ...state,
    phase: 'night',
    nightNumber: nextNightNumber,
    revoteCandidateIds: null,
    isRevote: false,
    pendingVotes: {},
    currentNight: {
      nightNumber: nextNightNumber,
      isOpeningNight: false,
      mafiaTargetId: null,
      mafiaConfirmedById: null,
      doctorTargetId: null,
      doctorConfirmed: false,
      detectiveTargetId: null,
      detectiveResult: null,
      detectiveConfirmed: false,
    },
  };
}
