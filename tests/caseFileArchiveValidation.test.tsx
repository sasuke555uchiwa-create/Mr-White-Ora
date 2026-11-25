// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ClassifiedCaseFile } from '../types';
import { buildClassifiedCaseFile } from '../src/game/caseFileEngine';
import { buildOnlineClassifiedCaseFile } from '../functions/src/caseFileBuilder';

const mockOnlineFetchById = vi.fn();
const mockOnlineFetchUserArchive = vi.fn();
const mockAuthState = { user: { uid: 'user_1' } as { uid: string } | null };

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  db: {},
  functions: {},
}));

vi.mock('../services/soundService', () => ({
  playSound: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    profile: null,
    loading: false,
    isAdmin: false,
    isOffline: false,
    refreshProfile: vi.fn(),
    refreshAdminStatus: vi.fn(),
  }),
}));

vi.mock('../utils/caseFileService', async () => {
  const actual = await vi.importActual<typeof import('../utils/caseFileService')>(
    '../utils/caseFileService'
  );
  return {
    ...actual,
    fetchOnlineCaseFile: (...args: any[]) => mockOnlineFetchById(...args),
    fetchUserOnlineCaseFiles: (...args: any[]) => mockOnlineFetchUserArchive(...args),
  };
});

import { CaseFileScreen } from '../components/CaseFileScreen';
import { OperationArchiveScreen } from '../components/OperationArchiveScreen';
import { mergeCaseFileArchives } from '../utils/caseFileService';
import {
  saveSettings,
  saveLocalCaseFile,
  getLocalCaseFiles,
} from '../services/storageService';

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

function makeLocalGroupCaseFile(): ClassifiedCaseFile {
  return buildClassifiedCaseFile({
    reportId: 'local_grp_case_1',
    mode: 'local',
    matchId: 'm_grp_1',
    startedAtMs: 1_710_000_000_000,
    endedAtMs: 1_710_000_125_000, // 2m 05s
    language: 'en',
    category: 'food',
    difficulty: 'easy',
    gameMode: 'expression',
    winner: 'citizens',
    winReason: 'impostor_caught',
    secretWord: 'Pizza',
    undercoverWord: 'Burger',
    players: [
      { playerId: '0', name: 'Nadia', avatar: '👩', role: 'citizen', isEliminated: false, pointsEarned: 2, won: true },
      { playerId: '1', name: 'Tariq', avatar: '👨', role: 'citizen', isEliminated: false, pointsEarned: 2, won: true },
      { playerId: '2', name: 'Samir', avatar: '🕶️', role: 'mrwhite', isEliminated: true, pointsEarned: 0, won: false },
    ],
    clues: [],
    rounds: [
      {
        roundNumber: 1,
        voteMode: 'group',
        votesByPlayerId: {},
        mostVotedId: '2',
        eliminatedIds: ['2'],
        mrWhiteGuess: {
          playerId: '2',
          playerName: 'Samir',
          guess: 'Pasta',
          isCorrect: false,
        },
      },
    ],
    specialEvents: [],
  });
}

