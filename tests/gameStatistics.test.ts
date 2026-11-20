import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeGameStatistics,
  createEmptySessionStatsSnapshot,
  formatWinLossRatio,
} from '../src/game/statsEngine';

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

describe('statsEngine', () => {
  it('formats win/loss ratios cleanly across zero, undefeated, and mixed records', () => {
    expect(formatWinLossRatio(0, 0)).toEqual({ value: 0, label: '0.00' });
    expect(formatWinLossRatio(4, 0)).toEqual({ value: 4, label: '4:0' });
    expect(formatWinLossRatio(3, 2)).toEqual({ value: 1.5, label: '1.50' });
  });

  it('computes combined, online-only, and local Pass & Play statistics with favorite role ranking', () => {
    const snapshot = createEmptySessionStatsSnapshot();
    snapshot.onlinePlayed = 4;
    snapshot.onlineWins = 3;
    snapshot.onlineLosses = 1;
    snapshot.onlineRoleStats = {
      citizen: { played: 2, wins: 2 },
      mrwhite: { played: 2, wins: 1 },
    };
    snapshot.offlineMatchesCount = 2;
    snapshot.offlineRoleStats = {
      undercover: { played: 2, wins: 2 },
      fool: { played: 1, wins: 1 },
    };
    snapshot.offlinePlayers = {
      Sami: {
        name: 'Sami',
        played: 2,
        wins: 2,
        losses: 0,
        currentStreak: 2,
        bestStreak: 2,
        roleStats: {
          undercover: { played: 2, wins: 2 },
        },
      },
      Lina: {
        name: 'Lina',
        played: 2,
        wins: 1,
        losses: 1,
        currentStreak: 0,
        bestStreak: 1,
        roleStats: {
          citizen: { played: 1, wins: 0 },
          fool: { played: 1, wins: 1 },
        },
      },
    };

    const serverStats = {
      wins: 4,
      hosted: 2,
      played: 6,
      longestStreak: 3,
      currentStreak: 1,
      roleStats: {
        citizen: { played: 4, wins: 3 },
        mrwhite: { played: 2, wins: 1 },
      },
    };

    const onlineOnly = computeGameStatistics({
      filter: 'online',
      serverStats,
      sessionStats: snapshot,
    });
    expect(onlineOnly.played).toBe(6);
    expect(onlineOnly.wins).toBe(4);
    expect(onlineOnly.losses).toBe(2);
    expect(onlineOnly.winLossRatioLabel).toBe('2.00');
    expect(onlineOnly.favoriteRole?.role).toBe('citizen');
    expect(onlineOnly.favoriteRole?.winRate).toBe(75);

    const localSami = computeGameStatistics({
      filter: 'local',
      serverStats,
      sessionStats: snapshot,
      localPlayerFilter: 'Sami',
    });
    expect(localSami.played).toBe(2);
    expect(localSami.wins).toBe(2);
    expect(localSami.losses).toBe(0);
    expect(localSami.winLossRatioLabel).toBe('2:0');
    expect(localSami.favoriteRole?.role).toBe('undercover');

    const combined = computeGameStatistics({
      filter: 'all',
      serverStats,
      sessionStats: snapshot,
    });
    expect(combined.played).toBe(10);
    expect(combined.wins).toBe(7);
    expect(combined.losses).toBe(3);
    expect(combined.favoriteRole?.role).toBe('citizen');
  });
});

describe('storageService cross-session statistics persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  it('deduplicates repeated match keys and persists online & offline session outcomes across reloads', async () => {
    const storage = await import('../services/storageService');

    storage.recordOnlineSessionMatch({
      uid: 'u_1',
      matchKey: 'roomA:match1',
      role: 'mrwhite',
      won: true,
    });
    // Duplicate recording for same matchKey must be ignored
    storage.recordOnlineSessionMatch({
      uid: 'u_1',
      matchKey: 'roomA:match1',
      role: 'mrwhite',
      won: true,
    });

    storage.recordOfflineSessionMatch({
      matchKey: 'offline_1',
      uid: 'u_1',
      outcomes: [
        { name: 'Ali', role: 'citizen', specialRole: 'protector', won: true },
        { name: 'Nour', role: 'undercover', won: false },
      ],
    });

    const stats = storage.getSessionStats('u_1');
    expect(stats.onlinePlayed).toBe(1);
    expect(stats.onlineWins).toBe(1);
    expect(stats.onlineRoleStats.mrwhite).toEqual({ played: 1, wins: 1 });
    expect(stats.offlineMatchesCount).toBe(1);
    expect(stats.offlinePlayers.Ali.wins).toBe(1);
    expect(stats.offlinePlayers.Ali.roleStats.protector).toEqual({ played: 1, wins: 1 });
    expect(stats.offlinePlayers.Nour.losses).toBe(1);

    const afterClear = storage.clearLocalSessionStats('u_1');
    expect(afterClear.offlineMatchesCount).toBe(0);
    expect(afterClear.offlinePlayers).toEqual({});
    expect(afterClear.onlinePlayed).toBe(1);
  });

  it('preserves online match deduplication across 130+ offline matches and trusts cloud roleStats when caught up', async () => {
    const storage = await import('../services/storageService');

    storage.recordOnlineSessionMatch({
      uid: 'u_2',
      matchKey: 'roomZ:match99',
      role: 'mrwhite',
      won: true,
    });

    for (let i = 0; i < 130; i += 1) {
      storage.recordOfflineSessionMatch({
        uid: 'u_2',
        matchKey: `offline_${i}`,
        outcomes: [{ name: 'PlayerA', role: 'citizen', won: true }],
      });
    }

    // Re-recording the same online matchKey must still be ignored after >120 offline matches
    storage.recordOnlineSessionMatch({
      uid: 'u_2',
      matchKey: 'roomZ:match99',
      role: 'mrwhite',
      won: true,
    });

    const snap = storage.getSessionStats('u_2');
    expect(snap.onlinePlayed).toBe(1);
    expect(snap.onlineWins).toBe(1);

    // When cloud profile.stats is caught up with local onlinePlayed, cloud roleStats wins even if stale local has extra bogus counts
    snap.onlineRoleStats = {
      citizen: { played: 99, wins: 99 },
    };
    const cloudStats = {
      played: 5,
      wins: 3,
      hosted: 1,
      longestStreak: 2,
      currentStreak: 1,
      roleStats: {
        undercover: { played: 5, wins: 3 },
      },
    };
    const resolved = computeGameStatistics({
      filter: 'online',
      serverStats: cloudStats,
      sessionStats: snap,
    });
    expect(resolved.favoriteRole?.role).toBe('undercover');
    expect(resolved.roles).toHaveLength(1);
    expect(resolved.roles[0].played).toBe(5);
  });
});
