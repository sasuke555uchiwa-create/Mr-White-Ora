import { OnlineRole, ServerRoomPlayer } from './gameLogic';

export const CASE_FILE_SCHEMA_VERSION = 1;

export interface ServerClueRecord {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  text: string;
  round: number;
  skipped?: boolean;
}

export interface ServerRoundRecord {
  round: number;
  votesByUid: Record<string, string>;
  mostVotedUid: string | null;
  votersForEliminated: string[];
  tieBroken: boolean;
  eliminatedUid: string | null;
  eliminatedRole: OnlineRole | null;
  mrWhiteGuess?: {
    uid: string;
    name: string;
    guess?: string;
    isCorrect: boolean;
    forcedMissing?: boolean;
  } | null;
}

export interface ServerMatchEvent {
  id: string;
  round: number;
  type: 'player_eliminated' | 'mr_white_guess' | 'player_departed';
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  outcome?: string;
  timestampMs?: number;
}

export interface OnlineCaseFileAward {
  awardId:
    | 'MASTER_DETECTIVE'
    | 'PERFECT_COVER'
    | 'SHARP_EYE'
    | 'SOCIAL_STRATEGIST'
    | 'CLUTCH_MOMENT'
    | 'GHOST_PROTOCOL';
  status: 'awarded' | 'insufficient_data' | 'not_applicable';
  recipientId: string | null;
  recipientName: string | null;
  recipientRole: OnlineRole | null;
  metricValue: number | null;
  metricUnit?: 'pct' | 'points' | 'count' | 'score';
  reasonKey: string;
  tiedCandidates?: string[];
}

export interface OnlineCaseFilePlayerDossier {
  playerId: string;
  uid: string;
  name: string;
  avatar: string;
  role: OnlineRole;
  specialRole: null;
  isImpostor: boolean;
  survived: boolean;
  eliminatedRound: number | null;
  pointsEarned: number;
  xpEarned: number;
  won: boolean;
  cluesCount: number;
  totalVotesCast: number;
  verifiableVotesCast: number;
  accurateVotes: number;
  voteAccuracyPct: number | null;
  voteAccuracyStatus: 'verified' | 'insufficient_data' | 'not_applicable';
  awardsEarned: OnlineCaseFileAward['awardId'][];
}

export interface OnlineClassifiedCaseFile {
  schemaVersion: number;
  reportId: string;
  operationCode: string;
  mode: 'online';
  roomId: string;
  matchId: string;
  startedAtMs: number;
  endedAtMs: number;
  durationSeconds: number;
  language: string;
  category: string;
  difficulty: 'easy' | 'hard';
  gameMode: 'expression' | 'question';
  playerCount: number;
  roundCount: number;
  winner: 'citizens' | 'impostor';
  winningFaction: 'citizens' | 'undercover_solo' | 'mrwhite_solo' | 'both';
  winReason: 'impostor_caught' | 'citizens_wrong_vote' | 'impostor_guessed';
  winningMrWhiteId: string | null;
  secretWord: string;
  undercoverWord: string;
  participantIds: string[];
  players: OnlineCaseFilePlayerDossier[];
  rounds: Array<{
    roundNumber: number;
    clues: Array<{
      id: string;
      round: number;
      playerId: string;
      playerName: string;
      playerAvatar: string;
      text: string;
      skipped?: boolean;
    }>;
    voteMode: 'online_secret';
    voteTally: Array<{ targetId: string; targetName: string; count: number }>;
    votes: Array<{ voterId: string; voterName: string; targetId: string; targetName: string }>;
    mostVotedId: string | null;
    mostVotedName: string | null;
    eliminatedIds: string[];
    eliminatedNames: string[];
    eliminatedRoles: OnlineRole[];
    wasSavedBySpecial: null;
    bouncedFromName: null;
    tieBroken: boolean;
    tieBrokenByJustice: false;
    mrWhiteGuess: {
      playerId: string;
      playerName: string;
      round: number;
      guess?: string;
      isCorrect: boolean;
      forcedMissing?: boolean;
    } | null;
  }>;
  specialEvents: ServerMatchEvent[];
  turningPoints: Array<{
    round: number;
    kind:
      | 'mr_white_guess_win'
      | 'mr_white_guess_miss'
      | 'infiltrator_eliminated'
      | 'final_elimination';
    actorName?: string;
    targetName?: string;
  }>;
  awards: OnlineCaseFileAward[];
}

