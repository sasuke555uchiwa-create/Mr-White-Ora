import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CHARACTER_AVATARS, SPECIAL_ROLES, getRoleAsset, getRoleVisualIdentity } from '../data/specialRoles';
import {
  ACHIEVEMENT_ASSETS,
  ACHIEVEMENT_CATALOG,
  BLACKSITE_ACTION_ICONS,
  BLACKSITE_BACKGROUNDS,
  BLACKSITE_NAV_ICONS,
  BLACKSITE_TEXTURES,
  CATEGORY_COVERS,
  COSMETIC_BADGES,
  COSMETIC_COLLECTIBLES,
  COSMETIC_DOSSIERS,
  COSMETIC_FRAMES,
  GAME_MODE_PROPOSALS,
  HERO_ASSETS,
  ROLE_PORTRAITS,
  SCREEN_BACKGROUND_MAP,
} from '../src/design/assetRegistry';
import { SOUND_EFFECT_LIST, SoundType, playSound } from '../services/soundService';
import { GamePhase, PlayerRole } from '../types';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');

function resolvePublicOrRoot(urlPath: string): string {
  const rel = urlPath.replace(/^\/+/, '');
  const inPublic = path.join(PUBLIC_DIR, rel);
  if (fs.existsSync(inPublic)) return inPublic;
  return path.join(ROOT, rel);
}

