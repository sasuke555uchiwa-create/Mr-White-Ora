import mainBanner from '../assets/mr-white/hero/main-banner.webp';
import mysteryCardBack from '../assets/images/mystery_card_back_1794601444252.webp';
import tableBackdrop from '../assets/images/table_felt_backdrop_1794601446491.webp';

// Role Portraits (1024x1024 WebP)
import citizenPortrait from '../assets/mr-white/roles/citizen.webp';
import undercoverPortrait from '../assets/mr-white/roles/undercover.webp';
import mrWhitePortrait from '../assets/mr-white/roles/mr-white.webp';
import inspectorPortrait from '../assets/mr-white/roles/inspector.webp';
import foolPortrait from '../assets/mr-white/roles/fool.webp';
import boomerangPortrait from '../assets/mr-white/roles/boomerang.webp';
import protectorPortrait from '../assets/mr-white/roles/protector.webp';
import justicePortrait from '../assets/mr-white/roles/justice.webp';
import ghostPortrait from '../assets/mr-white/roles/ghost.webp';
import loversPortrait from '../assets/mr-white/roles/lovers.webp';
import avengerPortrait from '../assets/mr-white/roles/avenger.webp';
import mrMemePortrait from '../assets/mr-white/roles/mr-meme.webp';

// Achievement Icons (512x512 WebP)
import achFirstWin from '../assets/mr-white/achievements/first-win.webp';
import achSharpEye from '../assets/mr-white/achievements/sharp-eye.webp';
import achMasterDetective from '../assets/mr-white/achievements/master-detective.webp';
import achPerfectDeduction from '../assets/mr-white/achievements/perfect-deduction.webp';
import achSurvivor from '../assets/mr-white/achievements/survivor.webp';
import achAgentVeteran from '../assets/mr-white/achievements/agent-veteran.webp';
import achMasterOfLies from '../assets/mr-white/achievements/master-of-lies.webp';
import achSocialStrategist from '../assets/mr-white/achievements/social-strategist.webp';
import achSpecialRoleExpert from '../assets/mr-white/achievements/special-role-expert.webp';
import achDailyOperation from '../assets/mr-white/achievements/daily-operation.webp';

// Category Covers (800x600 WebP)
import catStandard from '../assets/mr-white/categories/standard.webp';
import catAnimals from '../assets/mr-white/categories/animals.webp';
import catFood from '../assets/mr-white/categories/food.webp';
import catPlaces from '../assets/mr-white/categories/places.webp';
import catObjects from '../assets/mr-white/categories/objects.webp';

// Game Mode Artwork Proposals (800x600 WebP — Proposals Only)
import modeClassic from '../assets/mr-white/modes/classic.webp';
import modeRush from '../assets/mr-white/modes/rush.webp';
import modeEvidence from '../assets/mr-white/modes/evidence.webp';
import modeNoElimination from '../assets/mr-white/modes/no-elimination.webp';

// Profile Cosmetics
import frameObsidian from '../assets/mr-white/cosmetics/frames/frame-obsidian.png';
import frameCyan from '../assets/mr-white/cosmetics/frames/frame-cyan.png';
import frameAmber from '../assets/mr-white/cosmetics/frames/frame-amber.png';

import badgeDetective from '../assets/mr-white/cosmetics/badges/detective-badge.webp';
import badgeTacticalWatch from '../assets/mr-white/cosmetics/badges/tactical-watch.webp';
import badgeStealthShades from '../assets/mr-white/cosmetics/badges/stealth-shades.webp';
import badgeClassifiedDossier from '../assets/mr-white/cosmetics/badges/classified-dossier.webp';
import badgeMastermindCrown from '../assets/mr-white/cosmetics/badges/mastermind-crown.webp';

import dossierNavy from '../assets/mr-white/cosmetics/dossiers/dossier-navy.webp';
import dossierClassified from '../assets/mr-white/cosmetics/dossiers/dossier-classified.webp';

