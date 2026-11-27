export type MafiaRoleId = 'citizen' | 'detective' | 'doctor' | 'mafia' | 'mafia_boss';

export type MafiaFaction = 'city' | 'mafia';

export type MafiaTieRule = 'revote' | 'no_elimination';

export type MafiaPhase =
  | 'opening_night'
  | 'night'
  | 'dawn'
  | 'discussion'
  | 'defense'
  | 'voting'
  | 'vote_result'
  | 'ended';

export type MafiaWinReason = 'all_mafia_eliminated' | 'mafia_parity_reached';

export interface MafiaSettings {
  mafiaCount: number;
  enableDetective: boolean;
  enableDoctor: boolean;
  enableMafiaBoss: boolean;
  doctorAllowConsecutiveProtection: boolean;
  discussionDurationSeconds: number;
  votingDurationSeconds: number;
  enableNominationDefense: boolean;
  revealRoleOnExit: boolean;
  tieRule: MafiaTieRule;
  allowAbstention: boolean;
}

export interface MafiaRolePreset {
  playerCount: number;
  mafiaCount: number;
  mafiaBossCount: number;
  regularMafiaCount: number;
  detectiveCount: number;
  doctorCount: number;
  citizenCount: number;
  isValid: boolean;
  validationReason?: string;
}

export interface MafiaPlayerInput {
  id?: string;
  name: string;
  avatar: string;
}

export interface MafiaPlayer {
  id: string;
  name: string;
  avatar: string;
  role: MafiaRoleId;
  faction: MafiaFaction;
  isAlive: boolean;
  eliminatedRound: number | null;
  eliminatedAtPhase: 'night' | 'vote' | null;
}

export interface MafiaNightState {
  nightNumber: number;
  isOpeningNight: boolean;
  mafiaTargetId: string | null;
  mafiaConfirmedById: string | null;
  doctorTargetId: string | null;
  doctorConfirmed: boolean;
  detectiveTargetId: string | null;
  detectiveResult: MafiaFaction | null;
  detectiveConfirmed: boolean;
}

export interface MafiaDawnReport {
  nightNumber: number;
  isOpeningNight: boolean;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  eliminatedPlayerRole: MafiaRoleId | null;
  wasSavedByDoctor: boolean;
  peacefulNight: boolean;
}

export interface MafiaNightAuditEntry {
  nightNumber: number;
  mafiaTargetId: string | null;
  mafiaTargetName: string | null;
  doctorTargetId: string | null;
  doctorTargetName: string | null;
  wasSavedByDoctor: boolean;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  detectiveTargetId: string | null;
  detectiveTargetName: string | null;
  detectiveReportedFaction: MafiaFaction | null;
}

export interface MafiaVoteTallyItem {
  targetId: string;
  targetName: string;
  count: number;
}

export interface MafiaVoteRoundRecord {
  dayNumber: number;
  isRevote: boolean;
  votesByVoterId: Record<string, string>; // targetId or 'ABSTAIN'
  tally: MafiaVoteTallyItem[];
  abstainCount: number;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  eliminatedPlayerRole: MafiaRoleId | null;
  outcome: 'eliminated' | 'tie_revote' | 'tie_no_elimination' | 'all_abstain';
}

export interface MafiaPublicEvent {
  id: string;
  roundNumber: number;
  phase: 'opening_night' | 'dawn' | 'discussion' | 'vote';
  type:
    | 'opening_coordination'
    | 'night_removal'
    | 'doctor_save'
    | 'peaceful_night'
    | 'vote_removal'
    | 'tie_revote'
    | 'tie_no_removal'
    | 'victory';
  subjectName?: string | null;
  roleRevealed?: MafiaRoleId | null;
}

export interface MafiaCaseFileAward {
  awardId: 'SHARP_DETECTIVE' | 'GUARDIAN_DOCTOR' | 'SHADOW_SYNDICATE' | 'CITY_SURVIVOR';
  recipientId: string | null;
  recipientName: string | null;
  metricValue: number | null;
  reasonKey: string;
}

export interface MafiaCaseFileSummary {
  winningFaction: MafiaFaction;
  winReason: MafiaWinReason;
  daysCount: number;
  nightsCount: number;
  successfulProtections: number;
  investigationsCount: number;
  nightAudits: MafiaNightAuditEntry[];
  voteHistory: MafiaVoteRoundRecord[];
  publicEvents: MafiaPublicEvent[];
  awards: MafiaCaseFileAward[];
  revealRoleOnExit: boolean;
  playerRoles?: Record<string, MafiaRoleId>;
}

export interface MafiaMatchState {
  matchId: string;
  startedAtMs: number;
  endedAtMs: number | null;
  phase: MafiaPhase;
  dayNumber: number;
  nightNumber: number;
  settings: MafiaSettings;
  players: MafiaPlayer[];
  lastDoctorTargetId: string | null;
  currentNight: MafiaNightState;
  latestDawnReport: MafiaDawnReport | null;
  nightAuditLog: MafiaNightAuditEntry[];
  nominatedPlayerIds: string[];
  revoteCandidateIds: string[] | null;
  isRevote: boolean;
  pendingVotes: Record<string, string>;
  latestVoteRecord: MafiaVoteRoundRecord | null;
  voteHistory: MafiaVoteRoundRecord[];
  publicEvents: MafiaPublicEvent[];
  winner: MafiaFaction | null;
  winReason: MafiaWinReason | null;
}
