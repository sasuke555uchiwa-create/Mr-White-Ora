import { PlayerRole } from '../../types';

export interface RoleSessionRecord {
  played: number;
  wins: number;
}

export interface LocalPlayerMatchStats {
  name: string;
  played: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  roleStats: Record<string, RoleSessionRecord>;
}

export interface SessionStatsSnapshot {
  onlinePlayed: number;
  onlineWins: number;
  onlineLosses: number;
  onlineCurrentStreak: number;
  onlineBestStreak: number;
  onlineRoleStats: Record<string, RoleSessionRecord>;
  offlineMatchesCount: number;
  offlineRoleStats: Record<string, RoleSessionRecord>;
  offlinePlayers: Record<string, LocalPlayerMatchStats>;
  recordedMatchIds: string[];
  onlineRecordedMatchIds?: string[];
  updatedAt: number;
}

export interface RoleStatEntry {
  role: PlayerRole;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  sharePercent: number;
}

export interface ServerStatsInput {
  wins: number;
  hosted: number;
  played: number;
  longestStreak: number;
  currentStreak?: number;
  roleStats?: Record<string, RoleSessionRecord>;
}

export type StatisticsFilter = 'all' | 'online' | 'local';

export interface ComputedGameStatistics {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  winLossRatioValue: number;
  winLossRatioLabel: string;
  winSharePercent: number;
  hosted: number;
  longestStreak: number;
  currentStreak: number;
  roles: RoleStatEntry[];
  favoriteRole: RoleStatEntry | null;
}

export function createEmptySessionStatsSnapshot(): SessionStatsSnapshot {
  return {
    onlinePlayed: 0,
    onlineWins: 0,
    onlineLosses: 0,
    onlineCurrentStreak: 0,
    onlineBestStreak: 0,
    onlineRoleStats: {},
    offlineMatchesCount: 0,
    offlineRoleStats: {},
    offlinePlayers: {},
    recordedMatchIds: [],
    onlineRecordedMatchIds: [],
    updatedAt: 0,
  };
}

export function formatWinLossRatio(wins: number, losses: number): {
  value: number;
  label: string;
} {
  const safeWins = Math.max(0, Math.floor(wins));
  const safeLosses = Math.max(0, Math.floor(losses));
  if (safeWins === 0 && safeLosses === 0) {
    return { value: 0, label: '0.00' };
  }
  if (safeLosses === 0) {
    return { value: safeWins, label: `${safeWins}:0` };
  }
  const ratio = safeWins / safeLosses;
  return { value: ratio, label: ratio.toFixed(2) };
}

function normalizeRoleMap(
  raw?: Record<string, Partial<RoleSessionRecord>> | null
): Record<string, RoleSessionRecord> {
  if (!raw || typeof raw !== 'object') return {};
  const clean: Record<string, RoleSessionRecord> = {};
  Object.entries(raw).forEach(([role, entry]) => {
    if (!entry || typeof entry !== 'object') return;
    const played = Math.max(0, Math.floor(Number(entry.played || 0)));
    const wins = Math.min(played, Math.max(0, Math.floor(Number(entry.wins || 0))));
    if (played > 0) {
      clean[role] = { played, wins };
    }
  });
  return clean;
}

function mergeRoleMapsMax(
  primary: Record<string, RoleSessionRecord>,
  secondary: Record<string, RoleSessionRecord>
): Record<string, RoleSessionRecord> {
  const merged: Record<string, RoleSessionRecord> = {};
  const keys = new Set([...Object.keys(primary), ...Object.keys(secondary)]);
  keys.forEach((role) => {
    const a = primary[role] || { played: 0, wins: 0 };
    const b = secondary[role] || { played: 0, wins: 0 };
    const played = Math.max(a.played, b.played);
    const wins = Math.min(played, Math.max(a.wins, b.wins));
    if (played > 0) {
      merged[role] = { played, wins };
    }
  });
  return merged;
}

function sumRoleMaps(
  a: Record<string, RoleSessionRecord>,
  b: Record<string, RoleSessionRecord>
): Record<string, RoleSessionRecord> {
  const summed: Record<string, RoleSessionRecord> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.forEach((role) => {
    const first = a[role] || { played: 0, wins: 0 };
    const second = b[role] || { played: 0, wins: 0 };
    const played = first.played + second.played;
    const wins = Math.min(played, first.wins + second.wins);
    if (played > 0) {
      summed[role] = { played, wins };
    }
  });
  return summed;
}

function rankRoles(roleMap: Record<string, RoleSessionRecord>, totalOverride?: number): RoleStatEntry[] {
  const entries = Object.entries(roleMap).filter(([, rec]) => rec.played > 0);
  const sumPlayed = entries.reduce((acc, [, rec]) => acc + rec.played, 0);
  const denom = Math.max(1, totalOverride || sumPlayed);

  return entries
    .map(([role, rec]) => {
      const played = rec.played;
      const wins = Math.min(played, rec.wins);
      const losses = Math.max(0, played - wins);
      const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
      const sharePercent = Math.round((played / denom) * 100);
      return {
        role: role as PlayerRole,
        played,
        wins,
        losses,
        winRate,
        sharePercent,
      };
    })
    .sort((a, b) => {
      if (b.played !== a.played) return b.played - a.played;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.winRate - a.winRate;
    });
}

