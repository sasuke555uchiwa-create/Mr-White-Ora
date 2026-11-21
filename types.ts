export enum GamePhase {
  WELCOME = 'WELCOME',
  SETUP = 'SETUP',
  GAME_SETTINGS = 'GAME_SETTINGS',
  PLAYERS_LIST = 'PLAYERS_LIST',
  REVEAL = 'REVEAL',
  PLAYING = 'PLAYING',
  DISCUSSION = 'DISCUSSION',
  VOTING = 'VOTING',
  REVEAL_VOTE_RESULT = 'REVEAL_VOTE_RESULT',
  IMPOSTOR_GUESS = 'IMPOSTOR_GUESS',
  RESULT = 'RESULT',
  CASE_FILE = 'CASE_FILE',
  OPERATION_ARCHIVE = 'OPERATION_ARCHIVE',
  SCOREBOARD = 'SCOREBOARD',
  SETTINGS = 'SETTINGS',
  RULES = 'RULES',
  PROFILE = 'PROFILE',
  ONLINE_ROOMS = 'ONLINE_ROOMS',
  ONLINE_LOBBY = 'ONLINE_LOBBY',
  ONLINE_GAME = 'ONLINE_GAME',
  DICTIONARY = 'DICTIONARY',
  INVENTORY = 'INVENTORY'
}

export type GameMode = 'question' | 'expression';

export type SpecialRoleId =
  | 'fool'
  | 'boomerang'
  | 'justice'
  | 'ghost'
  | 'lovers'
  | 'avenger'
  | 'protector'
  | 'mr_meme';

export type PlayerRole =
  | 'citizen'
  | 'undercover'
  | 'mrwhite'
  | 'inspector'
  | SpecialRoleId;

export interface DescriptionEntry {
  playerId: number;
  playerName: string;
  playerAvatar: string;
  round: number;
  text: string;
}

export interface GameSettings {
  mrWhiteCount: number;
  undercoverCount: number;
  category: string;
  difficulty: 'easy' | 'hard';
  useSpecialRoles: boolean;
  selectedSpecialRoles: SpecialRoleId[];
  gameMode: GameMode;
  turnDurationSeconds: number;
}

export interface Player {
  id: number;
  uid?: string;
  name: string;
  role: PlayerRole;
  specialRole?: SpecialRoleId | null;
  isImpostor: boolean;
  score: number;
  avatar: string;
  isEliminated?: boolean;
  specialAbilityUsed?: boolean;
  foolBonusAwarded?: boolean;
  loverPartnerId?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
  image?: string;
}

export interface GameWordResponse {
  word: string;
  category: string;
  relatedWords?: string[];
}

// --- Classified Case File (Flagship Post-Match Intelligence Report) ---

export type CaseFileMode = 'local' | 'online';
export type CaseFileVoteMode = 'group' | 'secret' | 'online_secret';
export type CaseFileWinFaction = 'citizens' | 'undercover_solo' | 'mrwhite_solo' | 'both';
export type CaseFileWinReason =
  | 'impostor_guessed'
  | 'citizens_wrong_vote'
  | 'impostor_caught'
  | 'fool_won';

export type CaseFileAwardId =
  | 'MASTER_DETECTIVE'
  | 'PERFECT_COVER'
  | 'SHARP_EYE'
  | 'SOCIAL_STRATEGIST'
  | 'CLUTCH_MOMENT'
  | 'GHOST_PROTOCOL';

export type CaseFileMetricStatus = 'verified' | 'insufficient_data' | 'not_applicable';
export type CaseFileAwardStatus = 'awarded' | 'insufficient_data' | 'not_applicable';

export interface CaseFileClueRecord {
  id: string;
  round: number;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  text: string;
  skipped?: boolean;
}

export interface CaseFileVoteTallyItem {
  targetId: string;
  targetName: string;
  count: number;
}

export interface CaseFileVoteEntry {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
}

export interface CaseFileMrWhiteGuessAttempt {
  playerId: string;
  playerName: string;
  round: number;
  guess?: string;
  isCorrect: boolean;
  forcedMissing?: boolean;
}

export interface CaseFileRoundRecord {
  roundNumber: number;
  clues: CaseFileClueRecord[];
  voteMode: CaseFileVoteMode;
  voteTally: CaseFileVoteTallyItem[];
  votes: CaseFileVoteEntry[];
  mostVotedId: string | null;
  mostVotedName: string | null;
  eliminatedIds: string[];
  eliminatedNames: string[];
  eliminatedRoles: PlayerRole[];
  wasSavedBySpecial: 'protector' | 'boomerang' | null;
  bouncedFromName: string | null;
  tieBroken: boolean;
  tieBrokenByJustice: boolean;
  mrWhiteGuess?: CaseFileMrWhiteGuessAttempt | null;
}

export type CaseFileEventType =
  | 'shield_block'
  | 'boomerang_bounce'
  | 'justice_tiebreak'
  | 'avenger_strike'
  | 'lovers_heartbreak'
  | 'mr_joy_bonus'
  | 'ghost_vote'
  | 'mr_white_guess'
  | 'player_eliminated'
  | 'player_departed';

export interface CaseFileEvent {
  id: string;
  round: number;
  type: CaseFileEventType;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  outcome?: string;
  timestampMs?: number;
}

export type CaseFileTurningPointKind =
  | 'mr_white_guess_win'
  | 'mr_white_guess_miss'
  | 'shield_save'
  | 'boomerang_bounce'
  | 'avenger_strike'
  | 'lovers_chain'
  | 'justice_tiebreak'
  | 'infiltrator_eliminated'
  | 'final_elimination';

export interface CaseFileTurningPoint {
  round: number;
  kind: CaseFileTurningPointKind;
  actorName?: string;
  targetName?: string;
}

export interface CaseFilePlayerDossier {
  playerId: string;
  uid?: string;
  name: string;
  avatar: string;
  role: PlayerRole;
  specialRole: SpecialRoleId | null;
  isImpostor: boolean;
  survived: boolean;
  eliminatedRound: number | null;
  pointsEarned: number;
  xpEarned?: number;
  won: boolean;
  cluesCount: number;
  totalVotesCast: number;
  verifiableVotesCast: number;
  accurateVotes: number;
  voteAccuracyPct: number | null;
  voteAccuracyStatus: CaseFileMetricStatus;
  awardsEarned: CaseFileAwardId[];
}

export interface CaseFileAward {
  awardId: CaseFileAwardId;
  status: CaseFileAwardStatus;
  recipientId: string | null;
  recipientName: string | null;
  recipientRole: PlayerRole | null;
  metricValue: number | null;
  metricUnit?: 'pct' | 'points' | 'count' | 'score';
  reasonKey: string;
  tiedCandidates?: string[];
}

export interface ClassifiedCaseFile {
  schemaVersion: number;
  reportId: string;
  operationCode: string;
  mode: CaseFileMode;
  roomId?: string;
  matchId: string;
  startedAtMs: number;
  endedAtMs: number;
  durationSeconds: number;
  language: string;
  category: string;
  difficulty: 'easy' | 'hard';
  gameMode: GameMode;
  playerCount: number;
  roundCount: number;
  winner: 'citizens' | 'impostor';
  winningFaction: CaseFileWinFaction;
  winReason: CaseFileWinReason;
  winningMrWhiteId?: string | null;
  secretWord: string;
  undercoverWord: string;
  participantIds: string[];
  players: CaseFilePlayerDossier[];
  rounds: CaseFileRoundRecord[];
  specialEvents: CaseFileEvent[];
  turningPoints: CaseFileTurningPoint[];
  awards: CaseFileAward[];
}