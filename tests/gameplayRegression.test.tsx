// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GamePhase, GameSettings } from '../types';
import {
  buildMainRolePool,
  buildSpecialRolePool,
} from '../src/game/roleEngine';
import {
  assignServerRoles,
  buildServerTurnOrder,
  ServerRoomPlayer,
} from '../functions/src/gameLogic';
import { isMrWhiteGuessMatch } from '../src/game/wordEngine';

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('../services/soundService', () => ({
  playSound: vi.fn(),
}));

const mockWordPair = {
  civilianWord: 'قهوه',
  undercoverWord: 'شاي',
  decoys: ['عصير', 'ماء'],
};

vi.mock('../services/geminiService', () => ({
  getRandomWordPair: vi.fn(async () => ({ ...mockWordPair })),
}));

import { useOfflineMatch } from '../hooks/useOfflineMatch';
import { getRandomWordPair } from '../services/geminiService';

const createMemoryStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const baseSettings: GameSettings = {
  mrWhiteCount: 1,
  undercoverCount: 1,
  category: 'standard',
  difficulty: 'easy',
  useSpecialRoles: true,
  selectedSpecialRoles: ['fool', 'boomerang', 'protector', 'justice', 'ghost', 'lovers', 'avenger'],
  gameMode: 'expression',
  turnDurationSeconds: 45,
};

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, idx) => ({
    name: `Agent ${idx + 1}`,
    avatar: '🕵️',
  }));
}

describe('Role Distribution & Scaling Regressions', () => {
  it('handles edge-case player counts, clamps infiltrators, and guarantees at least 1 infiltrator for 3+ players', () => {
    expect(buildMainRolePool(0, 1, 1)).toEqual([]);
    expect(buildMainRolePool(-2, 1, 1)).toEqual([]);

    const zeroConfigPool = buildMainRolePool(4, 0, 0, () => 0.1);
    expect(zeroConfigPool).toHaveLength(4);
    expect(zeroConfigPool.filter((r) => r === 'mrwhite')).toHaveLength(1);
    expect(zeroConfigPool.filter((r) => r === 'citizen')).toHaveLength(3);

    const clampedSix = buildMainRolePool(6, 5, 5, () => 0.2);
    const badCount = clampedSix.filter((r) => r !== 'citizen').length;
    expect(badCount).toBeLessThanOrEqual(2);
    expect(clampedSix.filter((r) => r === 'citizen').length).toBeGreaterThan(badCount);
  });

  it('enforces Lovers 5-player minimum and avoids assigning Mr. Meme to Mr. White', () => {
    const fourPlayers = buildSpecialRolePool(
      ['citizen', 'citizen', 'citizen', 'mrwhite'],
      ['lovers', 'protector'],
      () => 0.2
    );
    expect(fourPlayers.includes('lovers')).toBe(false);
    expect(fourPlayers.includes('protector')).toBe(true);

    const fivePlayers = buildSpecialRolePool(
      ['citizen', 'citizen', 'citizen', 'undercover', 'mrwhite'],
      ['lovers', 'mr_meme'],
      () => 0.4
    );
    expect(fivePlayers.filter((r) => r === 'lovers')).toHaveLength(2);
    const memeIdx = fivePlayers.indexOf('mr_meme');
    expect(memeIdx).toBeGreaterThanOrEqual(0);
    expect(memeIdx).not.toBe(4);
  });

  it('scales online server roles from 3 to 12 players and enforces Round 1 turn order safety', () => {
    for (let count = 3; count <= 12; count++) {
      const uids = Array.from({ length: count }, (_, i) => `u${i}`);
      const roles = assignServerRoles(uids);
      const vals = Object.values(roles);
      const mrWhites = vals.filter((r) => r === 'mrwhite').length;
      const undercovers = vals.filter((r) => r === 'undercover').length;
      const citizens = vals.filter((r) => r === 'citizen').length;

      expect(mrWhites).toBe(1);
      expect(undercovers).toBe(count >= 8 ? 2 : count >= 5 ? 1 : 0);
      expect(citizens).toBe(count - mrWhites - undercovers);
      expect(citizens).toBeGreaterThan(mrWhites + undercovers);
    }

    const serverPlayers: ServerRoomPlayer[] = [
      { uid: 'mw', name: 'MW', avatar: '', isReady: true, isEliminated: false, score: 0, revealedRole: null },
      { uid: 'c1', name: 'C1', avatar: '', isReady: true, isEliminated: true, score: 0, revealedRole: 'citizen' },
      { uid: 'c2', name: 'C2', avatar: '', isReady: true, isEliminated: false, score: 0, revealedRole: null },
      { uid: 'uc', name: 'UC', avatar: '', isReady: true, isEliminated: false, score: 0, revealedRole: null },
    ];
    const rMap = { mw: 'mrwhite', c1: 'citizen', c2: 'citizen', uc: 'undercover' } as const;

    for (let trial = 0; trial < 15; trial++) {
      const round1Order = buildServerTurnOrder(serverPlayers, { ...rMap }, 1);
      expect(round1Order).not.toContain('c1');
      expect(round1Order[0]).not.toBe('mw');
    }

    const round2Order = buildServerTurnOrder(serverPlayers, { ...rMap }, 2);
    expect(round2Order).toHaveLength(3);
    expect(round2Order).not.toContain('c1');
  });
});

