import { PlayerRole, SpecialRoleId } from '../../types';

export interface RoleCounts {
  civilians: number;
  undercover: number;
  mrwhite: number;
}

export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function computeOnlineRoleCounts(playerCount: number): RoleCounts {
  if (playerCount < 3) {
    return { civilians: Math.max(0, playerCount), undercover: 0, mrwhite: 0 };
  }
  const mrwhite = 1;
  const undercover = playerCount >= 8 ? 2 : playerCount >= 5 ? 1 : 0;
  const civilians = Math.max(1, playerCount - mrwhite - undercover);
  return { civilians, undercover, mrwhite };
}

export function buildMainRolePool(
  playerCount: number,
  mrWhiteCount: number,
  undercoverCount: number,
  rng: () => number = Math.random
): ('citizen' | 'undercover' | 'mrwhite')[] {
  if (playerCount <= 0) return [];
  const maxBad = Math.max(1, Math.floor((playerCount - 1) / 2));
  let safeMrWhite = Math.max(0, Math.min(mrWhiteCount, maxBad));
  let safeUndercover = Math.max(0, Math.min(undercoverCount, maxBad - safeMrWhite));
  if (safeMrWhite + safeUndercover === 0 && playerCount >= 3) {
    safeMrWhite = 1;
  }

  const pool: ('citizen' | 'undercover' | 'mrwhite')[] = [];
  for (let i = 0; i < safeMrWhite; i++) pool.push('mrwhite');
  for (let i = 0; i < safeUndercover; i++) pool.push('undercover');
  while (pool.length < playerCount) pool.push('citizen');

  return shuffleArray(pool, rng);
}

export function buildSpecialRolePool(
  mainRoles: readonly string[],
  selectedSpecialRoles: readonly SpecialRoleId[],
  rng: () => number = Math.random
): (SpecialRoleId | null)[] {
  const playerCount = mainRoles.length;
  const spPool: (SpecialRoleId | null)[] = Array(playerCount).fill(null);
  if (!selectedSpecialRoles || selectedSpecialRoles.length === 0 || playerCount === 0) {
    return spPool;
  }

  const availableIndices = shuffleArray(
    Array.from({ length: playerCount }, (_, i) => i),
    rng
  );
  const shuffledSpecials = shuffleArray(selectedSpecialRoles, rng);

  for (const roleId of shuffledSpecials) {
    if (roleId === 'lovers') {
      if (playerCount >= 5 && availableIndices.length >= 2) {
        const idx1 = availableIndices.pop()!;
        const idx2 = availableIndices.pop()!;
        spPool[idx1] = 'lovers';
        spPool[idx2] = 'lovers';
      }
    } else if (roleId === 'mr_meme') {
      if (availableIndices.length > 0) {
        const nonWhitePos = availableIndices.findIndex((idx) => mainRoles[idx] !== 'mrwhite');
        const pickedIdx =
          nonWhitePos !== -1
            ? availableIndices.splice(nonWhitePos, 1)[0]
            : availableIndices.pop()!;
        spPool[pickedIdx] = 'mr_meme';
      }
    } else if (availableIndices.length > 0) {
      const idx = availableIndices.pop()!;
      spPool[idx] = roleId;
    }
  }

  return spPool;
}

export function assignOnlineRoles(
  uids: readonly string[],
  rng: () => number = Math.random
): Record<string, 'citizen' | 'undercover' | 'mrwhite'> {
  const counts = computeOnlineRoleCounts(uids.length);
  const pool = buildMainRolePool(uids.length, counts.mrwhite, counts.undercover, rng);
  const assignments: Record<string, 'citizen' | 'undercover' | 'mrwhite'> = {};
  uids.forEach((uid, index) => {
    assignments[uid] = pool[index] || 'citizen';
  });
  return assignments;
}

export function buildOnlineTurnOrder(
  players: readonly { uid: string; role: PlayerRole | string; isEliminated?: boolean }[],
  roundNum: number,
  rng: () => number = Math.random
): string[] {
  const alive = players.filter((p) => !p.isEliminated);
  const shuffled = shuffleArray(alive, rng);
  if (roundNum === 1 && shuffled.length > 1 && shuffled[0].role === 'mrwhite') {
    const nonWhiteIdx = shuffled.findIndex((p) => p.role !== 'mrwhite');
    if (nonWhiteIdx > 0) {
      [shuffled[0], shuffled[nonWhiteIdx]] = [shuffled[nonWhiteIdx], shuffled[0]];
    }
  }
  return shuffled.map((p) => p.uid);
}