import collectibleCipherKey from '../assets/mr-white/cosmetics/collectibles/cipher-key.webp';
import collectibleAgencySeal from '../assets/mr-white/cosmetics/collectibles/agency-seal.webp';

import { GamePhase, PlayerRole } from '../../types';

export const HERO_ASSETS = {
  mainBanner,
  mysteryCardBack,
  tableBackdrop,
} as const;

export type BlacksiteBackgroundKey =
  | 'home'
  | 'setup'
  | 'briefing'
  | 'discussion'
  | 'voting'
  | 'results'
  | 'online'
  | 'archive'
  | 'profile';

export interface BlacksiteBackgroundMeta {
  key: BlacksiteBackgroundKey;
  src: string;
  tone: 'gold' | 'cyan' | 'crimson' | 'neutral';
  alt: string;
}

export const BLACKSITE_BACKGROUNDS: Record<BlacksiteBackgroundKey, BlacksiteBackgroundMeta> = {
  home: {
    key: 'home',
    src: '/assets/blacksite/backgrounds/home-bg.webp',
    tone: 'gold',
    alt: 'BLACKSITE intelligence command headquarters',
  },
  setup: {
    key: 'setup',
    src: '/assets/blacksite/backgrounds/setup-bg.webp',
    tone: 'gold',
    alt: 'Classified mission preparation room',
  },
  briefing: {
    key: 'briefing',
    src: '/assets/blacksite/backgrounds/briefing-bg.webp',
    tone: 'gold',
    alt: 'Sealed dossier briefing vault',
  },
  discussion: {
    key: 'discussion',
    src: '/assets/blacksite/backgrounds/discussion-bg.webp',
    tone: 'cyan',
    alt: 'Covert interrogation and investigation room',
  },
  voting: {
    key: 'voting',
    src: '/assets/blacksite/backgrounds/voting-bg.webp',
    tone: 'crimson',
    alt: 'High-tension tribunal chamber',
  },
  results: {
    key: 'results',
    src: '/assets/blacksite/backgrounds/results-bg.webp',
    tone: 'gold',
    alt: 'Official agency debriefing hall',
  },
  online: {
    key: 'online',
    src: '/assets/blacksite/backgrounds/online-bg.webp',
    tone: 'cyan',
    alt: 'Restricted cyber-intelligence operations hub',
  },
  archive: {
    key: 'archive',
    src: '/assets/blacksite/backgrounds/archive-bg.webp',
    tone: 'neutral',
    alt: 'Underground classified archive corridor',
  },
  profile: {
    key: 'profile',
    src: '/assets/blacksite/backgrounds/profile-bg.webp',
    tone: 'gold',
    alt: 'Operative personal locker suite',
  },
} as const;

export const SCREEN_BACKGROUND_MAP: Record<GamePhase, BlacksiteBackgroundKey> = {
  [GamePhase.WELCOME]: 'home',
  [GamePhase.SETUP]: 'setup',
  [GamePhase.PLAYERS_LIST]: 'setup',
  [GamePhase.GAME_SETTINGS]: 'setup',
  [GamePhase.REVEAL]: 'briefing',
  [GamePhase.PLAYING]: 'discussion',
  [GamePhase.DISCUSSION]: 'discussion',
  [GamePhase.VOTING]: 'voting',
  [GamePhase.REVEAL_VOTE_RESULT]: 'voting',
  [GamePhase.IMPOSTOR_GUESS]: 'voting',
  [GamePhase.RESULT]: 'results',
  [GamePhase.SCOREBOARD]: 'results',
  [GamePhase.ONLINE_ROOMS]: 'online',
  [GamePhase.ONLINE_LOBBY]: 'online',
  [GamePhase.ONLINE_GAME]: 'online',
  [GamePhase.CASE_FILE]: 'archive',
  [GamePhase.OPERATION_ARCHIVE]: 'archive',
  [GamePhase.DICTIONARY]: 'archive',
  [GamePhase.RULES]: 'archive',
  [GamePhase.PROFILE]: 'profile',
  [GamePhase.INVENTORY]: 'profile',
  [GamePhase.SETTINGS]: 'profile',
};