function makeOnlineCaseFile(reportId = 'online_room_m1', endedAtMs = 1_710_000_500_000): ClassifiedCaseFile {
  return buildOnlineClassifiedCaseFile({
    reportId,
    roomId: 'room_alpha',
    matchId: 'm_alpha_1',
    startedAtMs: endedAtMs - 195_000,
    endedAtMs,
    language: 'en',
    category: 'places',
    difficulty: 'hard',
    winner: 'impostor',
    winningFaction: 'undercover_solo',
    winReason: 'citizens_wrong_vote',
    winningMrWhiteUid: null,
    civilianWord: 'Cairo',
    undercoverWord: 'Alexandria',
    rolesByUid: {
      user_1: 'citizen',
      user_2: 'undercover',
      user_3: 'mrwhite',
      user_4: 'citizen',
    },
    rosterByUid: {
      user_1: { name: 'Agent One', avatar: '' },
      user_2: { name: 'Agent Two', avatar: '' },
      user_3: { name: 'Agent Three', avatar: '' },
      user_4: { name: 'Departed Four', avatar: '' },
    },
    players: [
      { uid: 'user_1', name: 'Agent One', avatar: '', isReady: true, isEliminated: false, score: 20, revealedRole: 'citizen' },
      { uid: 'user_2', name: 'Agent Two', avatar: '', isReady: true, isEliminated: false, score: 100, revealedRole: 'undercover' },
      { uid: 'user_3', name: 'Agent Three', avatar: '', isReady: true, isEliminated: true, score: 0, revealedRole: 'mrwhite' },
    ],
    rewardsByUid: {
      user_1: { xpDelta: 20, isWinner: false, roundPoints: 0 },
      user_2: { xpDelta: 100, isWinner: true, roundPoints: 10 },
      user_3: { xpDelta: 0, isWinner: false, roundPoints: 0 },
      user_4: { xpDelta: 0, isWinner: false, roundPoints: 0 },
    },
    clues: [
      { id: 'cl1', uid: 'user_1', name: 'Agent One', avatar: '', text: 'Pyramids', round: 1 },
      { id: 'cl2', uid: 'user_2', name: 'Agent Two', avatar: '', text: 'Mediterranean', round: 1 },
      { id: 'cl3', uid: 'user_1', name: 'Agent One', avatar: '', text: 'Nile', round: 2 },
    ],
    rounds: [
      {
        round: 1,
        votesByUid: { user_1: 'user_3', user_2: 'user_3', user_3: 'user_1', user_4: 'user_2' },
        mostVotedUid: 'user_3',
        votersForEliminated: ['user_1', 'user_2'],
        tieBroken: false,
        eliminatedUid: 'user_3',
        eliminatedRole: 'mrwhite',
        mrWhiteGuess: { uid: 'user_3', name: 'Agent Three', forcedMissing: true, isCorrect: false },
      },
      {
        round: 2,
        votesByUid: { user_1: 'user_2', user_2: 'user_1' },
        mostVotedUid: 'user_1',
        votersForEliminated: ['user_2'],
        tieBroken: true,
        eliminatedUid: 'user_1',
        eliminatedRole: 'citizen',
        mrWhiteGuess: null,
      },
    ],
    events: [
      { id: 'ev_dep', round: 2, type: 'player_departed', actorId: 'user_4', targetId: 'user_4', targetName: 'Departed Four' },
    ],
  }) as unknown as ClassifiedCaseFile;
}

