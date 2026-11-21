import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildClassifiedCaseFile,
  deriveOperationCode,
  BuildClassifiedCaseFileInput,
} from '../src/game/caseFileEngine';
import { ClassifiedCaseFile } from '../types';

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

const basePlayers: BuildClassifiedCaseFileInput['players'] = [
  {
    playerId: '1',
    name: 'Amine',
    avatar: '🕵️',
    role: 'citizen',
    specialRole: null,
    isEliminated: false,
    pointsEarned: 15,
    won: true,
  },
  {
    playerId: '2',
    name: 'Sara',
    avatar: '🦊',
    role: 'citizen',
    specialRole: null,
    isEliminated: false,
    pointsEarned: 15,
    won: true,
  },
  {
    playerId: '3',
    name: 'Karim',
    avatar: '🎭',
    role: 'undercover',
    specialRole: null,
    isEliminated: true,
    pointsEarned: 0,
    won: false,
  },
  {
    playerId: '4',
    name: 'Nour',
    avatar: '🕶️',
    role: 'mrwhite',
    specialRole: null,
    isEliminated: true,
    pointsEarned: 0,
    won: false,
  },
];

describe('caseFileEngine', () => {
  it('derives deterministic OP-XXXX operation codes for a given reportId', () => {
    const codeA = deriveOperationCode('local_match_123');
    const codeB = deriveOperationCode('local_match_123');
    const codeC = deriveOperationCode('local_match_456');

    expect(codeA).toMatch(/^OP-\d{4}$/);
    expect(codeA).toBe(codeB);
    expect(codeA).not.toBe(codeC);
  });

  it('never fabricates vote accuracy or ballot awards when Local Group Consensus Vote is used', () => {
    const report = buildClassifiedCaseFile({
      reportId: 'local_group_1',
      mode: 'local',
      matchId: 'local_group_1',
      startedAtMs: 1_700_000_000_000,
      endedAtMs: 1_700_000_180_000,
      language: 'en',
      category: 'food',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'citizens',
      winReason: 'impostor_caught',
      secretWord: 'Couscous',
      undercoverWord: 'Tagine',
      players: basePlayers,
      clues: [],
      rounds: [
        {
          roundNumber: 1,
          voteMode: 'group',
          votesByPlayerId: {},
          mostVotedId: '3',
          eliminatedIds: ['3'],
        },
        {
          roundNumber: 2,
          voteMode: 'group',
          votesByPlayerId: {},
          mostVotedId: '4',
          eliminatedIds: ['4'],
          mrWhiteGuess: {
            playerId: '4',
            playerName: 'Nour',
            guess: 'Pasta',
            isCorrect: false,
          },
        },
      ],
      specialEvents: [],
    });

    expect(report.durationSeconds).toBe(180);
    expect(report.roundCount).toBe(2);
    expect(report.rounds[0].voteMode).toBe('group');
    expect(report.rounds[0].votes).toEqual([]);

    for (const dossier of report.players) {
      expect(dossier.voteAccuracyStatus).toBe('insufficient_data');
      expect(dossier.voteAccuracyPct).toBeNull();
      expect(dossier.verifiableVotesCast).toBe(0);
    }

    const byAward = new Map(report.awards.map((a) => [a.awardId, a]));
    expect(byAward.get('MASTER_DETECTIVE')?.status).toBe('insufficient_data');
    expect(byAward.get('MASTER_DETECTIVE')?.recipientId).toBeNull();
    expect(byAward.get('SHARP_EYE')?.status).toBe('insufficient_data');
    expect(byAward.get('SHARP_EYE')?.recipientId).toBeNull();
    expect(byAward.get('PERFECT_COVER')?.status).toBe('not_applicable');
    expect(byAward.get('GHOST_PROTOCOL')?.status).toBe('not_applicable');
  });

  it('computes verified vote accuracy, deterministic tie-breakers, and awards without duplicate player awardIds in Secret Vote', () => {
    const report = buildClassifiedCaseFile({
      reportId: 'local_secret_1',
      mode: 'local',
      matchId: 'local_secret_1',
      startedAtMs: 1_700_000_000_000,
      endedAtMs: 1_700_000_240_000,
      language: 'en',
      category: 'places',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'citizens',
      winReason: 'impostor_caught',
      secretWord: 'Carthage',
      undercoverWord: 'Kairouan',
      players: basePlayers,
      clues: [
        { id: 'c1', round: 1, playerId: '1', playerName: 'Amine', playerAvatar: '🕵️', text: 'Ancient ruins' },
        { id: 'c2', round: 1, playerId: '2', playerName: 'Sara', playerAvatar: '🦊', text: 'Near the sea' },
        { id: 'c3', round: 2, playerId: '1', playerName: 'Amine', playerAvatar: '🕵️', text: 'Hannibal' },
      ],
      rounds: [
        {
          roundNumber: 1,
          voteMode: 'secret',
          votesByPlayerId: { '1': '3', '2': '3', '3': '1', '4': '2' },
          mostVotedId: '3',
          eliminatedIds: ['3'],
        },
        {
          roundNumber: 2,
          voteMode: 'secret',
          votesByPlayerId: { '1': '4', '2': '1', '4': '1' },
          mostVotedId: '4',
          eliminatedIds: ['4'],
          mrWhiteGuess: {
            playerId: '4',
            playerName: 'Nour',
            guess: 'Sousse',
            isCorrect: false,
          },
        },
      ],
      specialEvents: [],
    });

    const amine = report.players.find((p) => p.playerId === '1')!;
    const sara = report.players.find((p) => p.playerId === '2')!;
    expect(amine.voteAccuracyStatus).toBe('verified');
    expect(amine.accurateVotes).toBe(2);
    expect(amine.voteAccuracyPct).toBe(100);

    expect(sara.accurateVotes).toBe(1);
    expect(sara.voteAccuracyPct).toBe(50);

    // Every player's awardsEarned array contains unique awardIds
    for (const p of report.players) {
      expect(new Set(p.awardsEarned).size).toBe(p.awardsEarned.length);
    }

    const byAward = new Map(report.awards.map((a) => [a.awardId, a]));
    expect(byAward.get('MASTER_DETECTIVE')?.status).toBe('awarded');
    expect(byAward.get('MASTER_DETECTIVE')?.recipientId).toBe('1');
    expect(byAward.get('SHARP_EYE')?.status).toBe('awarded');
    expect(byAward.get('SHARP_EYE')?.recipientId).toBe('1');
    expect(byAward.get('SOCIAL_STRATEGIST')?.status).toBe('awarded');
    expect(byAward.get('CLUTCH_MOMENT')?.status).toBe('awarded');
    expect(byAward.get('PERFECT_COVER')?.status).toBe('not_applicable');

    // Transparent tiedCandidates check when two players tie identically on voteAccuracyPct
    const tiedReport = buildClassifiedCaseFile({
      reportId: 'local_tie_1',
      mode: 'local',
      matchId: 'local_tie_1',
      startedAtMs: 1_700_000_000_000,
      endedAtMs: 1_700_000_120_000,
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'citizens',
      winReason: 'impostor_caught',
      secretWord: 'Sun',
      undercoverWord: 'Moon',
      players: basePlayers,
      clues: [],
      rounds: [
        {
          roundNumber: 1,
          voteMode: 'secret',
          votesByPlayerId: { '1': '3', '2': '3', '3': '4', '4': '3' },
          mostVotedId: '3',
          eliminatedIds: ['3'],
        },
      ],
    specialEvents: [],
    });
    const tiedSharpEye = tiedReport.awards.find((a) => a.awardId === 'SHARP_EYE')!;
    expect(tiedSharpEye.status).toBe('awarded');
    expect(tiedSharpEye.recipientId).toBe('1');
    expect(tiedSharpEye.tiedCandidates).toEqual(['Amine', 'Sara']);
  });

  it('awards PERFECT_COVER only to surviving winning infiltrators and gates GHOST_PROTOCOL strictly', () => {
    // Eliminated Mr. White who still won by guessing the word must NOT receive PERFECT_COVER
    const mrWhiteGuessWin = buildClassifiedCaseFile({
      reportId: 'local_mw_guess',
      mode: 'local',
      matchId: 'local_mw_guess',
      startedAtMs: 1000,
      endedAtMs: 61_000,
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'impostor',
      winReason: 'impostor_guessed',
      winningMrWhiteId: '4',
      secretWord: 'Coffee',
      undercoverWord: 'Tea',
      players: [
        { playerId: '1', name: 'Amine', avatar: '🕵️', role: 'citizen', isEliminated: false, pointsEarned: 0, won: false },
        { playerId: '2', name: 'Sara', avatar: '🦊', role: 'citizen', isEliminated: false, pointsEarned: 0, won: false },
        {
          playerId: '4',
          name: 'Nour',
          avatar: '🕶️',
          role: 'mrwhite',
          isEliminated: true,
          pointsEarned: 35,
          won: true,
        },
      ],
      clues: [],
      rounds: [
        {
          roundNumber: 1,
          voteMode: 'secret',
          votesByPlayerId: { '1': '4', '2': '4', '4': '1' },
          mostVotedId: '4',
          eliminatedIds: ['4'],
          mrWhiteGuess: { playerId: '4', playerName: 'Nour', guess: 'Coffee', isCorrect: true },
        },
      ],
      specialEvents: [{ id: 'ev1', round: 1, type: 'mr_white_guess', actorId: '4', actorName: 'Nour', outcome: 'correct' }],
    });

    const awardsNoSurvivingImp = new Map(mrWhiteGuessWin.awards.map((a) => [a.awardId, a]));
    expect(awardsNoSurvivingImp.get('PERFECT_COVER')?.status).toBe('not_applicable');
    expect(awardsNoSurvivingImp.get('CLUTCH_MOMENT')?.recipientId).toBe('4');

    // Ghost present without ghost_vote -> not_applicable; with ghost_vote -> awarded
    const playersWithGhost: BuildClassifiedCaseFileInput['players'] = [
      { playerId: '1', name: 'Amine', avatar: '🕵️', role: 'ghost', specialRole: 'ghost', isEliminated: true, pointsEarned: 15, won: true },
      { playerId: '2', name: 'Sara', avatar: '🦊', role: 'citizen', isEliminated: false, pointsEarned: 15, won: true },
      { playerId: '3', name: 'Karim', avatar: '🎭', role: 'undercover', isEliminated: false, pointsEarned: 30, won: true },
    ];

    const ghostIdle = buildClassifiedCaseFile({
      reportId: 'local_ghost_idle',
      mode: 'local',
      matchId: 'local_ghost_idle',
      startedAtMs: 1000,
      endedAtMs: 31_000,
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'impostor',
      winReason: 'citizens_wrong_vote',
      secretWord: 'Ocean',
      undercoverWord: 'River',
      players: playersWithGhost,
      clues: [],
      rounds: [],
      specialEvents: [],
    });
    expect(ghostIdle.awards.find((a) => a.awardId === 'GHOST_PROTOCOL')?.status).toBe('not_applicable');
    expect(ghostIdle.awards.find((a) => a.awardId === 'PERFECT_COVER')?.recipientId).toBe('3');

    const ghostActive = buildClassifiedCaseFile({
      reportId: 'local_ghost_active',
      mode: 'local',
      matchId: 'local_ghost_active',
      startedAtMs: 1000,
      endedAtMs: 31_000,
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'impostor',
      winReason: 'citizens_wrong_vote',
      secretWord: 'Ocean',
      undercoverWord: 'River',
      players: playersWithGhost,
      clues: [],
      rounds: [],
      specialEvents: [
        { id: 'gv1', round: 2, type: 'ghost_vote', actorId: '1', actorName: 'Amine', targetId: '3', targetName: 'Karim' },
      ],
    });
    const ghostAward = ghostActive.awards.find((a) => a.awardId === 'GHOST_PROTOCOL')!;
    expect(ghostAward.status).toBe('awarded');
    expect(ghostAward.recipientId).toBe('1');
    expect(ghostAward.metricValue).toBe(1);
  });

  it('extracts turning points cleanly for boomerang, shield, avenger, lovers, justice, mr_joy_bonus, and mr_white_guess', () => {
    const report = buildClassifiedCaseFile({
      reportId: 'local_special_tp',
      mode: 'local',
      matchId: 'local_special_tp',
      startedAtMs: 1000,
      endedAtMs: 121_000,
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'citizens',
      winReason: 'impostor_caught',
      secretWord: 'Desert',
      undercoverWord: 'Oasis',
      players: [
        { playerId: '1', name: 'Boom', avatar: '🪃', role: 'boomerang', specialRole: 'boomerang', isEliminated: false, pointsEarned: 20, won: true },
        { playerId: '2', name: 'Shield', avatar: '🛡️', role: 'protector', specialRole: 'protector', isEliminated: false, pointsEarned: 15, won: true },
        { playerId: '3', name: 'Aveng', avatar: '⚔️', role: 'avenger', specialRole: 'avenger', isEliminated: true, pointsEarned: 15, won: true },
        { playerId: '4', name: 'Imp', avatar: '🎭', role: 'undercover', specialRole: null, isEliminated: true, pointsEarned: 0, won: false },
        { playerId: '5', name: 'LoverB', avatar: '💘', role: 'lovers', specialRole: 'lovers', isEliminated: true, pointsEarned: 15, won: true },
      ],
      clues: [],
      rounds: [
        {
          roundNumber: 1,
          voteMode: 'secret',
          votesByPlayerId: { '1': '4', '2': '4', '3': '1', '4': '1', '5': '1' },
          mostVotedId: '1',
          eliminatedIds: ['4'],
          wasSavedBySpecial: 'boomerang',
          bouncedFromName: 'Boom',
          tieBroken: true,
          tieBrokenByJustice: true,
        },
        {
          roundNumber: 2,
          voteMode: 'secret',
          votesByPlayerId: { '1': '2', '2': '3', '3': '2' },
          mostVotedId: '2',
          eliminatedIds: [],
          wasSavedBySpecial: 'protector',
        },
      ],
      specialEvents: [
        { id: 'e1', round: 1, type: 'boomerang_bounce', actorId: '1', actorName: 'Boom', targetId: '4', targetName: 'Imp' },
        { id: 'e2', round: 2, type: 'shield_block', actorId: '2', actorName: 'Shield' },
        { id: 'e3', round: 2, type: 'avenger_strike', actorId: '3', actorName: 'Aveng', targetId: '4', targetName: 'Imp' },
        { id: 'e4', round: 2, type: 'lovers_heartbreak', actorId: '3', actorName: 'Aveng', targetId: '5', targetName: 'LoverB' },
        { id: 'e5', round: 2, type: 'mr_joy_bonus', actorId: '1', actorName: 'Boom', outcome: 'smile' },
      ],
    });

    const kinds = report.turningPoints.map((tp) => tp.kind);
    expect(kinds).toContain('boomerang_bounce');
    expect(kinds).toContain('justice_tiebreak');
    expect(kinds).toContain('infiltrator_eliminated');
    expect(kinds).toContain('shield_save');
    expect(kinds).toContain('avenger_strike');
    expect(kinds).toContain('lovers_chain');

    expect(report.awards.find((a) => a.awardId === 'CLUTCH_MOMENT')?.reasonKey).toBe(
      'caseAwardReasonClutchBoomerang'
    );
  });
});

