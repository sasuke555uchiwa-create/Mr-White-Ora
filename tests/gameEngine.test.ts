import { describe, it, expect } from 'vitest';
import {
  normalizeGuessWord,
  isMrWhiteGuessMatch,
  pickWordPairFromData,
} from '../src/game/wordEngine';
import {
  computeOnlineRoleCounts,
  buildMainRolePool,
  buildSpecialRolePool,
  assignOnlineRoles,
  buildOnlineTurnOrder,
} from '../src/game/roleEngine';
import {
  tallyVotes,
  checkShieldProtection,
  checkFoolFirstExitBonus,
  getLinkedLoverPartnerId,
} from '../src/game/voteEngine';
import {
  evaluateWinCondition,
  resolveWinningFaction,
  getPlayerRoundPoints,
} from '../src/game/winEngine';
import type { Player } from '../types';

const makePlayer = (
  id: number,
  role: Player['role'],
  overrides: Partial<Player> = {}
): Player => ({
  id,
  name: `Player ${id}`,
  role,
  isImpostor: role === 'mrwhite' || role === 'undercover',
  score: 0,
  avatar: '👤',
  isEliminated: false,
  ...overrides,
});

describe('wordEngine', () => {
  it('normalizes Arabic diacritics, Alef variants, Teh Marbuta, and leading ال', () => {
    expect(normalizeGuessWord('  القَهوَةُ ')).toBe('قهوه');
    expect(normalizeGuessWord('أحمد')).toBe('احمد');
    expect(normalizeGuessWord('مُستَشفَى')).toBe('مستشفي');
  });

  it('matches Mr. White guesses across Arabic/Latin variants and rejects empty or wrong guesses', () => {
    expect(isMrWhiteGuessMatch('القهوة', 'قهوه')).toBe(true);
    expect(isMrWhiteGuessMatch('  apple ', 'APPLE')).toBe(true);
    expect(isMrWhiteGuessMatch('', 'apple')).toBe(false);
    expect(isMrWhiteGuessMatch('شاي', 'قهوة')).toBe(false);
  });

  it('filters hidden words and incorporates matching custom word pairs', () => {
    const data = {
      ar: {
        standard: [
          ['تفاح', 'برتقال'] as [string, string],
          ['بحر', 'نهر'] as [string, string],
        ],
      },
    };
    const res = pickWordPairFromData(
      data,
      'ar',
      'standard',
      [{ word1: 'قهوة', word2: 'شاي', language: 'ar', category: 'standard' }],
      ['تفاح', 'بحر'],
      () => 0.1
    );
    expect([res.civilianWord, res.undercoverWord].sort()).toEqual(['شاي', 'قهوة'].sort());
  });
});

describe('roleEngine', () => {
  it('computes online role counts according to room size thresholds', () => {
    expect(computeOnlineRoleCounts(3)).toEqual({ civilians: 2, undercover: 0, mrwhite: 1 });
    expect(computeOnlineRoleCounts(5)).toEqual({ civilians: 3, undercover: 1, mrwhite: 1 });
    expect(computeOnlineRoleCounts(8)).toEqual({ civilians: 5, undercover: 2, mrwhite: 1 });
  });

  it('clamps infiltrator counts so civilians always retain majority', () => {
    const pool = buildMainRolePool(5, 4, 4, () => 0.25);
    const badCount = pool.filter((r) => r === 'mrwhite' || r === 'undercover').length;
    expect(pool).toHaveLength(5);
    expect(badCount).toBeLessThanOrEqual(2);
  });

  it('requires at least 5 players for Lovers and avoids giving Mr. Meme to Mr. White', () => {
    const smallSpecials = buildSpecialRolePool(
      ['citizen', 'citizen', 'citizen', 'mrwhite'],
      ['lovers'],
      () => 0.4
    );
    expect(smallSpecials.filter((r) => r === 'lovers')).toHaveLength(0);

    const fiveSpecials = buildSpecialRolePool(
      ['citizen', 'citizen', 'citizen', 'undercover', 'mrwhite'],
      ['lovers', 'mr_meme'],
      () => 0.3
    );
    expect(fiveSpecials.filter((r) => r === 'lovers')).toHaveLength(2);
    const memeIndex = fiveSpecials.indexOf('mr_meme');
    expect(memeIndex).toBeGreaterThanOrEqual(0);
    expect(['citizen', 'undercover', 'mrwhite'][memeIndex] === 'mrwhite' ? false : true).toBe(true);
    expect(['citizen', 'citizen', 'citizen', 'undercover', 'mrwhite'][memeIndex]).not.toBe('mrwhite');
  });

  it('assigns online roles for every uid and prevents Mr. White from going first in Round 1', () => {
    const roles = assignOnlineRoles(['u1', 'u2', 'u3', 'u4', 'u5'], () => 0.49);
    expect(Object.keys(roles)).toHaveLength(5);

    const turnOrder = buildOnlineTurnOrder(
      [
        { uid: 'mw', role: 'mrwhite' },
        { uid: 'c1', role: 'citizen' },
        { uid: 'c2', role: 'citizen' },
      ],
      1,
      () => 0 // deterministic: mrwhite starts at index 0 before swap
    );
    expect(turnOrder[0]).not.toBe('mw');
  });
});

