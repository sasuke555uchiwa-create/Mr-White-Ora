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