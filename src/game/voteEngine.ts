import { Player } from '../../types';

export interface VoteTallyResult<TId extends string | number> {
  counts: Record<string, number>;
  maxVotes: number;
  candidates: TId[];
  isTie: boolean;
}

export function tallyVotes<TId extends string | number>(
  votes: Record<string, TId>,
  validVoterIds?: Set<string>,
  validTargetIds?: Set<string>
): VoteTallyResult<TId> {
  const counts: Record<string, number> = {};
  const targetValues = new Map<string, TId>();

  Object.entries(votes).forEach(([voterKey, targetId]) => {
    const targetKey = String(targetId);
    if (validVoterIds && !validVoterIds.has(voterKey)) return;
    if (validTargetIds && !validTargetIds.has(targetKey)) return;
    counts[targetKey] = (counts[targetKey] || 0) + 1;
    targetValues.set(targetKey, targetId);
  });

  let maxVotes = 0;
  let candidateKeys: string[] = [];

  Object.entries(counts).forEach(([targetKey, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      candidateKeys = [targetKey];
    } else if (count === maxVotes) {
      candidateKeys.push(targetKey);
    }
  });

  const candidates = candidateKeys
    .map((k) => targetValues.get(k))
    .filter((v): v is TId => v !== undefined);

  return {
    counts,
    maxVotes,
    candidates,
    isTie: candidates.length > 1,
  };
}

export function hasSpecialRole(player: Pick<Player, 'role' | 'specialRole'> | undefined, roleId: string): boolean {
  if (!player) return false;
  return player.specialRole === roleId || player.role === roleId;
}

export function checkShieldProtection(
  players: readonly Player[],
  targetId: number,
  shieldedTargetId?: number | null
): { protected: boolean; shieldHolderId: number | null } {
  const unusedProtector = players.find(
    (p) => !p.isEliminated && hasSpecialRole(p, 'protector') && !p.specialAbilityUsed
  );
  if (!unusedProtector) {
    return { protected: false, shieldHolderId: null };
  }

  // Secret ballot explicit protection target
  if (shieldedTargetId !== null && shieldedTargetId !== undefined) {
    return {
      protected: targetId === shieldedTargetId,
      shieldHolderId: unusedProtector.id,
    };
  }

  // Group vote passive auto-protection when owner is targeted
  if (targetId === unusedProtector.id) {
    return {
      protected: true,
      shieldHolderId: unusedProtector.id,
    };
  }

  return { protected: false, shieldHolderId: null };
}

export function checkFoolFirstExitBonus(
  players: readonly Player[],
  eliminatedId: number
): boolean {
  const isFirstElimination = !players.some((p) => p.isEliminated);
  if (!isFirstElimination) return false;
  const target = players.find((p) => p.id === eliminatedId);
  return hasSpecialRole(target, 'fool');
}

export function getLinkedLoverPartnerId(
  players: readonly Player[],
  eliminatedId: number
): number | undefined {
  const target = players.find((p) => p.id === eliminatedId);
  if (!hasSpecialRole(target, 'lovers')) return undefined;
  return target?.loverPartnerId;
}