describe('voteEngine', () => {
  it('tallies votes, detects ties, and ignores invalid voters or targets', () => {
    const result = tallyVotes<number>(
      { '1': 3, '2': 3, '4': 2, '999': 2 },
      new Set(['1', '2', '3', '4']),
      new Set(['1', '2', '3', '4'])
    );
    expect(result.counts).toEqual({ '3': 2, '2': 1 });
    expect(result.candidates).toEqual([3]);
    expect(result.isTie).toBe(false);

    const tied = tallyVotes<number>({ '1': 2, '2': 3 });
    expect(tied.isTie).toBe(true);
    expect(tied.candidates).toEqual([2, 3]);
  });

  it('handles Protector explicit target and group self-shield, Fool first exit, and Lovers partner link', () => {
    const players: Player[] = [
      makePlayer(1, 'citizen', { specialRole: 'protector' }),
      makePlayer(2, 'citizen', { specialRole: 'fool' }),
      makePlayer(3, 'citizen', { specialRole: 'lovers', loverPartnerId: 4 }),
      makePlayer(4, 'undercover', { specialRole: 'lovers', loverPartnerId: 3 }),
    ];

    expect(checkShieldProtection(players, 2, 2)).toEqual({ protected: true, shieldHolderId: 1 });
    expect(checkShieldProtection(players, 1, undefined)).toEqual({ protected: true, shieldHolderId: 1 });
    expect(checkShieldProtection(players, 3, undefined)).toEqual({ protected: false, shieldHolderId: null });

    expect(checkFoolFirstExitBonus(players, 2)).toBe(true);
    const afterElim = players.map((p) => (p.id === 3 ? { ...p, isEliminated: true } : p));
    expect(checkFoolFirstExitBonus(afterElim, 2)).toBe(false);

    expect(getLinkedLoverPartnerId(players, 3)).toBe(4);
    expect(getLinkedLoverPartnerId(players, 2)).toBeUndefined();
  });
});

describe('winEngine & official scoring rules', () => {
  it('awards +10 to Undercover solo win and 0 to eliminated Mr. White', () => {
    const players: Player[] = [
      makePlayer(1, 'citizen', { isEliminated: true }),
      makePlayer(2, 'citizen'),
      makePlayer(3, 'mrwhite', { isEliminated: true }),
      makePlayer(4, 'undercover'),
    ];
    const evalRes = evaluateWinCondition(players);
    expect(evalRes.isOver).toBe(true);
    expect(evalRes.winner).toBe('impostor');
    expect(resolveWinningFaction(players, 'impostor', evalRes.winReason)).toBe('undercover_solo');

    expect(getPlayerRoundPoints(players[3], players, 'impostor', evalRes.winReason)).toBe(10);
    expect(getPlayerRoundPoints(players[2], players, 'impostor', evalRes.winReason)).toBe(0);
    expect(getPlayerRoundPoints(players[1], players, 'impostor', evalRes.winReason)).toBe(0);
  });

  it('awards +12 to Mr. White solo elimination win and 0 to eliminated Undercover', () => {
    const players: Player[] = [
      makePlayer(1, 'citizen', { isEliminated: true }),
      makePlayer(2, 'citizen'),
      makePlayer(3, 'mrwhite'),
      makePlayer(4, 'undercover', { isEliminated: true }),
    ];
    const evalRes = evaluateWinCondition(players);
    expect(evalRes.isOver).toBe(true);
    expect(evalRes.winner).toBe('impostor');
    expect(resolveWinningFaction(players, 'impostor', evalRes.winReason)).toBe('mrwhite_solo');

    expect(getPlayerRoundPoints(players[2], players, 'impostor', evalRes.winReason)).toBe(12);
    expect(getPlayerRoundPoints(players[3], players, 'impostor', evalRes.winReason)).toBe(0);
  });

  it('awards +12 to surviving Mr. White and +10 to surviving Undercover when both win together', () => {
    const players: Player[] = [
      makePlayer(1, 'citizen', { isEliminated: true }),
      makePlayer(2, 'citizen'),
      makePlayer(3, 'mrwhite'),
      makePlayer(4, 'undercover'),
    ];
    const evalRes = evaluateWinCondition(players);
    expect(evalRes.isOver).toBe(true);
    expect(resolveWinningFaction(players, 'impostor', evalRes.winReason)).toBe('both');

    expect(getPlayerRoundPoints(players[2], players, 'impostor', evalRes.winReason)).toBe(12);
    expect(getPlayerRoundPoints(players[3], players, 'impostor', evalRes.winReason)).toBe(10);
  });

  it('awards +6 only to the Mr. White who guessed the word', () => {
    const players: Player[] = [
      makePlayer(1, 'citizen'),
      makePlayer(2, 'citizen'),
      makePlayer(3, 'mrwhite', { isEliminated: true }),
      makePlayer(4, 'undercover'),
    ];
    expect(getPlayerRoundPoints(players[2], players, 'impostor', 'impostor_guessed', 3)).toBe(6);
    expect(getPlayerRoundPoints(players[3], players, 'impostor', 'impostor_guessed', 3)).toBe(0);
  });

  it('awards +2 to all Citizens on citizen win and +4 Fool bonus independently', () => {
    const players: Player[] = [
      makePlayer(1, 'citizen'),
      makePlayer(2, 'citizen', { specialRole: 'fool', isEliminated: true, foolBonusAwarded: true }),
      makePlayer(3, 'mrwhite', { isEliminated: true }),
    ];
    const evalRes = evaluateWinCondition(players);
    expect(evalRes.winner).toBe('citizens');
    expect(getPlayerRoundPoints(players[0], players, 'citizens', evalRes.winReason)).toBe(2);
    expect(getPlayerRoundPoints(players[1], players, 'citizens', evalRes.winReason)).toBe(6);
    expect(getPlayerRoundPoints(players[2], players, 'citizens', evalRes.winReason)).toBe(0);
  });
});