describe('Offline Pass & Play Gameplay Regression (useOfflineMatch)', () => {
  let lastNavigatedPhase: GamePhase;
  const navigate = (next: GamePhase) => {
    lastNavigatedPhase = next;
  };
  const t = (k: string) => k;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.mocked(getRandomWordPair).mockResolvedValue({ ...mockWordPair });
    lastNavigatedPhase = GamePhase.SETUP;
  });

  async function setupMatch(
    playerCount: number,
    roles: Array<{ role: string; special?: any }>,
    settingsOverride: Partial<GameSettings> = {}
  ) {
    const hook = renderHook(() => useOfflineMatch({ navigate, t }));

    act(() => {
      hook.result.current.setTempPlayers(makePlayers(playerCount));
    });

    await act(async () => {
      await hook.result.current.handleGameSettingsConfirmed({
        ...baseSettings,
        ...settingsOverride,
      });
    });

    expect(lastNavigatedPhase).toBe(GamePhase.REVEAL);

    act(() => {
      roles.forEach((spec, idx) => {
        hook.result.current.setPlayerRole(idx, spec.role, spec.special ?? null);
      });
    });

    return hook;
  }

  it('preserves multi-round clues and ballots across rounds and supports normalized Arabic Mr. White guess win', async () => {
    const { result } = await setupMatch(5, [
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'undercover' },
      { role: 'mrwhite' },
    ]);

    // Round 1 clues
    act(() => {
      result.current.setDescriptionsLog([
        { round: 1, playerId: 0, playerName: 'Agent 1', playerAvatar: '🕵️', text: 'سائل ساخن' },
        { round: 1, playerId: 3, playerName: 'Agent 4', playerAvatar: '🕵️', text: 'نعناع' },
      ]);
    });

    // Round 1 Secret Vote eliminates Undercover (id 3)
    act(() => {
      result.current.handleVotingComplete({ 0: 3, 1: 3, 2: 3, 3: 0, 4: 0 });
    });
    expect(lastNavigatedPhase).toBe(GamePhase.REVEAL_VOTE_RESULT);

    act(() => {
      result.current.handleRevealNext();
    });
    expect(lastNavigatedPhase).toBe(GamePhase.PLAYING);
    expect(result.current.currentRound).toBe(2);
    expect(result.current.descriptionsLog).toHaveLength(2);

    // Round 2 clues added cleanly without overwriting Round 1 clues
    act(() => {
      result.current.setDescriptionsLog((prev) => [
        ...prev,
        { round: 2, playerId: 0, playerName: 'Agent 1', playerAvatar: '🕵️', text: 'إسبريسو' },
      ]);
    });
    expect(result.current.descriptionsLog).toHaveLength(3);

    // Round 2 votes eliminate Mr. White (id 4) -> transitions to IMPOSTOR_GUESS
    act(() => {
      result.current.handleVotingComplete({ 0: 4, 1: 4, 2: 4, 4: 1 });
    });
    expect(lastNavigatedPhase).toBe(GamePhase.REVEAL_VOTE_RESULT);

    act(() => {
      result.current.handleRevealNext();
    });
    expect(lastNavigatedPhase).toBe(GamePhase.IMPOSTOR_GUESS);

    // Mr. White guesses normalized Arabic variant 'القهوة' vs secretWord 'قهوه'
    const isMatch = isMrWhiteGuessMatch('القهوة', result.current.secretWord);
    expect(isMatch).toBe(true);

    act(() => {
      result.current.handleImpostorGuess(isMatch, 'القهوة');
    });

    expect(lastNavigatedPhase).toBe(GamePhase.RESULT);
    expect(result.current.lastWinner).toBe('impostor');
    expect(result.current.winReason).toBe('impostor_guessed');

    const cf = result.current.latestCaseFile!;
    expect(cf).toBeDefined();
    expect(cf.roundCount).toBe(2);
    expect(cf.rounds[0].clues).toHaveLength(2);
    expect(cf.rounds[1].clues).toHaveLength(1);
    expect(cf.rounds[0].votes.length).toBeGreaterThan(0);
    expect(cf.rounds[1].mrWhiteGuess?.guess).toBe('القهوة');
    expect(cf.rounds[1].mrWhiteGuess?.isCorrect).toBe(true);
  });

  it('records Group Consensus Vote cleanly without fabricating individual ballots or accuracy metrics', async () => {
    const { result } = await setupMatch(3, [
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'mrwhite' },
    ]);

    act(() => {
      result.current.handleVotingComplete({ 0: 2 }, { isGroupVote: true });
    });
    expect(lastNavigatedPhase).toBe(GamePhase.REVEAL_VOTE_RESULT);

    act(() => {
      result.current.handleRevealNext();
    });
    expect(lastNavigatedPhase).toBe(GamePhase.IMPOSTOR_GUESS);

    act(() => {
      result.current.handleImpostorGuess(false, 'شاي');
    });

    expect(lastNavigatedPhase).toBe(GamePhase.RESULT);
    expect(result.current.lastWinner).toBe('citizens');

    const cf = result.current.latestCaseFile!;
    expect(cf.rounds[0].voteMode).toBe('group');
    expect(cf.rounds[0].votes).toEqual([]);
    for (const d of cf.players) {
      expect(d.voteAccuracyStatus).toBe('insufficient_data');
      expect(d.voteAccuracyPct).toBeNull();
    }
  });

  it('allows eliminated Mr. Justice to break voting ties and eliminated Mr. Ghost to cast secret votes', async () => {
    const { result } = await setupMatch(7, [
      { role: 'justice', special: 'justice' },
      { role: 'ghost', special: 'ghost' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'undercover' },
      { role: 'mrwhite' },
    ]);

    // Round 1: eliminate Mr. Justice (id 0)
    act(() => {
      result.current.handleVotingComplete({ 0: 2, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
    });
    act(() => {
      result.current.handleRevealNext();
    });
    expect(result.current.currentRound).toBe(2);
    expect(result.current.players[0].isEliminated).toBe(true);

    // Round 2: tie between player 1 (Mr. Ghost) and player 2 (Citizen) -> even dead Mr. Justice resolves tie!
    act(() => {
      result.current.handleVotingComplete({ 1: 2, 2: 1, 3: 1, 4: 2, 5: 1, 6: 2 });
    });
    expect(result.current.pendingTieCandidates).toEqual([1, 2]);

    act(() => {
      result.current.resolveTieWithJustice(1);
    });
    expect(result.current.pendingTieCandidates).toBeNull();
    expect(lastNavigatedPhase).toBe(GamePhase.REVEAL_VOTE_RESULT);

    // Eliminate Mr. Ghost (id 1) -> 3 citizens vs 2 infiltrators remains active in Round 3
    act(() => {
      result.current.handleRevealNext();
    });
    expect(result.current.currentRound).toBe(3);
    expect(result.current.players[1].isEliminated).toBe(true);

    // Round 3: Dead Mr. Ghost casts secret vote helping break toward Undercover (id 5)
    act(() => {
      result.current.handleVotingComplete({ 1: 5, 2: 5, 3: 5, 4: 6, 5: 2, 6: 2 });
    });
    expect(result.current.mostVotedPlayerId).toBe(5);
    expect(lastNavigatedPhase).toBe(GamePhase.REVEAL_VOTE_RESULT);

    act(() => {
      result.current.handleRevealNext();
    });
    expect(result.current.currentRound).toBe(4);

    // Round 4: eliminate Mr. White (id 6) and miss guess -> end match to inspect Case File
    act(() => {
      result.current.handleVotingComplete({ 1: 6, 2: 6, 3: 6, 4: 6, 6: 2 });
    });
    act(() => {
      result.current.handleRevealNext();
    });
    act(() => {
      result.current.handleImpostorGuess(false, 'ماء');
    });

    const cf = result.current.latestCaseFile!;
    expect(cf.specialEvents.some((e) => e.type === 'justice_tiebreak')).toBe(true);
    expect(cf.specialEvents.some((e) => e.type === 'ghost_vote' && e.actorId === '1')).toBe(true);
    const ghostAward = cf.awards.find((a) => a.awardId === 'GHOST_PROTOCOL');
    expect(ghostAward?.status).toBe('awarded');
    expect(ghostAward?.recipientId).toBe('1');
  });

  it('enforces Mr. Shield explicit protection and Mr. Boomerang bounce + second-time elimination + Group prompt', async () => {
    // 1. Secret vote: Mr. Shield protects target -> no elimination
    const { result } = await setupMatch(4, [
      { role: 'protector', special: 'protector' },
      { role: 'boomerang', special: 'boomerang' },
      { role: 'citizen' },
      { role: 'mrwhite' },
    ]);

    act(() => {
      result.current.handleVotingComplete(
        { 0: 2, 1: 2, 2: 3, 3: 2 },
        { shieldedTargetId: 2 }
      );
    });
    expect(result.current.blockedBySpecial).toBe('protector');
    expect(result.current.mostVotedPlayerId).toBe(2);

    act(() => {
      result.current.handleRevealNext();
    });
    expect(result.current.currentRound).toBe(2);
    expect(result.current.players[2].isEliminated).toBe(false);
    expect(result.current.players[0].specialAbilityUsed).toBe(true);

    // 2. Secret vote: Mr. Boomerang (id 1) gets majority voted by Mr. White (id 3) -> bounces onto Mr. White!
    const bounceRun = await setupMatch(4, [
      { role: 'citizen' },
      { role: 'boomerang', special: 'boomerang' },
      { role: 'citizen' },
      { role: 'mrwhite' },
    ]);

    act(() => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.99);
      bounceRun.result.current.handleVotingComplete({ 0: 1, 1: 0, 2: 3, 3: 1 });
    });
    // Tally: 1 has 2 votes (from 0 and 3). nonSelfVoters = [0, 3]. Math.random = 0.99 picks index 1 -> id 3 (Mr. White)!
    expect(bounceRun.result.current.bouncedFromName).toBe('Agent 2');
    expect(bounceRun.result.current.mostVotedPlayerId).toBe(3);

    act(() => {
      bounceRun.result.current.handleRevealNext();
    });
    expect(lastNavigatedPhase).toBe(GamePhase.IMPOSTOR_GUESS);

    // Cancel into Wrong Guess -> Citizens win; verify second-time vulnerability via Group Vote Boomerang test below
    vi.restoreAllMocks();

    // 3. Group Vote Boomerang prompt & second-time elimination
    const groupBoom = await setupMatch(5, [
      { role: 'citizen' },
      { role: 'boomerang', special: 'boomerang' },
      { role: 'citizen' },
      { role: 'undercover' },
      { role: 'mrwhite' },
    ]);

    act(() => {
      groupBoom.result.current.handleVotingComplete({ 0: 1 }, { isGroupVote: true });
    });
    expect(groupBoom.result.current.pendingBoomerangId).toBe(1);

    act(() => {
      // Boomerang chooses citizen id 2 instead of self
      groupBoom.result.current.handleBoomerangTargetPick(2);
    });
    expect(groupBoom.result.current.pendingBoomerangId).toBeNull();
    expect(groupBoom.result.current.mostVotedPlayerId).toBe(2);

    act(() => {
      groupBoom.result.current.handleRevealNext();
    });
    expect(groupBoom.result.current.players[2].isEliminated).toBe(true);
    expect(groupBoom.result.current.players[1].isEliminated).toBe(false);
    expect(groupBoom.result.current.players[1].specialAbilityUsed).toBe(true);

    // Round 2: Voting Boomerang a second time eliminates Boomerang without bouncing
    act(() => {
      groupBoom.result.current.handleVotingComplete({ 0: 1 }, { isGroupVote: true });
    });
    expect(groupBoom.result.current.pendingBoomerangId).toBeNull();
    expect(groupBoom.result.current.mostVotedPlayerId).toBe(1);

    act(() => {
      groupBoom.result.current.handleRevealNext();
    });
    expect(groupBoom.result.current.players[1].isEliminated).toBe(true);
  });

  it('triggers Mr. Avenger retaliation onto Mr. White even when decoys array is empty, and chains Lovers heartbreak', async () => {
    // 1. Empty decoys: Mr. Avenger targets Mr. White -> IMPOSTOR_GUESS must still trigger
    vi.mocked(getRandomWordPair).mockResolvedValueOnce({
      civilianWord: 'شمس',
      undercoverWord: 'قمر',
      decoys: [],
    });

    const avengerMatch = await setupMatch(5, [
      { role: 'avenger', special: 'avenger' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'mrwhite' },
    ]);

    expect(avengerMatch.result.current.relatedWords).toEqual([]);

    act(() => {
      avengerMatch.result.current.handleVotingComplete({ 1: 0 }, { isGroupVote: true });
    });
    act(() => {
      avengerMatch.result.current.handleRevealNext();
    });
    expect(avengerMatch.result.current.pendingAvengerId).toBe(0);

    act(() => {
      avengerMatch.result.current.handleAvengerTargetPick(4);
    });
    expect(avengerMatch.result.current.pendingAvengerId).toBeNull();
    expect(lastNavigatedPhase).toBe(GamePhase.IMPOSTOR_GUESS);

    act(() => {
      avengerMatch.result.current.handleImpostorGuess(false, 'نجم');
    });
    expect(lastNavigatedPhase).toBe(GamePhase.RESULT);
    expect(avengerMatch.result.current.lastWinner).toBe('citizens');
    expect(
      avengerMatch.result.current.latestCaseFile?.specialEvents.some(
        (e) => e.type === 'avenger_strike' && e.targetId === '4'
      )
    ).toBe(true);

    // 2. Avenger targets linked Lover -> chains lovers_heartbreak to partner
    const avengerToLover = await setupMatch(5, [
      { role: 'avenger', special: 'avenger' },
      { role: 'lovers', special: 'lovers' }, // id 1
      { role: 'lovers', special: 'lovers' }, // id 2 linked to id 1
      { role: 'citizen' },
      { role: 'mrwhite' },
    ]);

    act(() => {
      avengerToLover.result.current.handleVotingComplete({ 1: 0 }, { isGroupVote: true });
    });
    act(() => {
      avengerToLover.result.current.handleRevealNext();
    });
    expect(avengerToLover.result.current.pendingAvengerId).toBe(0);

    act(() => {
      avengerToLover.result.current.handleAvengerTargetPick(1);
    });
    // Avenger (0), Lover 1 (1), and Lover 2 (2) are all eliminated -> 1 citizen vs 1 Mr. White => Impostor wins!
    expect(lastNavigatedPhase).toBe(GamePhase.RESULT);
    expect(avengerToLover.result.current.lastWinner).toBe('impostor');
    expect(
      avengerToLover.result.current.latestCaseFile?.specialEvents.some(
        (e) => e.type === 'lovers_heartbreak' && e.targetId === '2'
      )
    ).toBe(true);
  });

  it('awards Mr. Joy +4 bonus only on the very first elimination of the match', async () => {
    // First exit = Mr. Joy (gets +4)
    const firstExitJoy = await setupMatch(4, [
      { role: 'fool', special: 'fool' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'mrwhite' },
    ]);

    act(() => {
      firstExitJoy.result.current.handleVotingComplete({ 1: 0 }, { isGroupVote: true });
    });
    expect(firstExitJoy.result.current.foolBonusTriggered).toBe(true);

    act(() => {
      firstExitJoy.result.current.handleRevealNext();
    });
    expect(firstExitJoy.result.current.players[0].foolBonusAwarded).toBe(true);
    expect(lastNavigatedPhase).toBe(GamePhase.PLAYING);

    // Now catch Mr. White (id 3)
    act(() => {
      firstExitJoy.result.current.handleVotingComplete({ 1: 3 }, { isGroupVote: true });
    });
    act(() => {
      firstExitJoy.result.current.handleRevealNext();
    });
    act(() => {
      firstExitJoy.result.current.handleImpostorGuess(false, 'ماء');
    });

    const firstJoyDossier = firstExitJoy.result.current.latestCaseFile!.players[0];
    expect(firstJoyDossier.pointsEarned).toBe(6); // 2 Citizen win + 4 Mr. Joy bonus

    // Non-first exit = Mr. Joy (gets 0 bonus)
    const lateExitJoy = await setupMatch(5, [
      { role: 'fool', special: 'fool' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'citizen' },
      { role: 'mrwhite' },
    ]);

    // Round 1: eliminate citizen id 1 first
    act(() => {
      lateExitJoy.result.current.handleVotingComplete({ 0: 1 }, { isGroupVote: true });
    });
    act(() => {
      lateExitJoy.result.current.handleRevealNext();
    });
    expect(lateExitJoy.result.current.players[1].isEliminated).toBe(true);

    // Round 2: eliminate Mr. Joy id 0 (NOT first exit!)
    act(() => {
      lateExitJoy.result.current.handleVotingComplete({ 2: 0 }, { isGroupVote: true });
    });
    expect(lateExitJoy.result.current.foolBonusTriggered).toBe(false);

    act(() => {
      lateExitJoy.result.current.handleRevealNext();
    });
    expect(lateExitJoy.result.current.players[0].foolBonusAwarded).toBe(false);

    // Round 3: catch Mr. White (id 4)
    act(() => {
      lateExitJoy.result.current.handleVotingComplete({ 2: 4 }, { isGroupVote: true });
    });
    act(() => {
      lateExitJoy.result.current.handleRevealNext();
    });
    act(() => {
      lateExitJoy.result.current.handleImpostorGuess(false, 'ماء');
    });

    const lateJoyDossier = lateExitJoy.result.current.latestCaseFile!.players[0];
    expect(lateJoyDossier.pointsEarned).toBe(2); // Citizen win only, zero Mr. Joy bonus
  });
});
