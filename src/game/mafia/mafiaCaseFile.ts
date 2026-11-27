import {
  CaseFileEvent,
  CaseFilePlayerDossier,
  CaseFileRoundRecord,
  ClassifiedCaseFile,
  PlayerRole,
} from '../../../types';
import { deriveOperationCode } from '../caseFileEngine';
import {
  MafiaCaseFileAward,
  MafiaCaseFileSummary,
  MafiaMatchState,
  MafiaRoleId,
} from './mafiaTypes';

export const MAFIA_CASE_FILE_SCHEMA_VERSION = 1;

function mapMafiaRoleToCompatRole(role: MafiaRoleId): PlayerRole {
  switch (role) {
    case 'detective':
      return 'inspector';
    case 'doctor':
      return 'protector';
    case 'mafia':
      return 'undercover';
    case 'mafia_boss':
      return 'mrwhite';
    default:
      return 'citizen';
  }
}

function buildMafiaAwards(state: MafiaMatchState): MafiaCaseFileAward[] {
  const awards: MafiaCaseFileAward[] = [];

  // 1. Guardian Doctor — most successful protections
  const successfulProtections = state.nightAuditLog.filter((n) => n.wasSavedByDoctor).length;
  const doctor = state.players.find((p) => p.role === 'doctor');
  awards.push({
    awardId: 'GUARDIAN_DOCTOR',
    recipientId: doctor && successfulProtections > 0 ? doctor.id : null,
    recipientName: doctor && successfulProtections > 0 ? doctor.name : null,
    metricValue: successfulProtections > 0 ? successfulProtections : null,
    reasonKey:
      successfulProtections > 0
        ? 'mafiaAwardDoctorSaved'
        : 'mafiaAwardDoctorNone',
  });

  // 2. Sharp Detective — accurate Mafia finds during nights
  const detectiveHits = state.nightAuditLog.filter(
    (n) => n.detectiveReportedFaction === 'mafia'
  ).length;
  const detective = state.players.find((p) => p.role === 'detective');
  awards.push({
    awardId: 'SHARP_DETECTIVE',
    recipientId: detective && detectiveHits > 0 ? detective.id : null,
    recipientName: detective && detectiveHits > 0 ? detective.name : null,
    metricValue: detectiveHits > 0 ? detectiveHits : null,
    reasonKey:
      detectiveHits > 0 ? 'mafiaAwardDetectiveHit' : 'mafiaAwardDetectiveNone',
  });

  // 3. Shadow Syndicate — surviving Mafia member on Mafia victory (or boss cover)
  const winningMafia =
    state.winner === 'mafia'
      ? state.players.find((p) => p.faction === 'mafia' && p.isAlive) ||
        state.players.find((p) => p.faction === 'mafia')
      : null;
  awards.push({
    awardId: 'SHADOW_SYNDICATE',
    recipientId: winningMafia?.id ?? null,
    recipientName: winningMafia?.name ?? null,
    metricValue: winningMafia ? state.nightAuditLog.filter((n) => Boolean(n.eliminatedPlayerId)).length : null,
    reasonKey: winningMafia ? 'mafiaAwardSyndicateWin' : 'mafiaAwardSyndicateNone',
  });

  // 4. City Survivor — surviving City operative on City victory
  const winningCitySurvivor =
    state.winner === 'city'
      ? state.players.find((p) => p.faction === 'city' && p.isAlive)
      : null;
  awards.push({
    awardId: 'CITY_SURVIVOR',
    recipientId: winningCitySurvivor?.id ?? null,
    recipientName: winningCitySurvivor?.name ?? null,
    metricValue: winningCitySurvivor ? state.dayNumber : null,
    reasonKey: winningCitySurvivor ? 'mafiaAwardCityWin' : 'mafiaAwardCityNone',
  });

  return awards;
}

