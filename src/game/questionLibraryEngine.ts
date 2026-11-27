import {
  CHALLENGE_INTERACTION_STYLES,
  CHALLENGE_TOPIC_PACKS,
  ChallengeDifficulty,
  ChallengeInteractionStyle,
  ChallengeLanguage,
  ChallengePrompt,
  ChallengeTopicPack,
  QUESTION_LIBRARY,
} from '../../data/questionLibrary';

export interface QueryChallengeOptions {
  language?: ChallengeLanguage;
  topicPack?: ChallengeTopicPack | 'all';
  style?: ChallengeInteractionStyle | 'all';
  difficulty?: ChallengeDifficulty | 'all';
  search?: string;
}

export function normalizeChallengeLanguage(lang: string): ChallengeLanguage {
  if (lang === 'tn') return 'tn';
  if (lang === 'ar' || lang === 'sa') return 'ar';
  if (lang === 'fr') return 'fr';
  return 'en';
}

export function queryChallengePrompts(options: QueryChallengeOptions = {}): ChallengePrompt[] {
  const {
    language = 'ar',
    topicPack = 'all',
    style = 'all',
    difficulty = 'all',
    search = '',
  } = options;

  const q = search.trim().toLowerCase();

  return QUESTION_LIBRARY.filter((item) => {
    if (topicPack !== 'all' && item.topicPack !== topicPack) return false;
    if (style !== 'all' && item.style !== style) return false;
    if (difficulty !== 'all' && item.difficulty !== difficulty) return false;
    if (q) {
      const text = (item.prompts[language] || item.prompts.en).toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

export function pickChallengePrompt(
  options: QueryChallengeOptions & { excludeIds?: string[]; rng?: () => number } = {}
): ChallengePrompt | null {
  const { excludeIds = [], rng = Math.random, ...query } = options;
  const matches = queryChallengePrompts(query);
  if (matches.length === 0) return null;
  const fresh = matches.filter((m) => !excludeIds.includes(m.id));
  const pool = fresh.length > 0 ? fresh : matches;
  const idx = Math.floor(rng() * pool.length);
  return pool[Math.min(pool.length - 1, Math.max(0, idx))];
}

export function getChallengeLibraryCoverage() {
  return {
    totalPrompts: QUESTION_LIBRARY.length,
    topicPacksCount: CHALLENGE_TOPIC_PACKS.length,
    stylesCount: CHALLENGE_INTERACTION_STYLES.length,
    languages: ['ar', 'tn', 'en', 'fr'] as ChallengeLanguage[],
    difficulties: ['easy', 'hard'] as ChallengeDifficulty[],
  };
}
