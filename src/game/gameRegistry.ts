export type GameTypeId = 'mr_white' | 'mafia_shadow_city' | 'case_zero';

export type GameRegistryStatus = 'playable' | 'coming_soon';

export interface GameTypeDefinition {
  id: GameTypeId;
  code: string;
  status: GameRegistryStatus;
  minPlayers: number;
  maxPlayers: number;
  supportsOnline: boolean;
  supportsPassAndPlay: boolean;
  titles: { ar: string; en: string; fr: string };
  subtitles: { ar: string; en: string; fr: string };
  descriptions: { ar: string; en: string; fr: string };
  statusLabels: { ar: string; en: string; fr: string };
  accent: 'gold' | 'crimson' | 'cyan';
}

export const GAME_MODE_REGISTRY: Record<GameTypeId, GameTypeDefinition> = {
  mr_white: {
    id: 'mr_white',
    code: 'OP-01',
    status: 'playable',
    minPlayers: 3,
    maxPlayers: 20,
    supportsOnline: true,
    supportsPassAndPlay: true,
    titles: {
      ar: 'المتخفي · MR. WHITE',
      en: 'MR. WHITE',
      fr: 'MR. WHITE',
    },
    subtitles: {
      ar: 'استنتاج الكلمة السرية',
      en: 'Secret Word Social Deduction',
      fr: 'Déduction Sociale · Mot Secret',
    },
    descriptions: {
      ar: 'المدنيون يملكون الكلمة، المتخفي لديه كلمة مشابهة، وMr. White بلا كلمة.',
      en: 'Civilians share a word, Undercover holds a decoy, and Mr. White improvises.',
      fr: 'Les civils partagent un mot, l’infiltré a un mot proche et Mr. White improvise.',
    },
    statusLabels: {
      ar: 'جاهز للعب',
      en: 'ACTIVE',
      fr: 'ACTIF',
    },
    accent: 'gold',
  },
  mafia_shadow_city: {
    id: 'mafia_shadow_city',
    code: 'OP-02',
    status: 'playable',
    minPlayers: 6,
    maxPlayers: 14,
    supportsOnline: false,
    supportsPassAndPlay: true,
    titles: {
      ar: 'مافيا: مدينة الظلال',
      en: 'MAFIA: SHADOW CITY',
      fr: 'MAFIA : CITÉ DES OMBRES',
    },
    subtitles: {
      ar: 'صراع الليل والنهار السري',
      en: 'Night & Day Hidden Factions',
      fr: 'Factions Cachées · Nuit & Jour',
    },
    descriptions: {
      ar: 'تحدي الليل والنهار بين المدينة والمافيا مع المحقق والطبيب وزعيم المافيا على جهاز واحد.',
      en: 'Standalone pass-and-play deduction with Detective, Doctor, and Mafia Boss.',
      fr: 'Mode autonome Passe & Joue avec Détective, Médecin et Parrain.',
    },
    statusLabels: {
      ar: 'نفس الجهاز',
      en: 'PASS & PLAY',
      fr: 'PASSE & JOUE',
    },
    accent: 'crimson',
  },
  case_zero: {
    id: 'case_zero',
    code: 'OP-03',
    status: 'coming_soon',
    minPlayers: 4,
    maxPlayers: 10,
    supportsOnline: false,
    supportsPassAndPlay: false,
    titles: {
      ar: 'القضية صفر · CASE ZERO',
      en: 'CASE ZERO',
      fr: 'DOSSIER ZÉRO',
    },
    subtitles: {
      ar: 'ملف تحقيق قادم',
      en: 'Upcoming Investigation Dossier',
      fr: 'Prochain Dossier d’Enquête',
    },
    descriptions: {
      ar: 'طور استخباراتي مستقبلي قيد التحضير ضمن عالم BLACKSITE.',
      en: 'Future BLACKSITE investigation universe currently in development.',
      fr: 'Futur univers d’enquête BLACKSITE en cours de préparation.',
    },
    statusLabels: {
      ar: 'قريباً',
      en: 'COMING SOON',
      fr: 'BIENTÔT',
    },
    accent: 'cyan',
  },
};

export function getGameDefinition(id: GameTypeId): GameTypeDefinition {
  return GAME_MODE_REGISTRY[id];
}

export function getAllGameDefinitions(): GameTypeDefinition[] {
  return [
    GAME_MODE_REGISTRY.mr_white,
    GAME_MODE_REGISTRY.mafia_shadow_city,
    GAME_MODE_REGISTRY.case_zero,
  ];
}

export function getPlayableGameDefinitions(): GameTypeDefinition[] {
  return getAllGameDefinitions().filter((g) => g.status === 'playable');
}
