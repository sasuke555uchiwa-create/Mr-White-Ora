export type WordPairTuple = [string, string];

export interface CustomWordPairInput {
  word1: string;
  word2: string;
  language: string;
  category?: string;
}

export interface WordSelectionResult {
  civilianWord: string;
  undercoverWord: string;
  decoys: string[];
}

/**
 * Normalizes Arabic and Latin words for resilient Mr. White secret word matching.
 * Strips Arabic diacritics, normalizes Alef / Teh Marbuta / Alef Maksura, strips leading "ال",
 * and collapses whitespace.
 */
export function normalizeGuessWord(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^ال/, '')
    .replace(/\s+/g, ' ');
}

/**
 * Evaluates whether a Mr. White guess matches the civilian secret word.
 */
export function isMrWhiteGuessMatch(guess: string, secretWord: string): boolean {
  const trimmedGuess = String(guess || '').trim();
  const trimmedSecret = String(secretWord || '').trim();
  if (!trimmedGuess || !trimmedSecret) return false;

  if (trimmedGuess.toLowerCase() === trimmedSecret.toLowerCase()) {
    return true;
  }

  const normGuess = normalizeGuessWord(trimmedGuess);
  const normSecret = normalizeGuessWord(trimmedSecret);
  return normGuess.length > 0 && normGuess === normSecret;
}

export function pickWordPairFromData(
  wordPairsMap: Record<string, Record<string, WordPairTuple[]>>,
  language: string = 'ar',
  category: string = 'standard',
  customPairs: CustomWordPairInput[] = [],
  hiddenWords: string[] = [],
  rng: () => number = Math.random
): WordSelectionResult {
  const langPairs = wordPairsMap[language] || wordPairsMap['ar'] || {};
  const basePairs = langPairs[category] || langPairs['standard'] || [];
  let pairs: WordPairTuple[] = [...basePairs];

  const matchingCustom = customPairs.filter(
    (p) => p.language === language && (category === 'standard' || p.category === category)
  );
  matchingCustom.forEach((p) => {
    if (p.word1?.trim() && p.word2?.trim()) {
      pairs.push([p.word1.trim(), p.word2.trim()]);
    }
  });

  if (hiddenWords.length > 0) {
    const hiddenSet = new Set(hiddenWords.map((w) => normalizeGuessWord(w)));
    const visiblePairs = pairs.filter(
      ([w1, w2]) => !hiddenSet.has(normalizeGuessWord(w1)) && !hiddenSet.has(normalizeGuessWord(w2))
    );
    if (visiblePairs.length > 0) {
      pairs = visiblePairs;
    }
  }

  if (pairs.length === 0) {
    return { civilianWord: 'Apple', undercoverWord: 'Orange', decoys: [] };
  }

  const randomPair = pairs[Math.floor(rng() * pairs.length)];
  const isSwapped = rng() > 0.5;
  const civilianWord = isSwapped ? randomPair[1] : randomPair[0];
  const undercoverWord = isSwapped ? randomPair[0] : randomPair[1];

  const allWords = pairs.flat();
  const decoys = allWords
    .filter((w) => w !== civilianWord && w !== undercoverWord)
    .sort(() => 0.5 - rng())
    .slice(0, 9);

  return { civilianWord, undercoverWord, decoys };
}
