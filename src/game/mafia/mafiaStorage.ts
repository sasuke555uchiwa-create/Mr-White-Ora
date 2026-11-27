import { MafiaMatchState } from './mafiaTypes';

const ACTIVE_MAFIA_MATCH_KEY = 'blacksite_mafia_active_match_v1';

export function saveActiveMafiaMatch(state: MafiaMatchState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ACTIVE_MAFIA_MATCH_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function loadActiveMafiaMatch(): MafiaMatchState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ACTIVE_MAFIA_MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.matchId !== 'string' ||
      !Array.isArray(parsed.players)
    ) {
      return null;
    }
    return parsed as MafiaMatchState;
  } catch {
    return null;
  }
}

export function clearActiveMafiaMatch(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(ACTIVE_MAFIA_MATCH_KEY);
  } catch {
    // ignore
  }
}
