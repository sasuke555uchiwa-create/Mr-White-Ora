import { getSettings, getCustomWordPairs, getHiddenWords } from "./storageService";
import { WORD_PAIRS } from "../data/offlineData";
import { pickWordPairFromData } from "../src/game/wordEngine";

// This service operates completely offline with the local multilingual dictionary and custom words.
export const getRandomWordPair = async (
  language?: string,
  category: string = 'standard'
): Promise<{ civilianWord: string; undercoverWord: string; decoys: string[] }> => {
  const settings = getSettings();
  const lang = language || settings.language || 'ar';
  const customPairs = getCustomWordPairs();
  const hiddenWords = getHiddenWords();

  return pickWordPairFromData(WORD_PAIRS, lang, category, customPairs, hiddenWords);
};

export const generateAvatar = async (_userPrompt: string): Promise<string> => {
  const colors = ['#FF9F1C', '#FFBF69', '#CBF3F0', '#2EC4B6', '#FFFFFF'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${randomColor}" />
      <text x="50" y="55" font-family="Arial" font-size="40" text-anchor="middle" fill="#333">👤</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};
