export interface LevelProgress {
  level: number;
  currentLevelXp: number;
  levelSpanXp: number;
  nextLevelTotalXp: number;
  progressPercent: number;
}

export const XP_PER_LEVEL = 100;

export const calculateLevelFromXp = (xp: number): number => {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  return Math.floor(safeXp / XP_PER_LEVEL) + 1;
};

export const getLevelProgress = (xp: number, storedLevel?: number): LevelProgress => {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  const derivedLevel = calculateLevelFromXp(safeXp);
  const level = Math.max(storedLevel || 1, derivedLevel);
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const nextLevelTotalXp = level * XP_PER_LEVEL;
  const progressPercent = Math.min(100, Math.max(0, (currentLevelXp / XP_PER_LEVEL) * 100));

  return {
    level,
    currentLevelXp,
    levelSpanXp: XP_PER_LEVEL,
    nextLevelTotalXp,
    progressPercent,
  };
};