export type BlacksiteNavKey = 'vault' | 'rankings' | 'dictionary' | 'agents' | 'settings';

export const BLACKSITE_NAV_ICONS: Record<
  BlacksiteNavKey,
  { inactive: string; active: string }
> = {
  vault: {
    inactive: '/assets/blacksite/icons/navigation/vault.svg',
    active: '/assets/blacksite/icons/navigation/vault-active.svg',
  },
  rankings: {
    inactive: '/assets/blacksite/icons/navigation/rankings.svg',
    active: '/assets/blacksite/icons/navigation/rankings-active.svg',
  },
  dictionary: {
    inactive: '/assets/blacksite/icons/navigation/dictionary.svg',
    active: '/assets/blacksite/icons/navigation/dictionary-active.svg',
  },
  agents: {
    inactive: '/assets/blacksite/icons/navigation/agents.svg',
    active: '/assets/blacksite/icons/navigation/agents-active.svg',
  },
  settings: {
    inactive: '/assets/blacksite/icons/navigation/settings.svg',
    active: '/assets/blacksite/icons/navigation/settings-active.svg',
  },
} as const;

export const BLACKSITE_NAV_ARTWORK: Record<BlacksiteNavKey, string> = {
  vault: '/assets/blacksite/icons/navigation-artwork/vault.webp',
  rankings: '/assets/blacksite/icons/navigation-artwork/rankings.webp',
  dictionary: '/assets/blacksite/icons/navigation-artwork/dictionary.webp',
  agents: '/assets/blacksite/icons/navigation-artwork/agents.webp',
  settings: '/assets/blacksite/icons/navigation-artwork/settings.webp',
} as const;

export const BLACKSITE_ACTION_ICONS = {
  playOperation: '/assets/blacksite/icons/actions/play-operation.svg',
  onlineMultiplayer: '/assets/blacksite/icons/actions/online-multiplayer.svg',
  passAndPlay: '/assets/blacksite/icons/actions/pass-and-play.svg',
  addPlayer: '/assets/blacksite/icons/actions/add-player.svg',
  removePlayer: '/assets/blacksite/icons/actions/remove-player.svg',
  editPlayer: '/assets/blacksite/icons/actions/edit-player.svg',
  secureRoom: '/assets/blacksite/icons/actions/secure-room.svg',
  search: '/assets/blacksite/icons/actions/search.svg',
  backNav: '/assets/blacksite/icons/actions/back-nav.svg',
  help: '/assets/blacksite/icons/actions/help.svg',
  profile: '/assets/blacksite/icons/actions/profile.svg',
  secretVote: '/assets/blacksite/icons/actions/secret-vote.svg',
  shieldProtection: '/assets/blacksite/icons/actions/shield-protection.svg',
  specialAbility: '/assets/blacksite/icons/actions/special-ability.svg',
  timer: '/assets/blacksite/icons/actions/timer.svg',
  officialVerdict: '/assets/blacksite/icons/actions/official-verdict.svg',
} as const;

export type BlacksiteActionIconKey = keyof typeof BLACKSITE_ACTION_ICONS;

export const BLACKSITE_TEXTURES = {
  classifiedPaper: '/assets/blacksite/textures/classified-paper.svg',
  tacticalMap: '/assets/blacksite/textures/tactical-map.svg',
  technicalCarbon: '/assets/blacksite/textures/technical-carbon.svg',
  confidentialStamp: '/assets/blacksite/textures/confidential-stamp.svg',
  metallicSurface: '/assets/blacksite/textures/metallic-surface.svg',
  dossierOrnament: '/assets/blacksite/textures/dossier-ornament.svg',
} as const;

