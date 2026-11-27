import { describe, it, expect } from 'vitest';
import { OPERATION_EVENTS, pickOperationEvent } from '../data/operationEvents';
import {
  CHALLENGE_INTERACTION_STYLES,
  CHALLENGE_TOPIC_PACKS,
  ChallengeLanguage,
  QUESTION_LIBRARY,
} from '../data/questionLibrary';
import {
  getChallengeLibraryCoverage,
  normalizeChallengeLanguage,
  pickChallengePrompt,
  queryChallengePrompts,
} from '../src/game/questionLibraryEngine';
import {
  GAME_MODE_REGISTRY,
  getAllGameDefinitions,
  getPlayableGameDefinitions,
} from '../src/game/gameRegistry';

describe('Phase 5.0 Content Expansion: Operation Events, Challenge Library & Game Registry', () => {
  it('validates all Operation Events are non-leaking, score-neutral, trilingual, and filterable by mode', () => {
    expect(OPERATION_EVENTS.length).toBeGreaterThanOrEqual(15);

    const ids = new Set<string>();
    for (const evt of OPERATION_EVENTS) {
      expect(ids.has(evt.id)).toBe(false);
      ids.add(evt.id);
      expect(evt.exposesSecretInfo).toBe(false);
      expect(evt.modifiesScoring).toBe(false);
      expect(evt.titles.ar.trim().length).toBeGreaterThan(0);
      expect(evt.titles.en.trim().length).toBeGreaterThan(0);
      expect(evt.titles.fr.trim().length).toBeGreaterThan(0);
      expect(evt.rules.ar.trim().length).toBeGreaterThan(0);
      expect(evt.rules.en.trim().length).toBeGreaterThan(0);
      expect(evt.rules.fr.trim().length).toBeGreaterThan(0);
    }

    const exprEvt = pickOperationEvent({
      gameMode: 'expression',
      round: 1,
      rng: () => 0,
    });
    expect(['both', 'expression']).toContain(exprEvt.modeCompatibility);

    const questEvt = pickOperationEvent({
      gameMode: 'question',
      round: 2,
      excludeIds: [exprEvt.id],
      rng: () => 0.5,
    });
    expect(['both', 'question']).toContain(questEvt.modeCompatibility);
  });

  it('validates Offline Question & Challenge Library covers 4 languages (incl. tn), 10 topic packs, 6 styles, and both difficulties', () => {
    const coverage = getChallengeLibraryCoverage();
    expect(coverage.totalPrompts).toBeGreaterThanOrEqual(50);
    expect(coverage.topicPacksCount).toBe(10);
    expect(coverage.stylesCount).toBe(6);
    expect(coverage.languages).toEqual(['ar', 'tn', 'en', 'fr']);
    expect(coverage.difficulties).toEqual(['easy', 'hard']);

    const langs: ChallengeLanguage[] = ['ar', 'tn', 'en', 'fr'];
    for (const item of QUESTION_LIBRARY) {
      for (const l of langs) {
        expect(item.prompts[l].trim().length, `Missing ${l} prompt on ${item.id}`).toBeGreaterThan(0);
      }
    }

    // Verify all 10 topic packs and all 6 styles have prompts
    for (const pack of CHALLENGE_TOPIC_PACKS) {
      expect(queryChallengePrompts({ topicPack: pack.id }).length).toBeGreaterThanOrEqual(4);
    }
    for (const style of CHALLENGE_INTERACTION_STYLES) {
      expect(queryChallengePrompts({ style: style.id }).length).toBeGreaterThanOrEqual(6);
    }

    expect(queryChallengePrompts({ difficulty: 'easy' }).length).toBeGreaterThan(15);
    expect(queryChallengePrompts({ difficulty: 'hard' }).length).toBeGreaterThan(15);
    expect(normalizeChallengeLanguage('tn')).toBe('tn');
    expect(normalizeChallengeLanguage('sa')).toBe('ar');
    expect(normalizeChallengeLanguage('fr')).toBe('fr');
    expect(normalizeChallengeLanguage('de')).toBe('en');

    const picked = pickChallengePrompt({
      language: 'tn',
      topicPack: 'everyday_life',
      difficulty: 'easy',
      rng: () => 0.1,
    });
    expect(picked).not.toBeNull();
    expect(picked?.topicPack).toBe('everyday_life');
  });

  it('validates Game Universe Registry entries (mr_white, mafia_shadow_city, case_zero)', () => {
    const all = getAllGameDefinitions();
    const playable = getPlayableGameDefinitions();

    expect(all.map((g) => g.id)).toEqual(['mr_white', 'mafia_shadow_city', 'case_zero']);
    expect(playable.map((g) => g.id)).toEqual(['mr_white', 'mafia_shadow_city']);
    expect(GAME_MODE_REGISTRY.mafia_shadow_city.minPlayers).toBe(6);
    expect(GAME_MODE_REGISTRY.mafia_shadow_city.maxPlayers).toBe(14);
    expect(GAME_MODE_REGISTRY.case_zero.status).toBe('coming_soon');
    expect(GAME_MODE_REGISTRY.case_zero.supportsOnline).toBe(false);
    expect(GAME_MODE_REGISTRY.case_zero.supportsPassAndPlay).toBe(false);
  });
});