export function buildMafiaCaseFile(params: {
  state: MafiaMatchState;
  language: string;
}): ClassifiedCaseFile {
  const { state, language } = params;
  if (state.phase !== 'ended' || !state.winner || !state.winReason) {
    throw new Error('Mafia Case File can only be generated after match completion.');
  }

  const endedAtMs = state.endedAtMs ?? Date.now();
  const durationSeconds = Math.max(0, Math.round((endedAtMs - state.startedAtMs) / 1000));
  const reportId = `mafia-cf-${state.matchId}`;
  const operationCode = deriveOperationCode(reportId);

  const playerDossiers: CaseFilePlayerDossier[] = state.players.map((p) => {
    const won = p.faction === state.winner;
    const compatRole = mapMafiaRoleToCompatRole(p.role);
    let votesCast = 0;
    let accurateVotes = 0;
    state.voteHistory.forEach((vr) => {
      const targetId = vr.votesByVoterId[p.id];
      if (!targetId) return;
      votesCast += 1;
      if (targetId !== 'ABSTAIN') {
        const target = state.players.find((tp) => tp.id === targetId);
        if (target && target.faction !== p.faction) {
          accurateVotes += 1;
        }
      }
    });

    return {
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      role: compatRole,
      specialRole: null,
      isImpostor: p.faction === 'mafia',
      survived: p.isAlive,
      eliminatedRound: p.eliminatedRound,
      pointsEarned: won ? 10 : 2,
      won,
      cluesCount: 0,
      totalVotesCast: votesCast,
      verifiableVotesCast: votesCast,
      accurateVotes,
      voteAccuracyPct: votesCast > 0 ? Math.round((accurateVotes / votesCast) * 100) : null,
      voteAccuracyStatus: votesCast > 0 ? 'verified' : 'insufficient_data',
      awardsEarned: [],
    };
  });

  const nameById = new Map(state.players.map((p) => [p.id, p.name]));
  const rounds: CaseFileRoundRecord[] = state.voteHistory.map((vr) => ({
    roundNumber: vr.dayNumber,
    clues: [],
    voteMode: 'secret',
    voteTally: vr.tally,
    votes: Object.entries(vr.votesByVoterId).map(([voterId, targetId]) => ({
      voterId,
      voterName: nameById.get(voterId) || voterId,
      targetId,
      targetName: targetId === 'ABSTAIN' ? 'ABSTAIN' : nameById.get(targetId) || targetId,
    })),
    mostVotedId: vr.tally[0]?.targetId ?? null,
    mostVotedName: vr.tally[0]?.targetName ?? null,
    eliminatedIds: vr.eliminatedPlayerId ? [vr.eliminatedPlayerId] : [],
    eliminatedNames: vr.eliminatedPlayerName ? [vr.eliminatedPlayerName] : [],
    eliminatedRoles: vr.eliminatedPlayerRole ? [mapMafiaRoleToCompatRole(vr.eliminatedPlayerRole)] : [],
    wasSavedBySpecial: null,
    bouncedFromName: null,
    tieBroken: vr.outcome === 'tie_revote' || vr.outcome === 'tie_no_elimination',
    tieBrokenByJustice: false,
    mrWhiteGuess: null,
  }));

  const events: CaseFileEvent[] = state.publicEvents.map((ev) => ({
    id: ev.id,
    round: ev.roundNumber,
    type: ev.type === 'doctor_save' ? 'shield_block' : 'player_eliminated',
    targetName: ev.subjectName || undefined,
  }));

  const successfulProtections = state.nightAuditLog.filter((n) => n.wasSavedByDoctor).length;
  const investigationsCount = state.nightAuditLog.filter((n) => Boolean(n.detectiveTargetId)).length;

  const mafiaSummary: MafiaCaseFileSummary = {
    winningFaction: state.winner,
    winReason: state.winReason,
    daysCount: state.dayNumber,
    nightsCount: state.nightNumber,
    successfulProtections,
    investigationsCount,
    nightAudits: state.nightAuditLog,
    voteHistory: state.voteHistory,
    publicEvents: state.publicEvents,
    awards: buildMafiaAwards(state),
    revealRoleOnExit: state.settings.revealRoleOnExit,
    playerRoles: Object.fromEntries(state.players.map((p) => [p.id, p.role])),
  };

  return {
    schemaVersion: MAFIA_CASE_FILE_SCHEMA_VERSION,
    gameType: 'mafia_shadow_city',
    reportId,
    operationCode,
    mode: 'local',
    matchId: state.matchId,
    startedAtMs: state.startedAtMs,
    endedAtMs,
    durationSeconds,
    language,
    category: 'mafia_shadow_city',
    difficulty: state.settings.enableMafiaBoss ? 'hard' : 'easy',
    gameMode: 'expression',
    playerCount: state.players.length,
    roundCount: Math.max(state.dayNumber, state.nightNumber, 1),
    winner: state.winner === 'city' ? 'citizens' : 'impostor',
    winningFaction: state.winner === 'city' ? 'citizens' : 'undercover_solo',
    winReason: state.winner === 'city' ? 'impostor_caught' : 'citizens_wrong_vote',
    winningMrWhiteId: null,
    secretWord: 'MAFIA: SHADOW CITY',
    undercoverWord: '',
    participantIds: state.players.map((p) => p.id),
    players: playerDossiers,
    rounds,
    specialEvents: events,
    turningPoints: [],
    awards: [],
    mafiaSummary,
  };
}