describe('PWA Manifest, Service Worker & HTML Entry Validation', () => {
  it('validates public/manifest.webmanifest structure and verifies every icon file exists and is non-empty', () => {
    const manifestPath = path.join(PUBLIC_DIR, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.name).toBe('MR. WHITE — BLACKSITE');
    expect(manifest.short_name).toBe('BLACKSITE');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#080B10');
    expect(manifest.theme_color).toBe('#080B10');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    for (const icon of manifest.icons) {
      expect(typeof icon.src).toBe('string');
      const diskPath = path.join(PUBLIC_DIR, icon.src.replace(/^\/+/, ''));
      expect(fs.existsSync(diskPath), `Missing manifest icon: ${icon.src}`).toBe(true);
      expect(fs.statSync(diskPath).size).toBeGreaterThan(0);
    }
  });

  it('validates public/sw.js SHELL_ASSETS exist on disk and BYPASS_HOSTS protects Firebase/Auth calls', () => {
    const swPath = path.join(PUBLIC_DIR, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const swSource = fs.readFileSync(swPath, 'utf8');

    const shellMatch = swSource.match(/const SHELL_ASSETS = \[([\s\S]*?)\];/);
    expect(shellMatch).not.toBeNull();
    const assetMatches = Array.from(shellMatch![1].matchAll(/'([^']+)'/g)).map((m) => m[1]);
    expect(assetMatches.length).toBeGreaterThan(10);

    for (const asset of assetMatches) {
      if (asset === '/') continue;
      const diskPath = resolvePublicOrRoot(asset);
      expect(fs.existsSync(diskPath), `Missing SW precache asset: ${asset}`).toBe(true);
      expect(fs.statSync(diskPath).size).toBeGreaterThan(0);
    }

    expect(swSource).toContain("'firestore.googleapis.com'");
    expect(swSource).toContain("'identitytoolkit.googleapis.com'");
    expect(swSource).toContain("'securetoken.googleapis.com'");
    expect(swSource).toContain("'cloudfunctions.net'");
    expect(swSource).toContain("url.pathname.startsWith('/api/')");
  });

  it('validates index.html title, BLACKSITE metadata, manifest, icons, SW script, and entry module', () => {
    const htmlPath = path.join(ROOT, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    expect(html).toContain('<title>MR. WHITE — BLACKSITE</title>');
    expect(html).toContain('property="og:title" content="MR. WHITE — BLACKSITE"');
    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).toContain('href="/images/game_logo.webp"');
    expect(html).toContain('href="/assets/roles/undercover_agent.png"');
    expect(html).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(html).toContain('src="/index.tsx"');

    for (const ref of ['/manifest.webmanifest', '/images/game_logo.webp', '/assets/roles/undercover_agent.png', '/sw.js', '/index.tsx']) {
      const target = resolvePublicOrRoot(ref);
      expect(fs.existsSync(target), `Missing HTML asset: ${ref}`).toBe(true);
    }
  });
});

describe('BLACKSITE Asset Registry & Special Roles Integrity', () => {
  it('verifies every static asset import in src/design/assetRegistry.ts exists on disk and is non-empty', () => {
    const registryPath = path.join(ROOT, 'src', 'design', 'assetRegistry.ts');
    const registrySrc = fs.readFileSync(registryPath, 'utf8');
    const importPaths = Array.from(registrySrc.matchAll(/from\s+'(\.\.\/assets\/[^']+)'/g)).map(
      (m) => m[1]
    );
    expect(importPaths.length).toBeGreaterThanOrEqual(30);

    for (const rel of importPaths) {
      const resolved = path.resolve(path.dirname(registryPath), rel);
      expect(fs.existsSync(resolved), `Missing registry asset file: ${rel}`).toBe(true);
      expect(fs.statSync(resolved).size).toBeGreaterThan(0);
    }

    expect(Object.keys(HERO_ASSETS)).toHaveLength(3);
    expect(Object.keys(ROLE_PORTRAITS)).toHaveLength(12);
    expect(Object.keys(ACHIEVEMENT_ASSETS)).toHaveLength(10);
    expect(ACHIEVEMENT_CATALOG).toHaveLength(10);
    expect(Object.keys(CATEGORY_COVERS)).toEqual(['standard', 'animals', 'food', 'places', 'objects']);
    expect(Object.keys(GAME_MODE_PROPOSALS)).toHaveLength(4);
    expect(Object.keys(COSMETIC_FRAMES)).toHaveLength(3);
    expect(Object.keys(COSMETIC_BADGES)).toHaveLength(5);
    expect(Object.keys(COSMETIC_DOSSIERS)).toHaveLength(2);
    expect(Object.keys(COSMETIC_COLLECTIBLES)).toHaveLength(2);
  });

  it('verifies specialRoles definitions, role portraits, trilingual visual identities, and avatar files', () => {
    expect(SPECIAL_ROLES).toHaveLength(8);
    const allRoles: PlayerRole[] = [
      'citizen',
      'undercover',
      'mrwhite',
      'inspector',
      'fool',
      'boomerang',
      'protector',
      'justice',
      'ghost',
      'lovers',
      'avenger',
      'mr_meme',
    ];

    for (const role of allRoles) {
      expect(getRoleAsset(role)).toBeTruthy();
      for (const lang of ['ar', 'en', 'fr']) {
        const visual = getRoleVisualIdentity(role, lang);
        expect(visual.stamp.length).toBeGreaterThan(0);
        expect(visual.abilityLabel.length).toBeGreaterThan(0);
      }
    }

    for (const avatar of CHARACTER_AVATARS) {
      expect(avatar.src).toBeTruthy();
      if (avatar.src.startsWith('/assets/')) {
        const onDisk = resolvePublicOrRoot(avatar.src);
        expect(fs.existsSync(onDisk), `Missing avatar asset: ${avatar.src}`).toBe(true);
      }
    }
  });

  it('validates Phase 4.2 BLACKSITE portrait backgrounds, custom nav icons, action icons, textures, and per-screen lazy integration', () => {
    // 1. Nine portrait backgrounds (1080x1920 WebP)
    expect(Object.keys(BLACKSITE_BACKGROUNDS)).toHaveLength(9);
    for (const bg of Object.values(BLACKSITE_BACKGROUNDS)) {
      expect(bg.src.startsWith('/assets/blacksite/backgrounds/')).toBe(true);
      const diskPath = resolvePublicOrRoot(bg.src);
      expect(fs.existsSync(diskPath), `Missing background asset: ${bg.src}`).toBe(true);
      expect(fs.statSync(diskPath).size).toBeGreaterThan(1000);
    }

    // 2. Every GamePhase maps to a valid background key
    for (const phase of Object.values(GamePhase)) {
      const bgKey = SCREEN_BACKGROUND_MAP[phase];
      expect(bgKey, `Missing SCREEN_BACKGROUND_MAP entry for ${phase}`).toBeDefined();
      expect(BLACKSITE_BACKGROUNDS[bgKey]).toBeDefined();
    }

    // 3. Custom bottom-nav SVG pairs (inactive + active = 10 files)
    expect(Object.keys(BLACKSITE_NAV_ICONS)).toHaveLength(5);
    for (const navPair of Object.values(BLACKSITE_NAV_ICONS)) {
      for (const svgUrl of [navPair.inactive, navPair.active]) {
        const diskPath = resolvePublicOrRoot(svgUrl);
        expect(fs.existsSync(diskPath), `Missing nav icon SVG: ${svgUrl}`).toBe(true);
        const svgContent = fs.readFileSync(diskPath, 'utf8');
        expect(svgContent).toContain('<svg');
        expect(svgContent).toContain('</svg>');
      }
    }

    // 4. 16 reusable BLACKSITE action icons
    expect(Object.keys(BLACKSITE_ACTION_ICONS)).toHaveLength(16);
    for (const svgUrl of Object.values(BLACKSITE_ACTION_ICONS)) {
      const diskPath = resolvePublicOrRoot(svgUrl);
      expect(fs.existsSync(diskPath), `Missing action icon SVG: ${svgUrl}`).toBe(true);
      const svgContent = fs.readFileSync(diskPath, 'utf8');
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('</svg>');
    }

    // 5. 6 tactical textures, stamps & dossier ornaments
    expect(Object.keys(BLACKSITE_TEXTURES)).toHaveLength(6);
    for (const svgUrl of Object.values(BLACKSITE_TEXTURES)) {
      const diskPath = resolvePublicOrRoot(svgUrl);
      expect(fs.existsSync(diskPath), `Missing texture SVG: ${svgUrl}`).toBe(true);
      const svgContent = fs.readFileSync(diskPath, 'utf8');
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('</svg>');
    }

    // 6. All 21 interactive screen components integrate BlacksiteScreenBackdrop directly
    const integratedScreens = [
      'WelcomeScreen.tsx',
      'PlayerSetup.tsx',
      'GameSettingsScreen.tsx',
      'GameRound.tsx',
      'QuestionPhase.tsx',
      'DiscussionPhase.tsx',
      'VotingScreen.tsx',
      'RevealVoteResult.tsx',
      'ImpostorGuessScreen.tsx',
      'ResultScreen.tsx',
      'ScoreboardScreen.tsx',
      'OnlineRoomsScreen.tsx',
      'OnlineLobbyScreen.tsx',
      'OnlineGameScreen.tsx',
      'CaseFileScreen.tsx',
      'OperationArchiveScreen.tsx',
      'ProfileScreen.tsx',
      'InventoryScreen.tsx',
      'LanguageDictionary.tsx',
      'SettingsScreen.tsx',
      'RulesScreen.tsx',
    ];
    for (const screenFile of integratedScreens) {
      const filePath = path.join(ROOT, 'components', screenFile);
      const src = fs.readFileSync(filePath, 'utf8');
      expect(src, `${screenFile} missing BlacksiteScreenBackdrop`).toContain('BlacksiteScreenBackdrop');
    }

    // 7. Portrait backgrounds remain lazy-loaded per active screen (not bulk-precached in sw.js)
    const swSrc = fs.readFileSync(path.join(PUBLIC_DIR, 'sw.js'), 'utf8');
    expect(swSrc).not.toContain('/assets/blacksite/backgrounds/');
  });
});