export const ROLE_PORTRAITS: Record<PlayerRole, string> = {
  citizen: citizenPortrait,
  undercover: undercoverPortrait,
  mrwhite: mrWhitePortrait,
  inspector: inspectorPortrait,
  fool: foolPortrait,
  boomerang: boomerangPortrait,
  protector: protectorPortrait,
  justice: justicePortrait,
  ghost: ghostPortrait,
  lovers: loversPortrait,
  avenger: avengerPortrait,
  mr_meme: mrMemePortrait,
};

export const ACHIEVEMENT_ASSETS = {
  firstWin: achFirstWin,
  sharpEye: achSharpEye,
  masterDetective: achMasterDetective,
  perfectDeduction: achPerfectDeduction,
  survivor: achSurvivor,
  agentVeteran: achAgentVeteran,
  masterOfLies: achMasterOfLies,
  socialStrategist: achSocialStrategist,
  specialRoleExpert: achSpecialRoleExpert,
  dailyOperation: achDailyOperation,
} as const;

export interface AchievementVisualItem {
  id: keyof typeof ACHIEVEMENT_ASSETS;
  icon: string;
  accent: 'amber' | 'cyan' | 'crimson' | 'blue';
  titles: { ar: string; en: string; fr: string };
  descriptions: { ar: string; en: string; fr: string };
}

export const ACHIEVEMENT_CATALOG: AchievementVisualItem[] = [
  {
    id: 'firstWin',
    icon: achFirstWin,
    accent: 'amber',
    titles: { ar: 'أول انتصار', en: 'First Win', fr: 'Première Victoire' },
    descriptions: {
      ar: 'حقّق أول انتصار لك في مهمة استخباراتية.',
      en: 'Secure your very first mission victory.',
      fr: 'Remportez votre toute première mission.',
    },
  },
  {
    id: 'sharpEye',
    icon: achSharpEye,
    accent: 'cyan',
    titles: { ar: 'عين ثاقبة', en: 'Sharp Eye', fr: 'Œil Aiguisé' },
    descriptions: {
      ar: 'اكشف متسللاً من خلال ملاحظة التلميح الخاطئ.',
      en: 'Spot an infiltrator from a single slip in their clue.',
      fr: 'Repérez un infiltré grâce à un indice suspect.',
    },
  },
  {
    id: 'masterDetective',
    icon: achMasterDetective,
    accent: 'blue',
    titles: { ar: 'كبير المحققين', en: 'Master Detective', fr: 'Maître Détective' },
    descriptions: {
      ar: 'قد التحقيق بنجاح في سلسلة جولات متتالية.',
      en: 'Lead accurate deductions across multiple operations.',
      fr: 'Menez l’enquête avec précision sur plusieurs manches.',
    },
  },
  {
    id: 'perfectDeduction',
    icon: achPerfectDeduction,
    accent: 'cyan',
    titles: { ar: 'استنتاج مثالي', en: 'Perfect Deduction', fr: 'Déduction Parfaite' },
    descriptions: {
      ar: 'أنهِ الجولة دون استبعاد أي عميل مدني.',
      en: 'Clear all infiltrators with zero civilian casualties.',
      fr: 'Éliminez les infiltrés sans perdre aucun civil.',
    },
  },
  {
    id: 'survivor',
    icon: achSurvivor,
    accent: 'amber',
    titles: { ar: 'الناجي', en: 'Survivor', fr: 'Survivant' },
    descriptions: {
      ar: 'ابقَ على قيد اللعب حتى اللحظة الحاسمة.',
      en: 'Outlast suspicion until the final showdown.',
      fr: 'Survivez aux soupçons jusqu’au dénouement final.',
    },
  },
  {
    id: 'agentVeteran',
    icon: achAgentVeteran,
    accent: 'amber',
    titles: { ar: 'عميل مخضرم', en: 'Agent Veteran', fr: 'Agent Vétéran' },
    descriptions: {
      ar: 'أكمل عدداً كبيراً من المهام الميدانية.',
      en: 'Complete a distinguished service record of matches.',
      fr: 'Accumulez un grand nombre de missions terminées.',
    },
  },
  {
    id: 'masterOfLies',
    icon: achMasterOfLies,
    accent: 'crimson',
    titles: { ar: 'سيد التمويه', en: 'Master of Lies', fr: 'Maître du Bluff' },
    descriptions: {
      ar: 'فُز بدور Mr. White أو المتخفّي عبر خداع الجميع.',
      en: 'Win as Undercover or Mr. White without blowing cover.',
      fr: 'Gagnez en Infiltré ou Mr. White sans vous faire repérer.',
    },
  },
  {
    id: 'socialStrategist',
    icon: achSocialStrategist,
    accent: 'blue',
    titles: { ar: 'الاستراتيجي الاجتماعي', en: 'Social Strategist', fr: 'Stratège Social' },
    descriptions: {
      ar: 'وجّه تصويت الطاولة بذكاء في اللحظات الحرجة.',
      en: 'Steer table consensus at decisive voting moments.',
      fr: 'Orientez les votes de la table aux moments clés.',
    },
  },
  {
    id: 'specialRoleExpert',
    icon: achSpecialRoleExpert,
    accent: 'cyan',
    titles: { ar: 'خبير الأدوار الخاصة', en: 'Special Role Expert', fr: 'Expert des Rôles Spéciaux' },
    descriptions: {
      ar: 'فعّل قدرات الأدوار الخاصة بفاعلية في الميدان.',
      en: 'Master layered special-role tactical abilities.',
      fr: 'Maîtrisez les capacités tactiques des rôles spéciaux.',
    },
  },
  {
    id: 'dailyOperation',
    icon: achDailyOperation,
    accent: 'amber',
    titles: { ar: 'العملية اليومية', en: 'Daily Operation', fr: 'Opération Quotidienne' },
    descriptions: {
      ar: 'حافظ على جاهزيتك الاستخباراتية بسلسلة انتصارات.',
      en: 'Maintain active field readiness across daily sessions.',
      fr: 'Maintenez votre série d’opérations quotidiennes.',
    },
  },
];