describe('storageService Classified Case Files archive', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  const makeCaseFile = (index: number): ClassifiedCaseFile =>
    buildClassifiedCaseFile({
      reportId: `local_test_${index}`,
      mode: 'local',
      matchId: `local_test_${index}`,
      startedAtMs: 1_700_000_000_000 + index * 1000,
      endedAtMs: 1_700_000_010_000 + index * 1000,
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'citizens',
      winReason: 'impostor_caught',
      secretWord: 'Coffee',
      undercoverWord: 'Tea',
      players: basePlayers,
      clues: [],
      rounds: [],
      specialEvents: [],
    });

  it('saves, sorts newest-first, caps at 40 entries, deletes by id, and wipes in clearAllData()', async () => {
    const storage = await import('../services/storageService');

    for (let i = 1; i <= 45; i++) {
      storage.saveLocalCaseFile(makeCaseFile(i));
    }

    const stored = storage.getLocalCaseFiles();
    expect(stored.length).toBe(40);
    expect(stored[0].reportId).toBe('local_test_45');
    expect(stored[39].reportId).toBe('local_test_6');
    expect(storage.getLocalCaseFileById('local_test_42')?.reportId).toBe('local_test_42');
    expect(storage.getLocalCaseFileById('local_test_1')).toBeNull();

    storage.deleteLocalCaseFile('local_test_45');
    expect(storage.getLocalCaseFiles().length).toBe(39);
    expect(storage.getLocalCaseFileById('local_test_45')).toBeNull();

    storage.clearAllData();
    expect(storage.getLocalCaseFiles()).toEqual([]);
  });
});
