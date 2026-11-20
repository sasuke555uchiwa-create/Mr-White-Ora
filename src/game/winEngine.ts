import { Player } from '../../types';

export type WinningFaction = 'citizens' | 'undercover_solo' | 'mrwhite_solo' | 'both';

export interface WinEvaluationResult {
  isOver: boolean;
  winner: 'citizens' | 'impostor' | null;
  winReason: 'impostor_caught' | 'citizens_wrong_vote' | null;
  aliveCitizens: number;
  aliveInfiltrators: number;
}

export function evaluateWinCondition(
  players: readonly Pick<Player, 'role' | 'isEliminated'>[]
): WinEvaluationResult {
  const alive = players.filter((p) => !p.isEliminated);
  const aliveCitizens = alive.filter(
    (p) => p.role !== 'mrwhite' && p.role !== 'undercover'
  ).length;
  const aliveInfiltrators = alive.filter(
    (p) => p.role === 'mrwhite' || p.role === 'undercover'
  ).length;

  if (aliveInfiltrators === 0) {
    return {
      isOver: true,
      winner: 'citizens',
      winReason: 'impostor_caught',
      aliveCitizens,
      aliveInfiltrators,
    };
  }

  if (aliveInfiltrators >= aliveCitizens || aliveCitizens <= 1) {
    return {
      isOver: true,
      winner: 'impostor',
      winReason: 'citizens_wrong_vote',
      aliveCitizens,
      aliveInfiltrators,
    };
  }

  return {
    isOver: false,
    winner: null,
    winReason: null,
    aliveCitizens,
    aliveInfiltrators,
  };
}

export function resolveWinningFaction(
  players: readonly Pick<Player, 'role' | 'isEliminated'>[],
  roundWinner: 'impostor' | 'citizens' | 'fool' | null,
  winReason?: 'impostor_guessed' | 'citizens_wrong_vote' | 'impostor_caught' | 'fool_won' | string | null
): WinningFaction {
  if (!roundWinner || roundWinner === 'citizens' || roundWinner === 'fool') {
    return 'citizens';
  }

  if (winReason === 'impostor_guessed') {
    return 'mrwhite_solo';
  }

  const aliveMrWhite = players.some((p) => !p.isEliminated && p.role === 'mrwhite');
  const aliveUndercover = players.some((p) => !p.isEliminated && p.role === 'undercover');

  if (aliveMrWhite && aliveUndercover) return 'both';
  if (aliveMrWhite) return 'mrwhite_solo';
  if (aliveUndercover) return 'undercover_solo';

  const hasMrWhite = players.some((p) => p.role === 'mrwhite');
  const hasUndercover = players.some((p) => p.role === 'undercover');
  if (hasMrWhite && hasUndercover) return 'both';
  if (hasMrWhite) return 'mrwhite_solo';
  return 'undercover_solo';
}

export function getPlayerRoundPoints(
  player: Pick<Player, 'id' | 'role' | 'isEliminated' | 'foolBonusAwarded'>,
  players: readonly Pick<Player, 'id' | 'role' | 'isEliminated'>[],
  roundWinner: 'impostor' | 'citizens' | 'fool' | null,
  winReason?: 'impostor_guessed' | 'citizens_wrong_vote' | 'impostor_caught' | 'fool_won' | string | null,
  winningMrWhiteId?: number | null
): number {
  if (!roundWinner) {
    return player.foolBonusAwarded ? 4 : 0;
  }

  let points = 0;
  const faction = resolveWinningFaction(players, roundWinner, winReason);

  if (faction === 'citizens') {
    if (player.role !== 'mrwhite' && player.role !== 'undercover') {
      points += 2;
    }
  } else if (winReason === 'impostor_guessed') {
    const isGuesser =
      winningMrWhiteId !== null && winningMrWhiteId !== undefined
        ? player.id === winningMrWhiteId
        : !player.isEliminated && player.role === 'mrwhite';
    if (isGuesser) {
      points += 6;
    }
  } else if (faction === 'both') {
    if (!player.isEliminated && player.role === 'mrwhite') {
      points += 12;
    } else if (!player.isEliminated && player.role === 'undercover') {
      points += 10;
    }
  } else if (faction === 'mrwhite_solo') {
    if (!player.isEliminated && player.role === 'mrwhite') {
      points += 12;
    }
  } else if (faction === 'undercover_solo') {
    if (!player.isEliminated && player.role === 'undercover') {
      points += 10;
    }
  }

  if (player.foolBonusAwarded) {
    points += 4;
  }

  return points;
}