function deriveOperationCode(seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const num = ((hash >>> 0) % 9000) + 1000;
  return `OP-${num}`;
}

function isInfiltratorRole(role: OnlineRole): boolean {
  return role === 'mrwhite' || role === 'undercover';
}

interface RankedCandidate {
  dossier: OnlineCaseFilePlayerDossier;
  primary: number;
  tieBreaker: number;
}

function selectDeterministicWinner(candidates: RankedCandidate[]): {
  winner: RankedCandidate | null;
  tiedNames: string[];
} {
  if (candidates.length === 0) return { winner: null, tiedNames: [] };
  const sorted = [...candidates].sort((a, b) => {
    if (b.primary !== a.primary) return b.primary - a.primary;
    if (b.tieBreaker !== a.tieBreaker) return b.tieBreaker - a.tieBreaker;
    if (a.dossier.won !== b.dossier.won) return a.dossier.won ? -1 : 1;
    if (a.dossier.survived !== b.dossier.survived) return a.dossier.survived ? -1 : 1;
    return a.dossier.playerId.localeCompare(b.dossier.playerId);
  });
  const topPrimary = sorted[0].primary;
  const tiedNames = sorted.filter((c) => c.primary === topPrimary).map((c) => c.dossier.name);
  return {
    winner: sorted[0],
    tiedNames: tiedNames.length > 1 ? tiedNames : [],
  };
}