export function computeGameStatistics(params: {
  filter: StatisticsFilter;
  serverStats?: ServerStatsInput | null;
  sessionStats: SessionStatsSnapshot;
  localPlayerFilter?: string;
}): ComputedGameStatistics {
  const { filter, serverStats, sessionStats, localPlayerFilter = '__all__' } = params;

  const sPlayed = Math.max(0, Math.floor(Number(serverStats?.played || 0)));
  const sWins = Math.min(sPlayed, Math.max(0, Math.floor(Number(serverStats?.wins || 0))));
  const sHosted = Math.max(0, Math.floor(Number(serverStats?.hosted || 0)));
  const sLongestStreak = Math.max(0, Math.floor(Number(serverStats?.longestStreak || 0)));
  const sCurrentStreak = Math.max(0, Math.floor(Number(serverStats?.currentStreak || 0)));
  const serverRoles = normalizeRoleMap(serverStats?.roleStats);

  const onlinePlayed = Math.max(sPlayed, sessionStats.onlinePlayed);
  const onlineWins =
    sPlayed >= sessionStats.onlinePlayed
      ? sWins
      : Math.min(onlinePlayed, Math.max(sWins, sessionStats.onlineWins));
  const onlineLosses = Math.max(0, onlinePlayed - onlineWins);
  const onlineBestStreak = Math.max(sLongestStreak, sessionStats.onlineBestStreak);
  const onlineCurrentStreak =
    sPlayed >= sessionStats.onlinePlayed ? sCurrentStreak : sessionStats.onlineCurrentStreak;
  const localOnlineRoles = normalizeRoleMap(sessionStats.onlineRoleStats);
  const onlineRoles =
    sPlayed >= sessionStats.onlinePlayed && Object.keys(serverRoles).length > 0
      ? serverRoles
      : mergeRoleMapsMax(serverRoles, localOnlineRoles);

  // Local Pass & Play metrics (aggregate or individual player)
  let localPlayed = 0;
  let localWins = 0;
  let localLosses = 0;
  let localBestStreak = 0;
  let localCurrentStreak = 0;
  let localRoles: Record<string, RoleSessionRecord> = {};

  if (localPlayerFilter !== '__all__' && sessionStats.offlinePlayers[localPlayerFilter]) {
    const pStats = sessionStats.offlinePlayers[localPlayerFilter];
    localPlayed = pStats.played;
    localWins = pStats.wins;
    localLosses = pStats.losses;
    localBestStreak = pStats.bestStreak;
    localCurrentStreak = pStats.currentStreak;
    localRoles = normalizeRoleMap(pStats.roleStats);
  } else {
    const playersList = Object.values(sessionStats.offlinePlayers);
    playersList.forEach((p) => {
      localPlayed += p.played;
      localWins += p.wins;
      localLosses += p.losses;
      localBestStreak = Math.max(localBestStreak, p.bestStreak);
      localCurrentStreak = Math.max(localCurrentStreak, p.currentStreak);
    });
    localRoles = normalizeRoleMap(sessionStats.offlineRoleStats);
  }

  let played = 0;
  let wins = 0;
  let losses = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let hosted = 0;
  let activeRoleMap: Record<string, RoleSessionRecord> = {};

  if (filter === 'online') {
    played = onlinePlayed;
    wins = onlineWins;
    losses = onlineLosses;
    longestStreak = onlineBestStreak;
    currentStreak = onlineCurrentStreak;
    hosted = sHosted;
    activeRoleMap = onlineRoles;
  } else if (filter === 'local') {
    played = localPlayed;
    wins = localWins;
    losses = localLosses;
    longestStreak = localBestStreak;
    currentStreak = localCurrentStreak;
    hosted = sessionStats.offlineMatchesCount;
    activeRoleMap = localRoles;
  } else {
    played = onlinePlayed + localPlayed;
    wins = onlineWins + localWins;
    losses = onlineLosses + localLosses;
    longestStreak = Math.max(onlineBestStreak, localBestStreak);
    currentStreak = Math.max(onlineCurrentStreak, localCurrentStreak);
    hosted = sHosted;
    activeRoleMap = sumRoleMaps(onlineRoles, localRoles);
  }

  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const winSharePercent = played > 0 ? Math.round((wins / played) * 100) : 50;
  const ratioInfo = formatWinLossRatio(wins, losses);
  const roles = rankRoles(activeRoleMap, played);

  return {
    played,
    wins,
    losses,
    winRate,
    winLossRatioValue: ratioInfo.value,
    winLossRatioLabel: ratioInfo.label,
    winSharePercent,
    hosted,
    longestStreak,
    currentStreak,
    roles,
    favoriteRole: roles[0] || null,
  };
}