describe('Sound Synthesis & Sound Registry Validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ALL_SOUNDS: SoundType[] = [
    'click',
    'reveal',
    'dramatic',
    'win',
    'vote',
    'pop',
    'mystery',
    'trumpets_sad',
    'cardFlip',
    'passPhone',
    'tick',
    'timeUp',
    'shield',
    'boomerang',
    'eliminate',
    'mrWhiteCaught',
    'mrWhiteWin',
    'startGame',
    'error',
    'dossierOpen',
    'accessGranted',
    'roleReveal',
    'handoff',
    'voteConfirm',
    'voteClose',
    'abilityActivate',
    'guessPhase',
    'verdict',
  ];

  it('validates SOUND_EFFECT_LIST provides Arabic, English, and French labels', () => {
    expect(SOUND_EFFECT_LIST.length).toBeGreaterThanOrEqual(20);
    for (const meta of SOUND_EFFECT_LIST) {
      expect(meta.labels.ar.trim().length).toBeGreaterThan(0);
      expect(meta.labels.en.trim().length).toBeGreaterThan(0);
      expect(meta.labels.fr.trim().length).toBeGreaterThan(0);
    }
  });

  it('safely no-ops during SSR when window is undefined and synthesizes all 28 sounds cleanly with Web Audio API', () => {
    vi.stubGlobal('window', undefined);
    for (const s of ALL_SOUNDS) {
      expect(() => playSound(s)).not.toThrow();
    }

    const makeAudioParam = () => ({
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    });
    const makeNode = () => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: makeAudioParam(),
      detune: makeAudioParam(),
      Q: makeAudioParam(),
      gain: { ...makeAudioParam(), context: null as any },
      threshold: makeAudioParam(),
      knee: makeAudioParam(),
      ratio: makeAudioParam(),
      attack: makeAudioParam(),
      release: makeAudioParam(),
      type: 'sine',
      buffer: null,
    });

    class MockAudioContext {
      currentTime = 0;
      sampleRate = 44100;
      state = 'suspended';
      destination = {};
      resume = vi.fn().mockResolvedValue(undefined);
      createDynamicsCompressor = () => makeNode();
      createGain = () => {
        const g = makeNode();
        g.gain.context = this;
        return g;
      };
      createOscillator = () => makeNode();
      createBiquadFilter = () => makeNode();
      createBufferSource = () => makeNode();
      createBuffer = () => ({
        sampleRate: this.sampleRate,
        getChannelData: () => new Float32Array(this.sampleRate),
      });
    }

    const memStore: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memStore[k] ?? null,
      setItem: (k: string, v: string) => {
        memStore[k] = v;
      },
      removeItem: (k: string) => {
        delete memStore[k];
      },
    });
    vi.stubGlobal('navigator', { vibrate: vi.fn() });
    vi.stubGlobal('window', {
      AudioContext: MockAudioContext,
      addEventListener: vi.fn(),
    });

    for (const s of ALL_SOUNDS) {
      expect(() => playSound(s)).not.toThrow();
    }
  });
});
