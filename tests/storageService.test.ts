import { describe, it, expect, beforeEach, vi } from 'vitest';

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

describe('storageService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  it('strips legacy insecure isAdmin flag during schema v2 migration', async () => {
    localStorage.setItem(
      'chkoun_barra_settings',
      JSON.stringify({
        language: 'ar',
        theme: 'dark',
        soundVolume: 0.8,
        hapticEnabled: true,
        isAdmin: true,
      })
    );

    const storage = await import('../services/storageService');
    const migratedRaw = JSON.parse(localStorage.getItem('chkoun_barra_settings') || '{}');
    expect(migratedRaw.isAdmin).toBeUndefined();
    expect(localStorage.getItem('chkoun_barra_schema_version')).toBe('2');

    const settings = storage.getSettings();
    expect(settings.soundVolume).toBe(0.8);
    expect((settings as unknown as Record<string, unknown>).isAdmin).toBeUndefined();
  });

  it('recovers cleanly from corrupt JSON in localStorage without crashing', async () => {
    localStorage.setItem('chkoun_barra_recent_players', '{bad json');
    localStorage.setItem('chkoun_barra_scores', 'not-valid');
    localStorage.setItem('chkoun_barra_settings', '<<<corrupt>>>');

    const storage = await import('../services/storageService');
    expect(storage.getRecentPlayers()).toEqual([]);
    expect(storage.getScores()).toEqual({});
    expect(storage.getSettings()).toEqual({
      soundVolume: 1.0,
      hapticEnabled: true,
      language: 'ar',
      theme: 'dark',
      buttonColor: 'default',
      avatar: '👤',
    });
  });

  it('sanitizes and clamps settings fields on read and save', async () => {
    const storage = await import('../services/storageService');
    const sanitized = storage.sanitizeSettings({
      soundVolume: 5,
      hapticEnabled: 'yes',
      language: 'invalid_lang',
      theme: 'neon',
      buttonColor: 'gold',
      avatar: '😎',
    });

    expect(sanitized.soundVolume).toBe(1);
    expect(sanitized.hapticEnabled).toBe(true);
    expect(sanitized.language).toBe('ar');
    expect(sanitized.theme).toBe('dark');
    expect(sanitized.buttonColor).toBe('default');
    expect(sanitized.avatar).toBe('😎');
  });

  it('normalizes legacy shop perk IDs and filters removed ad_block items', async () => {
    localStorage.setItem(
      'chkoun_barra_inventory',
      JSON.stringify({
        Ali: ['chechia', 'mint_tea', 'ad_block', 'gold_cup'],
      })
    );

    const storage = await import('../services/storageService');
    expect(storage.getPlayerInventory('Ali')).toEqual([
      'detective_badge',
      'extra_time',
      'master_crown',
    ]);
    expect(storage.hasPlayerPerk('Ali', 'detective_badge')).toBe(true);
    expect(storage.hasPlayerPerk('Ali', 'ad_block')).toBe(false);
  });
});