describe('Case File Builder & Archive Merge Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createMemoryStorage());
    saveSettings({
      soundVolume: 0,
      hapticEnabled: false,
      language: 'en',
      theme: 'dark',
    });
    mockAuthState.user = { uid: 'user_1' };
  });

  afterEach(() => {
    cleanup();
  });

  it('builds consistent Case File duration, clock-skew safety, departed player eliminatedRound, and forcedMissing flags', () => {
    const skewed = buildClassifiedCaseFile({
      reportId: 'skew_check',
      mode: 'local',
      matchId: 'skew_1',
      startedAtMs: 50_000,
      endedAtMs: 10_000, // reversed timestamps
      language: 'en',
      category: 'standard',
      difficulty: 'easy',
      gameMode: 'expression',
      winner: 'citizens',
      winReason: 'impostor_caught',
      secretWord: 'Sun',
      undercoverWord: 'Moon',
      players: [
        { playerId: '1', name: 'P1', avatar: '', role: 'citizen', isEliminated: false, pointsEarned: 2, won: true },
        { playerId: '2', name: 'P2', avatar: '', role: 'mrwhite', isEliminated: true, pointsEarned: 0, won: false },
      ],
      clues: [],
      rounds: [],
      specialEvents: [],
    });
    expect(skewed.durationSeconds).toBe(0);
    expect(skewed.roundCount).toBe(1);

    const onlineFile = makeOnlineCaseFile();
    expect(onlineFile.durationSeconds).toBe(195);
    expect(onlineFile.roundCount).toBe(2);
    expect(onlineFile.playerCount).toBe(4);
    expect(onlineFile.participantIds).toContain('user_4');

    const departed = onlineFile.players.find((p) => p.playerId === 'user_4')!;
    expect(departed.survived).toBe(false);
    expect(departed.eliminatedRound).toBe(2);

    expect(onlineFile.rounds[0].mrWhiteGuess?.forcedMissing).toBe(true);
    expect(onlineFile.awards.find((a) => a.awardId === 'PERFECT_COVER')?.recipientId).toBe('user_2');
    expect(onlineFile.awards.find((a) => a.awardId === 'GHOST_PROTOCOL')?.status).toBe('not_applicable');
  });

  it('merges local and online archives with online deduplication precedence and newest-first ordering', () => {
    const localOld = makeLocalGroupCaseFile();
    localOld.endedAtMs = 1_710_000_100_000;

    const localDup = makeOnlineCaseFile('shared_rep', 1_710_000_200_000);
    localDup.mode = 'local';
    localDup.secretWord = 'LocalCopy';

    const onlineAuth = makeOnlineCaseFile('shared_rep', 1_710_000_200_000);
    onlineAuth.secretWord = 'OnlineAuthoritative';

    const onlineNewest = makeOnlineCaseFile('online_new', 1_710_000_900_000);

    const merged = mergeCaseFileArchives([localOld, localDup], [onlineAuth, onlineNewest]);
    expect(merged.map((m) => m.reportId)).toEqual(['online_new', 'shared_rep', 'local_grp_case_1']);
    expect(merged[1].mode).toBe('online');
    expect(merged[1].secretWord).toBe('OnlineAuthoritative');
  });

  it('renders CaseFileScreen accurately for Group Consensus mode without fabricating individual ballots', () => {
    const groupCase = makeLocalGroupCaseFile();
    const onBack = vi.fn();

    render(<CaseFileScreen caseFile={groupCase} onBack={onBack} />);

    expect(screen.getByText(groupCase.operationCode)).toBeTruthy();
    expect(screen.getByText('2:05')).toBeTruthy();
    expect(screen.getByText('Pizza')).toBeTruthy();
    expect(screen.getByText('Nadia')).toBeTruthy();

    // Group consensus notice displayed, and insufficient data instead of fabricated percentages
    expect(
      screen.getByText(
        /Group Consensus mode was used this round; individual voter ballots are not recorded/i
      )
    ).toBeTruthy();
    expect(screen.getAllByText(/Insufficient Data/i).length).toBeGreaterThanOrEqual(3);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders OperationArchiveScreen with search, source filters, and delete restricted strictly to local reports', async () => {
    const localCase = makeLocalGroupCaseFile();
    saveLocalCaseFile(localCase);

    const onlineCase = makeOnlineCaseFile('online_rep_1', 1_710_000_800_000);
    mockOnlineFetchUserArchive.mockResolvedValueOnce([onlineCase]);

    const onBack = vi.fn();
    const onOpenCaseFile = vi.fn();

    render(<OperationArchiveScreen onBack={onBack} onOpenCaseFile={onOpenCaseFile} />);

    await waitFor(() => {
      expect(screen.getByText(/Cairo/)).toBeTruthy();
    });
    expect(screen.getByText(/Pizza/)).toBeTruthy();

    // Only 1 Delete icon button (for the local report, never for the online report)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    expect(deleteButtons).toHaveLength(1);

    // Filter to Online only -> hides local item and delete buttons
    fireEvent.click(screen.getByRole('tab', { name: 'Online' }));
    expect(screen.queryByText(/Pizza/)).toBeNull();
    expect(screen.getByText(/Cairo/)).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: 'Delete' })).toHaveLength(0);

    // Filter back to All & search by secret word
    fireEvent.click(screen.getByRole('tab', { name: 'All' }));
    const searchInput = screen.getByPlaceholderText(/Search by op code, word, or agent name/i);
    fireEvent.change(searchInput, { target: { value: 'Pizza' } });
    expect(screen.getByText(/Pizza/)).toBeTruthy();
    expect(screen.queryByText(/Cairo/)).toBeNull();

    // Clear search and delete local case file via confirmation modal
    fireEvent.change(searchInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm?' }));

    expect(getLocalCaseFiles()).toEqual([]);
    expect(screen.queryByText(/Pizza/)).toBeNull();
    expect(screen.getByText(/Cairo/)).toBeTruthy();
  });
});
