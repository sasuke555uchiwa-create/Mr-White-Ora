export interface ProfileStatsPayload {
  wins: number;
  hosted: number;
  played: number;
  longestStreak: number;
  currentStreak?: number;
  roleStats?: Record<string, { played: number; wins: number }>;
}

export interface PublicProfileBackfillPayload {
  uid: string;
  displayName: string;
  photoURL: string;
  xp: number;
  level: number;
  stats: ProfileStatsPayload;
}

/**
 * Synchronizes a missing publicProfiles/{uid} record strictly from an existing
 * users/{uid} document without zeroing out earned progression or leaderboard stats.
 */
export function buildPublicProfileBackfill(
  uid: string,
  userData: {
    displayName?: string;
    photoURL?: string;
    xp?: number;
    level?: number;
    stats?: Partial<ProfileStatsPayload>;
  }
): Omit<PublicProfileBackfillPayload, 'updatedAt'> {
  const rawStats = userData.stats;
  const stats: ProfileStatsPayload = rawStats
    ? {
        wins: typeof rawStats.wins === 'number' && rawStats.wins >= 0 ? rawStats.wins : 0,
        hosted: typeof rawStats.hosted === 'number' && rawStats.hosted >= 0 ? rawStats.hosted : 0,
        played: typeof rawStats.played === 'number' && rawStats.played >= 0 ? rawStats.played : 0,
        longestStreak:
          typeof rawStats.longestStreak === 'number' && rawStats.longestStreak >= 0
            ? rawStats.longestStreak
            : 0,
        ...(typeof rawStats.currentStreak === 'number' && rawStats.currentStreak >= 0
          ? { currentStreak: rawStats.currentStreak }
          : {}),
        ...(rawStats.roleStats && typeof rawStats.roleStats === 'object'
          ? { roleStats: rawStats.roleStats }
          : {}),
      }
    : { wins: 0, hosted: 0, played: 0, longestStreak: 0 };

  return {
    uid,
    displayName: (userData.displayName || 'لاعب جديد').slice(0, 50),
    photoURL: typeof userData.photoURL === 'string' ? userData.photoURL : '',
    xp: typeof userData.xp === 'number' && userData.xp >= 0 ? userData.xp : 0,
    level: typeof userData.level === 'number' && userData.level >= 1 ? userData.level : 1,
    stats,
  };
}
