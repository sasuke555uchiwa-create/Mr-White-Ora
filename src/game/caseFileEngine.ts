import {
  CaseFileAward,
  CaseFileAwardId,
  CaseFileClueRecord,
  CaseFileEvent,
  CaseFileMode,
  CaseFilePlayerDossier,
  CaseFileRoundRecord,
  CaseFileTurningPoint,
  CaseFileVoteEntry,
  CaseFileVoteMode,
  CaseFileVoteTallyItem,
  CaseFileWinFaction,
  CaseFileWinReason,
  ClassifiedCaseFile,
  GameMode,
  PlayerRole,
  SpecialRoleId,
} from '../../types';
import { resolveWinningFaction } from './winEngine';

export const CASE_FILE_SCHEMA_VERSION = 1;

export interface CaseFilePlayerInput {
  playerId: string;
  uid?: string;
  name: string;
  avatar: string;
  role: PlayerRole;
  specialRole?: SpecialRoleId | null;
  isEliminated: boolean;
  pointsEarned: number;
  xpEarned?: number;
  won: boolean;
  foolBonusAwarded?: boolean;
}

export interface CaseFileRoundInput {
  roundNumber: number;
  voteMode: CaseFileVoteMode;
  votesByPlayerId: Record<string, string>;
  mostVotedId: string | null;
  eliminatedIds: string[];
  wasSavedBySpecial?: 'protector' | 'boomerang' | null;
  bouncedFromName?: string | null;
  tieBroken?: boolean;
  tieBrokenByJustice?: boolean;
  mrWhiteGuess?: {
    playerId: string;
    playerName: string;
    guess?: string;
    isCorrect: boolean;
    forcedMissing?: boolean;
  } | null;
}

export interface BuildClassifiedCaseFileInput {
  reportId: string;
  mode: CaseFileMode;
  roomId?: string;
  matchId: string;
  startedAtMs: number;
  endedAtMs: number;
  language: string;
  category: string;
  difficulty: 'easy' | 'hard';
  gameMode: GameMode;
  winner: 'citizens' | 'impostor';
  winReason: CaseFileWinReason;
  winningMrWhiteId?: string | null;
  secretWord: string;
  undercoverWord: string;
  participantIds?: string[];
  players: CaseFilePlayerInput[];
  clues: CaseFileClueRecord[];
  rounds: CaseFileRoundInput[];
  specialEvents: CaseFileEvent[];
}

export function deriveOperationCode(seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const num = (hash >>> 0) % 9000 + 1000;
  return `OP-${num}`;
}

export function isInfiltratorRole(role: PlayerRole): boolean {
  return role === 'mrwhite' || role === 'undercover';
}

