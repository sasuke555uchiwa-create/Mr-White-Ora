export type OnlineRole = 'citizen' | 'undercover' | 'mrwhite';

export interface ServerRoomPlayer {
  uid: string;
  name: string;
  avatar: string;
  isReady: boolean;
  isEliminated: boolean;
  score: number;
  revealedRole: OnlineRole | null;
}

export function calculateLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  return Math.floor(safeXp / 100) + 1;
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function assignServerRoles(uids: readonly string[]): Record<string, OnlineRole> {
  const count = uids.length;
  const undercoverCount = count >= 8 ? 2 : count >= 5 ? 1 : 0;
  const pool: OnlineRole[] = ['mrwhite'];
  for (let i = 0; i < undercoverCount; i++) pool.push('undercover');
  while (pool.length < count) pool.push('citizen');

  const shuffled = shuffleArray(pool);
  const rolesByUid: Record<string, OnlineRole> = {};
  uids.forEach((uid, idx) => {
    rolesByUid[uid] = shuffled[idx] || 'citizen';
  });
  return rolesByUid;
}

export function buildServerTurnOrder(
  players: readonly ServerRoomPlayer[],
  rolesByUid: Record<string, OnlineRole>,
  roundNum: number
): string[] {
  const alive = players.filter((p) => !p.isEliminated);
  const shuffled = shuffleArray(alive);
  if (roundNum === 1 && shuffled.length > 1 && rolesByUid[shuffled[0].uid] === 'mrwhite') {
    const nonWhiteIdx = shuffled.findIndex((p) => rolesByUid[p.uid] !== 'mrwhite');
    if (nonWhiteIdx > 0) {
      [shuffled[0], shuffled[nonWhiteIdx]] = [shuffled[nonWhiteIdx], shuffled[0]];
    }
  }
  return shuffled.map((p) => p.uid);
}

export function tallyVotesServer(
  votesByUid: Record<string, string>,
  aliveUids: Set<string>
): { mostVotedId: string; tieBroken: boolean } | null {
  const counts: Record<string, number> = {};
  Object.entries(votesByUid).forEach(([voterUid, targetUid]) => {
    if (aliveUids.has(voterUid) && aliveUids.has(targetUid)) {
      counts[targetUid] = (counts[targetUid] || 0) + 1;
    }
  });

  let maxVotes = 0;
  let candidates: string[] = [];
  Object.entries(counts).forEach(([targetUid, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      candidates = [targetUid];
    } else if (count === maxVotes) {
      candidates.push(targetUid);
    }
  });

  if (candidates.length === 0) return null;
  const tieBroken = candidates.length > 1;
  const mostVotedId = tieBroken
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : candidates[0];
  return { mostVotedId, tieBroken };
}

export function evaluateOnlineWin(
  players: readonly ServerRoomPlayer[],
  rolesByUid: Record<string, OnlineRole>
): {
  isOver: boolean;
  winner: 'citizens' | 'impostor' | null;
  winReason: 'impostor_caught' | 'citizens_wrong_vote' | null;
} {
  const alive = players.filter((p) => !p.isEliminated);
  const aliveCitizens = alive.filter((p) => {
    const role = rolesByUid[p.uid];
    return role !== 'mrwhite' && role !== 'undercover';
  }).length;
  const aliveBadGuys = alive.filter((p) => {
    const role = rolesByUid[p.uid];
    return role === 'mrwhite' || role === 'undercover';
  }).length;

  if (aliveBadGuys === 0) {
    return { isOver: true, winner: 'citizens', winReason: 'impostor_caught' };
  }
  if (aliveBadGuys >= aliveCitizens || aliveCitizens <= 1) {
    return { isOver: true, winner: 'impostor', winReason: 'citizens_wrong_vote' };
  }
  return { isOver: false, winner: null, winReason: null };
}

export function resolveOnlineWinningFaction(
  players: readonly ServerRoomPlayer[],
  rolesByUid: Record<string, OnlineRole>,
  winner: 'citizens' | 'impostor',
  winReason: string
): 'citizens' | 'undercover_solo' | 'mrwhite_solo' | 'both' {
  if (winner === 'citizens') return 'citizens';
  if (winReason === 'impostor_guessed') return 'mrwhite_solo';

  const aliveMrWhite = players.some((p) => !p.isEliminated && rolesByUid[p.uid] === 'mrwhite');
  const aliveUndercover = players.some((p) => !p.isEliminated && rolesByUid[p.uid] === 'undercover');

  if (aliveMrWhite && aliveUndercover) return 'both';
  if (aliveMrWhite) return 'mrwhite_solo';
  if (aliveUndercover) return 'undercover_solo';

  const hasMrWhite = players.some((p) => rolesByUid[p.uid] === 'mrwhite');
  const hasUndercover = players.some((p) => rolesByUid[p.uid] === 'undercover');
  if (hasMrWhite && hasUndercover) return 'both';
  if (hasMrWhite) return 'mrwhite_solo';
  return 'undercover_solo';
}

export function computePlayerOnlineReward(
  uid: string,
  players: readonly ServerRoomPlayer[],
  rolesByUid: Record<string, OnlineRole>,
  votesByUid: Record<string, string>,
  winner: 'citizens' | 'impostor',
  winReason: string,
  winningMrWhiteUid?: string | null
): { xpDelta: number; isWinner: boolean } {
  const player = players.find((p) => p.uid === uid);
  const role = rolesByUid[uid];
  if (!player || !role) return { xpDelta: 0, isWinner: false };

  const faction = resolveOnlineWinningFaction(players, rolesByUid, winner, winReason);
  let roundPoints = 0;

  if (faction === 'citizens') {
    if (role !== 'mrwhite' && role !== 'undercover') {
      roundPoints += 2;
    }
  } else if (winReason === 'impostor_guessed') {
    if (uid === winningMrWhiteUid) {
      roundPoints += 6;
    }
  } else if (faction === 'both') {
    if (!player.isEliminated && role === 'mrwhite') roundPoints += 12;
    else if (!player.isEliminated && role === 'undercover') roundPoints += 10;
  } else if (faction === 'mrwhite_solo') {
    if (!player.isEliminated && role === 'mrwhite') roundPoints += 12;
  } else if (faction === 'undercover_solo') {
    if (!player.isEliminated && role === 'undercover') roundPoints += 10;
  }

  let xpDelta = roundPoints * 10;
  if (role === 'citizen') {
    const myVote = votesByUid[uid];
    if (myVote && (rolesByUid[myVote] === 'mrwhite' || rolesByUid[myVote] === 'undercover')) {
      xpDelta += 20;
    }
  }

  return { xpDelta, isWinner: roundPoints > 0 };
}
