import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MAFIA_MAX_PLAYERS,
  MAFIA_MIN_PLAYERS,
  advanceAfterVoteResult,
  advanceFromDawn,
  canDoctorProtectTarget,
  checkMafiaVictory,
  completeOpeningNight,
  createMafiaMatch,
  getActiveNightSteps,
  getDefaultMafiaSettings,
  getInvestigationResult,
  getMafiaTeammatesForPlayer,
  getRecommendedMafiaPreset,
  resolveMafiaNight,
  resolveMafiaVoting,
  startNominationDefenseOrVoting,
  submitDetectiveInvestigation,
  submitDoctorProtection,
  submitMafiaNightKill,
  submitMafiaVote,
  toggleNomination,
  validateMafiaPlayerCount,
} from '../src/game/mafia/mafiaEngine';
import {
  clearActiveMafiaMatch,
  loadActiveMafiaMatch,
  saveActiveMafiaMatch,
} from '../src/game/mafia/mafiaStorage';
import { buildMafiaCaseFile } from '../src/game/mafia/mafiaCaseFile';
import { MafiaPlayerInput } from '../src/game/mafia/mafiaTypes';

function makeRoster(count: number): MafiaPlayerInput[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `p${idx + 1}`,
    name: `Agent ${idx + 1}`,
    avatar: '',
  }));
}

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