export function buildOnlineClassifiedCaseFile(params: {
  reportId: string;
  roomId: string;
  matchId: string;
  startedAtMs: number;
  endedAtMs: number;
  language: string;
  category: string;
  difficulty: 'easy' | 'hard';
  winner: 'citizens' | 'impostor';
  winningFaction: 'citizens' | 'undercover_solo' | 'mrwhite_solo' | 'both';
  winReason: 'impostor_caught' | 'citizens_wrong_vote' | 'impostor_guessed';
  winningMrWhiteUid: string | null;
  civilianWord: string;
  undercoverWord: string;
  rolesByUid: Record<string, OnlineRole>;
  rosterByUid: Record<string, { name: string; avatar: string }>;
  players: readonly ServerRoomPlayer[];
  rewardsByUid: Record<string, { xpDelta: number; isWinner: boolean; roundPoints: number }>;
  clues: readonly ServerClueRecord[];
  rounds: readonly ServerRoundRecord[];
  events: readonly ServerMatchEvent[];
}): OnlineClassifiedCaseFile {
  const safeStarted = Math.max(0, Math.floor(params.startedAtMs || params.endedAtMs));
  const safeEnded = Math.max(safeStarted, Math.floor(params.endedAtMs || safeStarted));
  const durationSeconds = Math.max(0, Math.round((safeEnded - safeStarted) / 1000));

  const currentByUid = new Map(params.players.map((p) => [p.uid, p]));
  const allUids = Array.from(
    new Set([
      ...Object.keys(params.rolesByUid || {}),
      ...Object.keys(params.rosterByUid || {}),
      ...params.players.map((p) => p.uid),
    ])
  );

  const nameByUid = new Map<string, string>();
  const avatarByUid = new Map<string, string>();
  allUids.forEach((uid) => {
    const live = currentByUid.get(uid);
    const roster = params.rosterByUid?.[uid];
    nameByUid.set(uid, live?.name || roster?.name || uid);
    avatarByUid.set(uid, live?.avatar ?? roster?.avatar ?? '');
  });

  const roundRecords = params.rounds.map((r) => {
    const roundClues = params.clues
      .filter((c) => c.round === r.round)
      .map((c) => ({
        id: c.id,
        round: c.round,
        playerId: c.uid,
        playerName: c.name || nameByUid.get(c.uid) || c.uid,
        playerAvatar: c.avatar ?? avatarByUid.get(c.uid) ?? '',
        text: c.text,
        skipped: Boolean(c.skipped),
      }));

    const counts = new Map<string, number>();
    const votes: Array<{ voterId: string; voterName: string; targetId: string; targetName: string }> =
      [];
    Object.entries(r.votesByUid || {}).forEach(([voterUid, targetUid]) => {
      if (!targetUid) return;
      counts.set(targetUid, (counts.get(targetUid) || 0) + 1);
      votes.push({
        voterId: voterUid,
        voterName: nameByUid.get(voterUid) || voterUid,
        targetId: targetUid,
        targetName: nameByUid.get(targetUid) || targetUid,
      });
    });

    const voteTally = Array.from(counts.entries())
      .map(([targetId, count]) => ({
        targetId,
        targetName: nameByUid.get(targetId) || targetId,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.targetId.localeCompare(b.targetId));

    votes.sort((a, b) => a.voterId.localeCompare(b.voterId));

    const eliminatedIds = r.eliminatedUid ? [r.eliminatedUid] : [];
    const eliminatedNames = eliminatedIds.map((id) => nameByUid.get(id) || id);
    const eliminatedRoles = eliminatedIds.map((id) => params.rolesByUid[id] || 'citizen');

    return {
      roundNumber: r.round,
      clues: roundClues,
      voteMode: 'online_secret' as const,
      voteTally,
      votes,
      mostVotedId: r.mostVotedUid,
      mostVotedName: r.mostVotedUid ? nameByUid.get(r.mostVotedUid) || r.mostVotedUid : null,
      eliminatedIds,
      eliminatedNames,
      eliminatedRoles,
      wasSavedBySpecial: null,
      bouncedFromName: null,
      tieBroken: Boolean(r.tieBroken),
      tieBrokenByJustice: false as const,
      mrWhiteGuess: r.mrWhiteGuess
        ? {
            playerId: r.mrWhiteGuess.uid,
            playerName: r.mrWhiteGuess.name || nameByUid.get(r.mrWhiteGuess.uid) || r.mrWhiteGuess.uid,
            round: r.round,
            guess: r.mrWhiteGuess.guess,
            isCorrect: Boolean(r.mrWhiteGuess.isCorrect),
            forcedMissing: Boolean(r.mrWhiteGuess.forcedMissing),
          }
        : null,
    };
  });

  const eliminatedRoundByUid = new Map<string, number>();
  roundRecords.forEach((r) => {
    r.eliminatedIds.forEach((id) => {
      if (!eliminatedRoundByUid.has(id)) {
        eliminatedRoundByUid.set(id, r.roundNumber);
      }
    });
  });
  params.events.forEach((ev) => {
    if (
      (ev.type === 'player_eliminated' || ev.type === 'player_departed') &&
      ev.targetId &&
      !eliminatedRoundByUid.has(ev.targetId)
    ) {
      eliminatedRoundByUid.set(ev.targetId, ev.round);
    }
  });

  const cluesCountByUid = new Map<string, number>();
  params.clues.forEach((c) => {
    if (!c.skipped) {
      cluesCountByUid.set(c.uid, (cluesCountByUid.get(c.uid) || 0) + 1);
    }
  });

  const totalVotesByUid = new Map<string, number>();
  const accurateVotesByUid = new Map<string, number>();
  roundRecords.forEach((r) => {
    r.votes.forEach((v) => {
      totalVotesByUid.set(v.voterId, (totalVotesByUid.get(v.voterId) || 0) + 1);
      const voterRole = params.rolesByUid[v.voterId] || 'citizen';
      const targetRole = params.rolesByUid[v.targetId] || 'citizen';
      if (isInfiltratorRole(voterRole) !== isInfiltratorRole(targetRole)) {
        accurateVotesByUid.set(v.voterId, (accurateVotesByUid.get(v.voterId) || 0) + 1);
      }
    });
  });

  const dossiers: OnlineCaseFilePlayerDossier[] = allUids.map((uid) => {
    const live = currentByUid.get(uid);
    const role = params.rolesByUid[uid] || 'citizen';
    const isImpostor = isInfiltratorRole(role);
    const survived = Boolean(live && !live.isEliminated);
    const reward = params.rewardsByUid[uid] || { xpDelta: 0, isWinner: false, roundPoints: 0 };
    const totalVotesCast = totalVotesByUid.get(uid) || 0;
    const accurateVotes = accurateVotesByUid.get(uid) || 0;
    const hasVotes = totalVotesCast > 0;
    const voteAccuracyPct = hasVotes ? Math.round((accurateVotes / totalVotesCast) * 100) : null;

    return {
      playerId: uid,
      uid,
      name: nameByUid.get(uid) || uid,
      avatar: avatarByUid.get(uid) || '',
      role,
      specialRole: null,
      isImpostor,
      survived,
      eliminatedRound: survived ? null : eliminatedRoundByUid.get(uid) ?? null,
      pointsEarned: reward.roundPoints,
      xpEarned: reward.xpDelta,
      won: reward.isWinner,
      cluesCount: cluesCountByUid.get(uid) || 0,
      totalVotesCast,
      verifiableVotesCast: totalVotesCast,
      accurateVotes,
      voteAccuracyPct,
      voteAccuracyStatus: hasVotes ? 'verified' : 'insufficient_data',
      awardsEarned: [],
    };
  });

  const byId = new Map(dossiers.map((d) => [d.playerId, d]));
  const awards: OnlineCaseFileAward[] = [];
  const hasAnyVotes = dossiers.some((d) => d.verifiableVotesCast > 0);

  // 1. MASTER_DETECTIVE
  if (!hasAnyVotes) {
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
    const { winner, tiedNames } = selectDeterministicWinner(
      dossiers
        .filter((d) => !d.isImpostor && d.accurateVotes > 0)
        .map((d) => ({
          dossier: d,
          primary: d.accurateVotes * 100 + (d.voteAccuracyPct ?? 0) + (d.won ? 25 : 0),
          tieBreaker: (d.survived ? 20 : 0) + d.cluesCount,
        }))
    );
    awards.push(
      winner
        ? {
            awardId: 'MASTER_DETECTIVE',
            status: 'awarded',
            recipientId: winner.dossier.playerId,
            recipientName: winner.dossier.name,
            recipientRole: winner.dossier.role,
            metricValue: winner.dossier.accurateVotes,
            metricUnit: 'count',
            reasonKey: 'caseAwardReasonMasterDetective',
            ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
          }
        : {
            awardId: 'MASTER_DETECTIVE',
            status: 'insufficient_data',
            recipientId: null,
            recipientName: null,
            recipientRole: null,
            metricValue: null,
            reasonKey: 'caseAwardNoAccurateCitizenVotes',
          }
    );
  }

  // 2. PERFECT_COVER
  {
    const { winner, tiedNames } = selectDeterministicWinner(
      dossiers
        .filter((d) => d.isImpostor && d.won && d.survived)
        .map((d) => ({
          dossier: d,
          primary: d.pointsEarned * 10 + (d.role === 'mrwhite' ? 5 : 0),
          tieBreaker: d.cluesCount + d.accurateVotes,
        }))
    );
    awards.push(
      winner
        ? {
            awardId: 'PERFECT_COVER',
            status: 'awarded',
            recipientId: winner.dossier.playerId,
            recipientName: winner.dossier.name,
            recipientRole: winner.dossier.role,
            metricValue: winner.dossier.pointsEarned,
            metricUnit: 'points',
            reasonKey: 'caseAwardReasonPerfectCover',
            ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
          }
        : {
            awardId: 'PERFECT_COVER',
            status: 'not_applicable',
            recipientId: null,
            recipientName: null,
            recipientRole: null,
            metricValue: null,
            reasonKey: 'caseAwardNoUndetectedInfiltrator',
          }
    );
  }

  // 3. SHARP_EYE
  if (!hasAnyVotes) {
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
    const { winner, tiedNames } = selectDeterministicWinner(
      dossiers
        .filter((d) => d.voteAccuracyStatus === 'verified' && (d.voteAccuracyPct ?? 0) > 0)
        .map((d) => ({
          dossier: d,
          primary: d.voteAccuracyPct ?? 0,
          tieBreaker: d.verifiableVotesCast * 10 + (d.won ? 5 : 0) + (d.survived ? 2 : 0),
        }))
    );
    awards.push(
      winner
        ? {
            awardId: 'SHARP_EYE',
            status: 'awarded',
            recipientId: winner.dossier.playerId,
            recipientName: winner.dossier.name,
            recipientRole: winner.dossier.role,
            metricValue: winner.dossier.voteAccuracyPct,
            metricUnit: 'pct',
            reasonKey: 'caseAwardReasonSharpEye',
            ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
          }
        : {
            awardId: 'SHARP_EYE',
            status: 'insufficient_data',
            recipientId: null,
            recipientName: null,
            recipientRole: null,
            metricValue: null,
            reasonKey: 'caseAwardNoVerifiedAccuracy',
          }
    );
  }

  // 4. SOCIAL_STRATEGIST
  {
    const hasParticipation = dossiers.some((d) => d.cluesCount > 0 || d.verifiableVotesCast > 0);
    if (!hasParticipation) {
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
      const { winner, tiedNames } = selectDeterministicWinner(
        dossiers
          .filter((d) => d.cluesCount > 0 || d.verifiableVotesCast > 0)
          .map((d) => ({
            dossier: d,
            primary:
              d.cluesCount * 20 +
              d.verifiableVotesCast * 15 +
              d.accurateVotes * 10 +
              (d.won ? 20 : 0),
            tieBreaker: d.survived ? 10 : 0,
          }))
      );
      awards.push(
        winner
          ? {
              awardId: 'SOCIAL_STRATEGIST',
              status: 'awarded',
              recipientId: winner.dossier.playerId,
              recipientName: winner.dossier.name,
              recipientRole: winner.dossier.role,
              metricValue: winner.primary,
              metricUnit: 'score',
              reasonKey: 'caseAwardReasonSocialStrategist',
              ...(tiedNames.length > 1 ? { tiedCandidates: tiedNames } : {}),
            }
          : {
              awardId: 'SOCIAL_STRATEGIST',
              status: 'insufficient_data',
              recipientId: null,
              recipientName: null,
              recipientRole: null,
              metricValue: null,
              reasonKey: 'caseAwardInsufficientParticipationData',
            }
      );
    }
  }

  // 5. CLUTCH_MOMENT
  {
    let clutch: { dossier: OnlineCaseFilePlayerDossier; reasonKey: string; metric: number } | null =
      null;
    if (params.winReason === 'impostor_guessed' && params.winningMrWhiteUid) {
      const mw = byId.get(params.winningMrWhiteUid);
      if (mw) {
        clutch = {
          dossier: mw,
          reasonKey: 'caseAwardReasonClutchMrWhiteGuess',
          metric: mw.pointsEarned,
        };
      }
    }
    if (!clutch && roundRecords.length > 0) {
      const lastRound = roundRecords[roundRecords.length - 1];
      if (lastRound.eliminatedIds.length > 0) {
        const deciders = lastRound.votes
          .filter((v) => {
            const voter = byId.get(v.voterId);
            const target = byId.get(v.targetId);
            return (
              Boolean(voter) &&
              Boolean(target) &&
              voter!.won &&
              lastRound.eliminatedIds.includes(v.targetId) &&
              voter!.isImpostor !== target!.isImpostor
            );
          })
          .map((v) => byId.get(v.voterId)!)
          .map((d) => ({
            dossier: d,
            primary: d.accurateVotes * 25 + (d.survived ? 10 : 0),
            tieBreaker: d.cluesCount,
          }));
        const { winner } = selectDeterministicWinner(deciders);
        if (winner) {
          clutch = {
            dossier: winner.dossier,
            reasonKey: 'caseAwardReasonClutchFinalVote',
            metric: winner.dossier.accurateVotes,
          };
        }
      }
    }
    awards.push(
      clutch
        ? {
            awardId: 'CLUTCH_MOMENT',
            status: 'awarded',
            recipientId: clutch.dossier.playerId,
            recipientName: clutch.dossier.name,
            recipientRole: clutch.dossier.role,
            metricValue: clutch.metric,
            metricUnit: 'score',
            reasonKey: clutch.reasonKey,
          }
        : {
            awardId: 'CLUTCH_MOMENT',
            status: 'insufficient_data',
            recipientId: null,
            recipientName: null,
            recipientRole: null,
            metricValue: null,
            reasonKey: 'caseAwardNoClutchEvent',
          }
    );
  }

  // 6. GHOST_PROTOCOL (Classic online does not include special role mr_ghost)
  awards.push({
    awardId: 'GHOST_PROTOCOL',
    status: 'not_applicable',
    recipientId: null,
    recipientName: null,
    recipientRole: null,
    metricValue: null,
    reasonKey: 'caseAwardGhostNotPresent',
  });

  const awardsByPlayer = new Map<string, Set<OnlineCaseFileAward['awardId']>>();
  awards.forEach((a) => {
    if (a.status === 'awarded' && a.recipientId) {
      if (!awardsByPlayer.has(a.recipientId)) {
        awardsByPlayer.set(a.recipientId, new Set());
      }
      awardsByPlayer.get(a.recipientId)!.add(a.awardId);
    }
  });
  dossiers.forEach((d) => {
    const set = awardsByPlayer.get(d.playerId);
    if (set) d.awardsEarned = Array.from(set);
  });

  const turningPoints: OnlineClassifiedCaseFile['turningPoints'] = [];
  const seen = new Set<string>();
  const pushTp = (tp: OnlineClassifiedCaseFile['turningPoints'][number]) => {
    const key = `${tp.round}:${tp.kind}:${tp.actorName || ''}:${tp.targetName || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      turningPoints.push(tp);
    }
  };
  for (const r of roundRecords) {
    if (r.mrWhiteGuess) {
      pushTp({
        round: r.roundNumber,
        kind: r.mrWhiteGuess.isCorrect ? 'mr_white_guess_win' : 'mr_white_guess_miss',
        actorName: r.mrWhiteGuess.playerName,
      });
    }
    r.eliminatedIds.forEach((id) => {
      const role = params.rolesByUid[id];
      if (role && isInfiltratorRole(role)) {
        pushTp({
          round: r.roundNumber,
          kind: 'infiltrator_eliminated',
          targetName: nameByUid.get(id),
        });
      }
    });
  }
  const lastRound = roundRecords[roundRecords.length - 1];
  if (lastRound && lastRound.eliminatedNames.length > 0 && params.winReason !== 'impostor_guessed') {
    pushTp({
      round: lastRound.roundNumber,
      kind: 'final_elimination',
      targetName: lastRound.eliminatedNames[0],
    });
  }

  return {
    schemaVersion: CASE_FILE_SCHEMA_VERSION,
    reportId: params.reportId,
    operationCode: deriveOperationCode(params.reportId),
    mode: 'online',
    roomId: params.roomId,
    matchId: params.matchId,
    startedAtMs: safeStarted,
    endedAtMs: safeEnded,
    durationSeconds,
    language: params.language,
    category: params.category,
    difficulty: params.difficulty,
    gameMode: 'expression',
    playerCount: allUids.length,
    roundCount: Math.max(1, roundRecords.length),
    winner: params.winner,
    winningFaction: params.winningFaction,
    winReason: params.winReason,
    winningMrWhiteId: params.winningMrWhiteUid,
    secretWord: params.civilianWord,
    undercoverWord: params.undercoverWord,
    participantIds: allUids,
    players: dossiers,
    rounds: roundRecords,
    specialEvents: [...params.events],
    turningPoints: turningPoints.sort((a, b) => a.round - b.round),
    awards,
  };
}