export const CATEGORY_COVERS: Record<'standard' | 'animals' | 'food' | 'places' | 'objects', string> = {
  standard: catStandard,
  animals: catAnimals,
  food: catFood,
  places: catPlaces,
  objects: catObjects,
};

/**
 * Artwork proposals only for potential future modes.
 * Do NOT expose or activate non-existent modes in gameplay logic.
 */
export const GAME_MODE_PROPOSALS = {
  classic: { id: 'classic', artwork: modeClassic, status: 'proposal_only' as const },
  rush: { id: 'rush', artwork: modeRush, status: 'proposal_only' as const },
  evidence: { id: 'evidence', artwork: modeEvidence, status: 'proposal_only' as const },
  noElimination: { id: 'no_elimination', artwork: modeNoElimination, status: 'proposal_only' as const },
} as const;

export const COSMETIC_FRAMES = {
  obsidian: frameObsidian,
  cyan: frameCyan,
  amber: frameAmber,
} as const;

export const COSMETIC_BADGES: Record<string, string> = {
  detective_badge: badgeDetective,
  extra_time: badgeTacticalWatch,
  spy_glasses: badgeStealthShades,
  golden_dossier: badgeClassifiedDossier,
  master_crown: badgeMastermindCrown,
};

export const COSMETIC_DOSSIERS = {
  navy: dossierNavy,
  classified: dossierClassified,
} as const;

export const COSMETIC_COLLECTIBLES = {
  cipherKey: collectibleCipherKey,
  agencySeal: collectibleAgencySeal,
} as const;