describe('Mafia: Shadow City Engine & Case File Suite', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  it('validates 6–14 player bounds and faction balance presets strictly', () => {
    expect(validateMafiaPlayerCount(MAFIA_MIN_PLAYERS - 1)).toEqual({
      valid: false,
      reason: 'MIN_PLAYERS_REQUIRED',
    });
    expect(validateMafiaPlayerCount(MAFIA_MAX_PLAYERS + 1)).toEqual({
      valid: false,
      reason: 'MAX_PLAYERS_EXCEEDED',
    });

    for (let n = MAFIA_MIN_PLAYERS; n <= MAFIA_MAX_PLAYERS; n++) {
      expect(validateMafiaPlayerCount(n).valid).toBe(true);
      const preset = getRecommendedMafiaPreset(n);
      expect(preset.isValid).toBe(true);
      expect(preset.mafiaCount).toBeLessThan(n - preset.mafiaCount);
    }

    // Mafia count >= City count is rejected
    const invalidBalance = getRecommendedMafiaPreset(6, { mafiaCount: 3 });
    expect(invalidBalance.isValid).toBe(false);
    expect(invalidBalance.validationReason).toBe('FACTION_BALANCE_INVALID');
  });

  it('assigns roles cleanly and isolates Mafia teammate visibility from City roles', () => {
    const match = createMafiaMatch({
      players: makeRoster(8),
      settings: {
        mafiaCount: 2,
        enableDetective: true,
        enableDoctor: true,
        enableMafiaBoss: true,
      },
      rng: () => 0.42,
    });

    const mafiaPlayers = match.players.filter((p) => p.faction === 'mafia');
    const boss = match.players.find((p) => p.role === 'mafia_boss');
    const detective = match.players.find((p) => p.role === 'detective');
    const doctor = match.players.find((p) => p.role === 'doctor');

    expect(mafiaPlayers).toHaveLength(2);
    expect(boss).toBeDefined();
    expect(detective).toBeDefined();
    expect(doctor).toBeDefined();

    // Mafia operative sees their partner, excluding self; City roles see zero teammates
    const matesForBoss = getMafiaTeammatesForPlayer(match.players, boss!.id);
    expect(matesForBoss).toHaveLength(1);
    expect(matesForBoss[0].id).not.toBe(boss!.id);
    expect(getMafiaTeammatesForPlayer(match.players, detective!.id)).toEqual([]);
  });

  it('runs Opening Night with zero eliminations and transitions cleanly to Night 1 actions', () => {
    let match = createMafiaMatch({
      players: makeRoster(6),
      settings: getDefaultMafiaSettings(6),
      rng: () => 0.5,
    });

    expect(match.phase).toBe('opening_night');
    expect(getActiveNightSteps(match)).toEqual(['mafia_coordination']);

    match = completeOpeningNight(match);
    expect(match.phase).toBe('dawn');
    expect(match.latestDawnReport?.isOpeningNight).toBe(true);
    expect(match.latestDawnReport?.eliminatedPlayerId).toBeNull();
    expect(match.players.every((p) => p.isAlive)).toBe(true);

    match = advanceFromDawn(match);
    expect(match.phase).toBe('discussion');
    expect(match.dayNumber).toBe(1);

    // Optional nomination & defense flow
    const citizen = match.players.find((p) => p.faction === 'city')!;
    match = toggleNomination(match, citizen.id);
    expect(match.nominatedPlayerIds).toContain(citizen.id);

    match = startNominationDefenseOrVoting(match);
    expect(match.phase).toBe('defense');
    match = startNominationDefenseOrVoting(match);
    expect(match.phase).toBe('voting');
  });

  it('enforces Doctor consecutive-night protection rules, Doctor saves, and Mafia Boss investigation masking', () => {
    let match = createMafiaMatch({
      players: makeRoster(8),
      settings: {
        mafiaCount: 2,
        enableDetective: true,
        enableDoctor: true,
        enableMafiaBoss: true,
        doctorAllowConsecutiveProtection: false,
      },
      rng: () => 0.17,
    });

    // Advance from opening night -> day 1 -> vote all abstain -> night 1
    match = completeOpeningNight(match);
    match = advanceFromDawn(match);
    match = { ...match, phase: 'voting' };
    match.players.forEach((p) => {
      match = submitMafiaVote(match, p.id, 'ABSTAIN');
    });
    match = resolveMafiaVoting(match);
    expect(match.latestVoteRecord?.outcome).toBe('all_abstain');
    match = advanceAfterVoteResult(match);
    expect(match.phase).toBe('night');
    expect(match.nightNumber).toBe(1);

    const mafiaActor = match.players.find((p) => p.role === 'mafia')!;
    const boss = match.players.find((p) => p.role === 'mafia_boss')!;
    const doctor = match.players.find((p) => p.role === 'doctor')!;
    const detective = match.players.find((p) => p.role === 'detective')!;
    const citizen = match.players.find((p) => p.role === 'citizen')!;

    // Mafia targets citizen, Doctor protects citizen -> citizen survives!
    match = submitMafiaNightKill(match, mafiaActor.id, citizen.id);
    match = submitDoctorProtection(match, doctor.id, citizen.id);

    // Detective scans Mafia Boss -> must report 'city' (Boss cover); regular Mafia reports 'mafia'
    expect(getInvestigationResult(boss.role)).toBe('city');
    expect(getInvestigationResult(mafiaActor.role)).toBe('mafia');
    const scanRes = submitDetectiveInvestigation(match, detective.id, boss.id);
    expect(scanRes.result).toBe('city');
    match = scanRes.state;

    match = resolveMafiaNight(match);
    expect(match.phase).toBe('dawn');
    expect(match.latestDawnReport?.wasSavedByDoctor).toBe(true);
    expect(match.latestDawnReport?.eliminatedPlayerId).toBeNull();
    expect(match.players.find((p) => p.id === citizen.id)?.isAlive).toBe(true);

    // Advance to Night 2 and verify consecutive protection on same target is blocked
    match = advanceFromDawn(match);
    match = { ...match, phase: 'voting' };
    match.players.forEach((p) => {
      match = submitMafiaVote(match, p.id, 'ABSTAIN');
    });
    match = resolveMafiaVoting(match);
    match = advanceAfterVoteResult(match);

    expect(canDoctorProtectTarget(match, citizen.id)).toEqual({
      allowed: false,
      reason: 'CONSECUTIVE_PROTECTION_BLOCKED',
    });
    expect(() => submitDoctorProtection(match, doctor.id, citizen.id)).toThrow();
  });

  it('handles Secret Voting ties (revote -> no_elimination), duplicate vote rejection, and victory parity/elimination checks', () => {
    let match = createMafiaMatch({
      players: makeRoster(6),
      settings: {
        mafiaCount: 1,
        enableDetective: true,
        enableDoctor: true,
        enableMafiaBoss: false,
        tieRule: 'revote',
        allowAbstention: true,
      },
      rng: () => 0.3,
    });

    match = completeOpeningNight(match);
    match = advanceFromDawn(match);
    match = { ...match, phase: 'voting' };

    const p = match.players;
    // 2 votes for p[0], 2 votes for p[1], 2 abstains -> tie_revote
    match = submitMafiaVote(match, p[0].id, p[1].id);
    match = submitMafiaVote(match, p[2].id, p[1].id);
    match = submitMafiaVote(match, p[1].id, p[0].id);
    match = submitMafiaVote(match, p[3].id, p[0].id);
    match = submitMafiaVote(match, p[4].id, 'ABSTAIN');
    match = submitMafiaVote(match, p[5].id, 'ABSTAIN');

    // Duplicate vote rejected
    expect(() => submitMafiaVote(match, p[0].id, p[1].id)).toThrow();

    match = resolveMafiaVoting(match);
    expect(match.latestVoteRecord?.outcome).toBe('tie_revote');
    expect(match.revoteCandidateIds).toEqual(expect.arrayContaining([p[0].id, p[1].id]));

    match = advanceAfterVoteResult(match);
    expect(match.phase).toBe('voting');
    expect(match.isRevote).toBe(true);

    // Non-tied target disallowed on revote
    expect(() => submitMafiaVote(match, p[0].id, p[2].id)).toThrow();

    // Vote out the Mafia player to trigger City Victory immediately after vote resolution
    const mafiaPlayer = match.players.find((pl) => pl.faction === 'mafia')!;
    const cityPlayers = match.players.filter((pl) => pl.faction === 'city');

    // Case File cannot be created before match ends
    expect(() => buildMafiaCaseFile({ state: match, language: 'en' })).toThrow();

    // Force revoteCandidateIds clear scenario for clean elimination test on fresh day
    match = { ...match, revoteCandidateIds: null, isRevote: false, pendingVotes: {} };
    cityPlayers.forEach((voter) => {
      match = submitMafiaVote(match, voter.id, mafiaPlayer.id);
    });
    match = submitMafiaVote(match, mafiaPlayer.id, cityPlayers[0].id);

    match = resolveMafiaVoting(match, 200000);
    expect(match.phase).toBe('ended');
    expect(match.winner).toBe('city');
    expect(match.winReason).toBe('all_mafia_eliminated');

    const cf = buildMafiaCaseFile({ state: match, language: 'en' });
    expect(cf.gameType).toBe('mafia_shadow_city');
    expect(cf.mafiaSummary?.winningFaction).toBe('city');
    expect(cf.mafiaSummary?.playerRoles?.[mafiaPlayer.id]).toBe(mafiaPlayer.role);
  });

  it('triggers Mafia parity victory immediately after night elimination and persists active match locally', () => {
    let match = createMafiaMatch({
      players: makeRoster(6),
      settings: { mafiaCount: 2, enableDetective: true, enableDoctor: false },
      rng: () => 0.1,
    });

    // Save/load active local session
    saveActiveMafiaMatch(match);
    const loaded = loadActiveMafiaMatch();
    expect(loaded?.matchId).toBe(match.matchId);
    clearActiveMafiaMatch();
    expect(loadActiveMafiaMatch()).toBeNull();

    // Simulate 2 Mafia vs 3 City entering Night 1 -> Mafia eliminates 1 City -> 2 vs 2 parity -> Mafia wins immediately!
    const firstCity = match.players.find((p) => p.faction === 'city')!;
    const mafiaActor = match.players.find((p) => p.faction === 'mafia')!;
    match = {
      ...match,
      phase: 'night',
      nightNumber: 1,
      currentNight: { ...match.currentNight, isOpeningNight: false, nightNumber: 1 },
      players: match.players.map((p) =>
        p.id === firstCity.id ? { ...p, isAlive: false, eliminatedRound: 1, eliminatedAtPhase: 'vote' } : p
      ),
    };

    const nextCity = match.players.find((p) => p.faction === 'city' && p.id !== firstCity.id)!;
    match = submitMafiaNightKill(match, mafiaActor.id, nextCity.id);
    match = resolveMafiaNight(match, 999999);

    expect(checkMafiaVictory(match.players)).toEqual({
      winner: 'mafia',
      reason: 'mafia_parity_reached',
    });
    expect(match.phase).toBe('ended');
    expect(match.winner).toBe('mafia');
  });
});