function resolveTally(
  votesByPlayerId: Record<string, string>,
  nameById: Map<string, string>,
  voteMode: CaseFileVoteMode,
  mostVotedId: string | null
): { tally: CaseFileVoteTallyItem[]; entries: CaseFileVoteEntry[] } {
  const counts = new Map<string, number>();
  const entries: CaseFileVoteEntry[] = [];

  if (voteMode === 'group') {
    const targetId = mostVotedId;
    if (targetId) {
      const voterCount = Object.keys(votesByPlayerId).length || 1;
      counts.set(targetId, voterCount);
    }
  } else {
    Object.entries(votesByPlayerId).forEach(([voterId, targetId]) => {
      if (!targetId) return;
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
      entries.push({
        voterId,
        voterName: nameById.get(voterId) || voterId,
        targetId,
        targetName: nameById.get(targetId) || targetId,
      });
    });
  }

  const tally: CaseFileVoteTallyItem[] = Array.from(counts.entries())
    .map(([targetId, count]) => ({
      targetId,
      targetName: nameById.get(targetId) || targetId,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.targetId.localeCompare(b.targetId));

  entries.sort((a, b) => a.voterId.localeCompare(b.voterId));
  return { tally, entries };
}

function extractTurningPoints(
  rounds: readonly CaseFileRoundRecord[],
  specialEvents: readonly CaseFileEvent[],
  roleById: Map<string, PlayerRole>,
  nameById: Map<string, string>,
  winReason: CaseFileWinReason
): CaseFileTurningPoint[] {
  const points: CaseFileTurningPoint[] = [];
  const seenKeys = new Set<string>();

  const pushPoint = (pt: CaseFileTurningPoint) => {
    const key = `${pt.round}:${pt.kind}:${pt.actorName || ''}:${pt.targetName || ''}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      points.push(pt);
    }
  };

  for (const r of rounds) {
    if (r.mrWhiteGuess) {
      pushPoint({
        round: r.roundNumber,
        kind: r.mrWhiteGuess.isCorrect ? 'mr_white_guess_win' : 'mr_white_guess_miss',
        actorName: r.mrWhiteGuess.playerName,
      });
    }
    if (r.wasSavedBySpecial === 'protector') {
      pushPoint({
        round: r.roundNumber,
        kind: 'shield_save',
        targetName: r.mostVotedName || undefined,
      });
    }
    if (r.bouncedFromName) {
      pushPoint({
        round: r.roundNumber,
        kind: 'boomerang_bounce',
        actorName: r.bouncedFromName,
        targetName: r.eliminatedNames[0] || undefined,
      });
    }
    if (r.tieBrokenByJustice) {
      pushPoint({
        round: r.roundNumber,
        kind: 'justice_tiebreak',
        targetName: r.eliminatedNames[0] || undefined,
      });
    }
    r.eliminatedIds.forEach((id) => {
      const role = roleById.get(id);
      if (role && isInfiltratorRole(role)) {
        pushPoint({
          round: r.roundNumber,
          kind: 'infiltrator_eliminated',
          targetName: nameById.get(id),
        });
      }
    });
  }

  for (const ev of specialEvents) {
    if (ev.type === 'avenger_strike') {
      pushPoint({
        round: ev.round,
        kind: 'avenger_strike',
        actorName: ev.actorName,
        targetName: ev.targetName,
      });
    } else if (ev.type === 'lovers_heartbreak') {
      pushPoint({
        round: ev.round,
        kind: 'lovers_chain',
        actorName: ev.actorName,
        targetName: ev.targetName,
      });
    }
  }

  const lastRound = rounds[rounds.length - 1];
  if (lastRound && lastRound.eliminatedNames.length > 0 && winReason !== 'impostor_guessed') {
    pushPoint({
      round: lastRound.roundNumber,
      kind: 'final_elimination',
      targetName: lastRound.eliminatedNames[0],
    });
  }

  return points.sort((a, b) => a.round - b.round);
}

interface RankedCandidate {
  dossier: CaseFilePlayerDossier;
  primary: number;
  tieBreaker: number;
}

function selectDeterministicWinner(
  candidates: RankedCandidate[]
): { winner: RankedCandidate | null; tiedNames: string[] } {
  if (candidates.length === 0) {
    return { winner: null, tiedNames: [] };
  }
  const sorted = [...candidates].sort((a, b) => {
    if (b.primary !== a.primary) return b.primary - a.primary;
    if (b.tieBreaker !== a.tieBreaker) return b.tieBreaker - a.tieBreaker;
    if (a.dossier.won !== b.dossier.won) return a.dossier.won ? -1 : 1;
    if (a.dossier.survived !== b.dossier.survived) return a.dossier.survived ? -1 : 1;
    return a.dossier.playerId.localeCompare(b.dossier.playerId);
  });

  const topPrimary = sorted[0].primary;
  const tiedNames = sorted
    .filter((c) => c.primary === topPrimary)
    .map((c) => c.dossier.name);

  return {
    winner: sorted[0],
    tiedNames: tiedNames.length > 1 ? tiedNames : [],
  };
}

export function computeDeterministicAwards(params: {
  dossiers: CaseFilePlayerDossier[];
  rounds: readonly CaseFileRoundRecord[];
  specialEvents: readonly CaseFileEvent[];
  winReason: CaseFileWinReason;
  winningMrWhiteId?: string | null;
}): CaseFileAward[] {
  const { dossiers, rounds, specialEvents, winReason, winningMrWhiteId } = params;
  const byId = new Map(dossiers.map((d) => [d.playerId, d]));
  const awards: CaseFileAward[] = [];

  const hasAnyVerifiableVotes = dossiers.some((d) => d.verifiableVotesCast > 0);

  // 1. MASTER_DETECTIVE: Lead Citizen investigator by accurate votes + match victory
  {
    if (!hasAnyVerifiableVotes) {
      awards.push({
        awardId: 'MASTER_DETECTIVE',
        status: 'insufficient_data',
        recipientId: null,
        recipientName: null,
        recipientRole: null,
        metricValue: null,
        reasonKey: 'caseAwardInsufficientGroupVote',
      });
    } else {
      const candidates: RankedCandidate[] = dossiers
        .filter((d) => !d.isImpostor && d.accurateVotes > 0)
        .map((d) => ({
          dossier: d,
          primary: d.accurateVotes * 100 + (d.voteAccuracyPct ?? 0) + (d.won ? 25 : 0),
          tieBreaker: (d.survived ? 20 : 0) + d.cluesCount,
        }));
      const { winner, tiedNames } = selectDeterministicWinner(candidates);
      if (!winner) {
        awards.push({
          awardId: 'MASTER_DETECTIVE',
          status: 'insufficient_data',
          recipientId: null,
          recipientName: null,
          recipientRole: null,
          metricValue: null,
          reasonKey: 'caseAwardNoAccurateCitizenVotes',
        });
      } else {
        awards.push({
          awardId: 'MASTER_DETECTIVE',
          status: 'awarded',
          recipientId: winner.dossier.playerId,
          recipientName: winner.dossier.name,
          recipientRole: winner.dossier.role,
          metricValue: winner.dossier.accurateVotes,
          metricUnit: 'count',
          reasonKey: 'caseAwardReasonMasterDetective',
          ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
        });
      }
    }
  }

  // 2. PERFECT_COVER: Winning infiltrator who survived without being eliminated
  {
    const candidates: RankedCandidate[] = dossiers
      .filter((d) => d.isImpostor && d.won && d.survived)
      .map((d) => ({
        dossier: d,
        primary: d.pointsEarned * 10 + (d.role === 'mrwhite' ? 5 : 0),
        tieBreaker: d.cluesCount + d.accurateVotes,
      }));
    const { winner, tiedNames } = selectDeterministicWinner(candidates);
    if (!winner) {
      awards.push({
        awardId: 'PERFECT_COVER',
        status: 'not_applicable',
        recipientId: null,
        recipientName: null,
        recipientRole: null,
        metricValue: null,
        reasonKey: 'caseAwardNoUndetectedInfiltrator',
      });
    } else {
      awards.push({
        awardId: 'PERFECT_COVER',
        status: 'awarded',
        recipientId: winner.dossier.playerId,
        recipientName: winner.dossier.name,
        recipientRole: winner.dossier.role,
        metricValue: winner.dossier.pointsEarned,
        metricUnit: 'points',
        reasonKey: 'caseAwardReasonPerfectCover',
        ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
      });
    }
  }

  // 3. SHARP_EYE: Highest verified vote accuracy percentage (any role with verifiable opposing-faction votes)
  {
    if (!hasAnyVerifiableVotes) {
      awards.push({
        awardId: 'SHARP_EYE',
        status: 'insufficient_data',
        recipientId: null,
        recipientName: null,
        recipientRole: null,
        metricValue: null,
        reasonKey: 'caseAwardInsufficientGroupVote',
      });
    } else {
      const candidates: RankedCandidate[] = dossiers
        .filter((d) => d.voteAccuracyStatus === 'verified' && (d.voteAccuracyPct ?? 0) > 0)
        .map((d) => ({
          dossier: d,
          primary: d.voteAccuracyPct ?? 0,
          tieBreaker: d.verifiableVotesCast * 10 + (d.won ? 5 : 0) + (d.survived ? 2 : 0),
        }));
      const { winner, tiedNames } = selectDeterministicWinner(candidates);
      if (!winner) {
        awards.push({
          awardId: 'SHARP_EYE',
          status: 'insufficient_data',
          recipientId: null,
          recipientName: null,
          recipientRole: null,
          metricValue: null,
          reasonKey: 'caseAwardNoVerifiedAccuracy',
        });
      } else {
        awards.push({
          awardId: 'SHARP_EYE',
          status: 'awarded',
          recipientId: winner.dossier.playerId,
          recipientName: winner.dossier.name,
          recipientRole: winner.dossier.role,
          metricValue: winner.dossier.voteAccuracyPct,
          metricUnit: 'pct',
          reasonKey: 'caseAwardReasonSharpEye',
          ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
        });
      }
    }
  }

  // 4. SOCIAL_STRATEGIST: Active clue & ballot participation across rounds
  {
    const hasParticipationSignals = dossiers.some(
      (d) => d.cluesCount > 0 || d.verifiableVotesCast > 0
    );
    if (!hasParticipationSignals) {
      awards.push({
        awardId: 'SOCIAL_STRATEGIST',
        status: 'insufficient_data',
        recipientId: null,
        recipientName: null,
        recipientRole: null,
        metricValue: null,
        reasonKey: 'caseAwardInsufficientParticipationData',
      });
    } else {
      const candidates: RankedCandidate[] = dossiers
        .filter((d) => d.cluesCount > 0 || d.verifiableVotesCast > 0)
        .map((d) => ({
          dossier: d,
          primary:
            d.cluesCount * 20 +
            d.verifiableVotesCast * 15 +
            d.accurateVotes * 10 +
            (d.won ? 20 : 0),
          tieBreaker: d.survived ? 10 : 0,
        }));
      const { winner, tiedNames } = selectDeterministicWinner(candidates);
      if (!winner) {
        awards.push({
          awardId: 'SOCIAL_STRATEGIST',
          status: 'insufficient_data',
          recipientId: null,
          recipientName: null,
          recipientRole: null,
          metricValue: null,
          reasonKey: 'caseAwardInsufficientParticipationData',
        });
      } else {
        awards.push({
          awardId: 'SOCIAL_STRATEGIST',
          status: 'awarded',
          recipientId: winner.dossier.playerId,
          recipientName: winner.dossier.name,
          recipientRole: winner.dossier.role,
          metricValue: winner.primary,
          metricUnit: 'score',
          reasonKey: 'caseAwardReasonSocialStrategist',
          ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
        });
      }
    }
  }

  // 5. CLUTCH_MOMENT: Decisive high-impact match turning point
  {
    let clutchCandidate: {
      dossier: CaseFilePlayerDossier;
      reasonKey: string;
      metricValue: number;
    } | null = null;

    if (winReason === 'impostor_guessed' && winningMrWhiteId) {
      const mw = byId.get(winningMrWhiteId);
      if (mw) {
        clutchCandidate = {
          dossier: mw,
          reasonKey: 'caseAwardReasonClutchMrWhiteGuess',
          metricValue: mw.pointsEarned,
        };
      }
    }

    if (!clutchCandidate) {
      const priorityEvents: Array<{
        type: CaseFileEvent['type'];
        reasonKey: string;
        score: number;
      }> = [
        { type: 'boomerang_bounce', reasonKey: 'caseAwardReasonClutchBoomerang', score: 100 },
        { type: 'shield_block', reasonKey: 'caseAwardReasonClutchShield', score: 90 },
        { type: 'avenger_strike', reasonKey: 'caseAwardReasonClutchAvenger', score: 85 },
        { type: 'justice_tiebreak', reasonKey: 'caseAwardReasonClutchJustice', score: 80 },
        { type: 'mr_joy_bonus', reasonKey: 'caseAwardReasonClutchMrJoy', score: 75 },
      ];

      for (const spec of priorityEvents) {
        const matchEv = specialEvents.find((ev) => ev.type === spec.type && ev.actorId);
        if (matchEv?.actorId) {
          const d = byId.get(matchEv.actorId);
          if (d) {
            clutchCandidate = {
              dossier: d,
              reasonKey: spec.reasonKey,
              metricValue: spec.score,
            };
            break;
          }
        }
      }
    }

    if (!clutchCandidate && rounds.length > 0) {
      const lastRound = rounds[rounds.length - 1];
      if (lastRound.voteMode !== 'group' && lastRound.eliminatedIds.length > 0) {
        const deciderVotes = lastRound.votes.filter((v) => {
          const target = byId.get(v.targetId);
          const voter = byId.get(v.voterId);
          return (
            Boolean(target) &&
            Boolean(voter) &&
            voter!.won &&
            lastRound.eliminatedIds.includes(v.targetId) &&
            voter!.isImpostor !== target!.isImpostor
          );
        });
        if (deciderVotes.length > 0) {
          const candidates = deciderVotes
            .map((v) => byId.get(v.voterId))
            .filter((d): d is CaseFilePlayerDossier => Boolean(d))
            .map((d) => ({
              dossier: d,
              primary: d.accurateVotes * 25 + (d.survived ? 10 : 0),
              tieBreaker: d.cluesCount,
            }));
          const { winner } = selectDeterministicWinner(candidates);
          if (winner) {
            clutchCandidate = {
              dossier: winner.dossier,
              reasonKey: 'caseAwardReasonClutchFinalVote',
              metricValue: winner.dossier.accurateVotes,
            };
          }
        }
      }
    }

    if (!clutchCandidate) {
      awards.push({
        awardId: 'CLUTCH_MOMENT',
        status: 'insufficient_data',
        recipientId: null,
        recipientName: null,
        recipientRole: null,
        metricValue: null,
        reasonKey: 'caseAwardNoClutchEvent',
      });
    } else {
      awards.push({
        awardId: 'CLUTCH_MOMENT',
        status: 'awarded',
        recipientId: clutchCandidate.dossier.playerId,
        recipientName: clutchCandidate.dossier.name,
        recipientRole: clutchCandidate.dossier.role,
        metricValue: clutchCandidate.metricValue,
        metricUnit: 'score',
        reasonKey: clutchCandidate.reasonKey,
      });
    }
  }

  // 6. GHOST_PROTOCOL: Mr. Ghost casting vote(s) after elimination
  {
    const ghostPlayers = dossiers.filter(
      (d) => d.specialRole === 'ghost' || d.role === 'ghost'
    );
    if (ghostPlayers.length === 0) {
      awards.push({
        awardId: 'GHOST_PROTOCOL',
        status: 'not_applicable',
        recipientId: null,
        recipientName: null,
        recipientRole: null,
        metricValue: null,
        reasonKey: 'caseAwardGhostNotPresent',
      });
    } else {
      const ghostVoteCounts = new Map<string, number>();
      specialEvents
        .filter((ev) => ev.type === 'ghost_vote' && ev.actorId)
        .forEach((ev) => {
          ghostVoteCounts.set(ev.actorId!, (ghostVoteCounts.get(ev.actorId!) || 0) + 1);
        });

      const candidates: RankedCandidate[] = ghostPlayers
        .filter((g) => (ghostVoteCounts.get(g.playerId) || 0) > 0)
        .map((g) => ({
          dossier: g,
          primary: ghostVoteCounts.get(g.playerId) || 0,
          tieBreaker: g.won ? 10 : 0,
        }));

      const { winner, tiedNames } = selectDeterministicWinner(candidates);
      if (!winner) {
        awards.push({
          awardId: 'GHOST_PROTOCOL',
          status: 'not_applicable',
          recipientId: null,
          recipientName: null,
          recipientRole: null,
          metricValue: null,
          reasonKey: 'caseAwardGhostNotTriggered',
        });
      } else {
        awards.push({
          awardId: 'GHOST_PROTOCOL',
          status: 'awarded',
          recipientId: winner.dossier.playerId,
          recipientName: winner.dossier.name,
          recipientRole: winner.dossier.role,
          metricValue: winner.primary,
          metricUnit: 'count',
          reasonKey: 'caseAwardReasonGhostProtocol',
          ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
        });
      }
    }
  }

  return awards;
}

export function buildClassifiedCaseFile(input: BuildClassifiedCaseFileInput): ClassifiedCaseFile {
  const safeStarted = Math.max(0, Math.floor(input.startedAtMs || 0));
  const safeEnded = Math.max(safeStarted, Math.floor(input.endedAtMs || safeStarted));
  const durationSeconds = Math.max(0, Math.round((safeEnded - safeStarted) / 1000));

  const nameById = new Map<string, string>();
  const roleById = new Map<string, PlayerRole>();
  input.players.forEach((p) => {
    nameById.set(p.playerId, p.name);
    roleById.set(p.playerId, p.role);
  });

  const roundRecords: CaseFileRoundRecord[] = input.rounds.map((r) => {
    const roundClues = input.clues.filter((c) => c.round === r.roundNumber);
    const { tally, entries } = resolveTally(
      r.votesByPlayerId || {},
      nameById,
      r.voteMode,
      r.mostVotedId
    );
    return {
      roundNumber: r.roundNumber,
      clues: roundClues,
      voteMode: r.voteMode,
      voteTally: tally,
      votes: entries,
      mostVotedId: r.mostVotedId,
      mostVotedName: r.mostVotedId ? nameById.get(r.mostVotedId) || r.mostVotedId : null,
      eliminatedIds: [...r.eliminatedIds],
      eliminatedNames: r.eliminatedIds.map((id) => nameById.get(id) || id),
      eliminatedRoles: r.eliminatedIds.map((id) => roleById.get(id) || 'citizen'),
      wasSavedBySpecial: r.wasSavedBySpecial || null,
      bouncedFromName: r.bouncedFromName || null,
      tieBroken: Boolean(r.tieBroken),
      tieBrokenByJustice: Boolean(r.tieBrokenByJustice),
      mrWhiteGuess: r.mrWhiteGuess
        ? {
            playerId: r.mrWhiteGuess.playerId,
            playerName: r.mrWhiteGuess.playerName,
            round: r.roundNumber,
            guess: r.mrWhiteGuess.guess,
            isCorrect: Boolean(r.mrWhiteGuess.isCorrect),
            forcedMissing: Boolean(r.mrWhiteGuess.forcedMissing),
          }
        : null,
    };
  });

  const eliminatedRoundById = new Map<string, number>();
  roundRecords.forEach((r) => {
    r.eliminatedIds.forEach((id) => {
      if (!eliminatedRoundById.has(id)) {
        eliminatedRoundById.set(id, r.roundNumber);
      }
    });
  });
  input.specialEvents.forEach((ev) => {
    if (
      (ev.type === 'player_eliminated' ||
        ev.type === 'avenger_strike' ||
        ev.type === 'lovers_heartbreak' ||
        ev.type === 'player_departed') &&
      ev.targetId &&
      !eliminatedRoundById.has(ev.targetId)
    ) {
      eliminatedRoundById.set(ev.targetId, ev.round);
    }
  });

  const cluesCountById = new Map<string, number>();
  input.clues.forEach((c) => {
    if (!c.skipped) {
      cluesCountById.set(c.playerId, (cluesCountById.get(c.playerId) || 0) + 1);
    }
  });

  const totalVotesById = new Map<string, number>();
  const verifiableVotesById = new Map<string, number>();
  const accurateVotesById = new Map<string, number>();

  roundRecords.forEach((r) => {
    if (r.voteMode === 'group') return;
    r.votes.forEach((v) => {
      totalVotesById.set(v.voterId, (totalVotesById.get(v.voterId) || 0) + 1);
      verifiableVotesById.set(v.voterId, (verifiableVotesById.get(v.voterId) || 0) + 1);

      const voterRole = roleById.get(v.voterId) || 'citizen';
      const targetRole = roleById.get(v.targetId) || 'citizen';
      const voterIsImp = isInfiltratorRole(voterRole);
      const targetIsImp = isInfiltratorRole(targetRole);
      if (voterIsImp !== targetIsImp) {
        accurateVotesById.set(v.voterId, (accurateVotesById.get(v.voterId) || 0) + 1);
      }
    });
  });

  const dossiers: CaseFilePlayerDossier[] = input.players.map((p) => {
    const isImpostor = isInfiltratorRole(p.role);
    const totalVotesCast = totalVotesById.get(p.playerId) || 0;
    const verifiableVotesCast = verifiableVotesById.get(p.playerId) || 0;
    const accurateVotes = accurateVotesById.get(p.playerId) || 0;
    const hasVerifiedVotes = verifiableVotesCast > 0;
    const voteAccuracyPct = hasVerifiedVotes
      ? Math.round((accurateVotes / verifiableVotesCast) * 100)
      : null;

    return {
      playerId: p.playerId,
      ...(p.uid ? { uid: p.uid } : {}),
      name: p.name,
      avatar: p.avatar,
      role: p.role,
      specialRole: p.specialRole ?? null,
      isImpostor,
      survived: !p.isEliminated,
      eliminatedRound: p.isEliminated ? eliminatedRoundById.get(p.playerId) ?? null : null,
      pointsEarned: p.pointsEarned,
      ...(p.xpEarned !== undefined ? { xpEarned: p.xpEarned } : {}),
      won: p.won,
      cluesCount: cluesCountById.get(p.playerId) || 0,
      totalVotesCast,
      verifiableVotesCast,
      accurateVotes,
      voteAccuracyPct,
      voteAccuracyStatus: hasVerifiedVotes ? 'verified' : 'insufficient_data',
      awardsEarned: [],
    };
  });

  const winningFaction: CaseFileWinFaction = resolveWinningFaction(
    input.players.map((p) => ({ role: p.role, isEliminated: p.isEliminated })),
    input.winner,
    input.winReason
  );

  const awards = computeDeterministicAwards({
    dossiers,
    rounds: roundRecords,
    specialEvents: input.specialEvents,
    winReason: input.winReason,
    winningMrWhiteId: input.winningMrWhiteId,
  });

  const awardsByPlayer = new Map<string, Set<CaseFileAwardId>>();
  awards.forEach((a) => {
    if (a.status === 'awarded' && a.recipientId) {
      if (!awardsByPlayer.has(a.recipientId)) {
        awardsByPlayer.set(a.recipientId, new Set<CaseFileAwardId>());
      }
      awardsByPlayer.get(a.recipientId)!.add(a.awardId);
    }
  });

  dossiers.forEach((d) => {
    const set = awardsByPlayer.get(d.playerId);
    if (set) {
      d.awardsEarned = Array.from(set);
    }
  });

  const turningPoints = extractTurningPoints(
    roundRecords,
    input.specialEvents,
    roleById,
    nameById,
    input.winReason
  );

  const participantIds =
    input.participantIds && input.participantIds.length > 0
      ? Array.from(new Set(input.participantIds))
      : input.players.map((p) => p.uid).filter((id): id is string => Boolean(id));

  return {
    schemaVersion: CASE_FILE_SCHEMA_VERSION,
    reportId: input.reportId,
    operationCode: deriveOperationCode(input.reportId),
    mode: input.mode,
    ...(input.roomId ? { roomId: input.roomId } : {}),
    matchId: input.matchId,
    startedAtMs: safeStarted,
    endedAtMs: safeEnded,
    durationSeconds,
    language: input.language,
    category: input.category,
    difficulty: input.difficulty,
    gameMode: input.gameMode,
    playerCount: input.players.length,
    roundCount: Math.max(1, roundRecords.length),
    winner: input.winner,
    winningFaction,
    winReason: input.winReason,
    winningMrWhiteId: input.winningMrWhiteId ?? null,
    secretWord: input.secretWord,
    undercoverWord: input.undercoverWord,
    participantIds,
    players: dossiers,
    rounds: roundRecords,
    specialEvents: [...input.specialEvents],
    turningPoints,
    awards,
  };
}
