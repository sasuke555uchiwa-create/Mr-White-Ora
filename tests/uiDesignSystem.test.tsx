// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { saveSettings } from '../services/storageService';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../services/soundService', () => ({
  playSound: vi.fn(),
}));

import { WelcomeScreen } from '../components/WelcomeScreen';
import { PlayerSetup } from '../components/PlayerSetup';
import { GameSettingsScreen } from '../components/GameSettingsScreen';
import { VotingScreen } from '../components/VotingScreen';
import { ResultScreen } from '../components/ResultScreen';
import { ScoreboardScreen } from '../components/ScoreboardScreen';
import {
  BottomActionBar,
  DossierHeaderBand,
  IconButton,
  InteractiveCard,
  ModalShell,
  NavButton,
  NavDock,
  SectionDivider,
  SegmentedControl,
  TacticalButton,
  TacticalInput,
  TacticalToolbar,
} from '../components/ui/BlacksiteUI';

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

describe('BLACKSITE Phase 4.1 & 4.2 UI Design System & Home Ergonomics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', createMemoryStorage());
    mockUseAuth.mockReturnValue({
      user: null,
      profile: { displayName: 'Agent Vega', photoURL: '' },
      loading: false,
      isAdmin: false,
      isOffline: false,
      refreshProfile: vi.fn(),
      refreshAdminStatus: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    document.documentElement.dir = 'ltr';
  });

  it('enforces >=44px touch-target sizing and accessibility roles across BlacksiteUI primitives', () => {
    const onTabChange = vi.fn();
    const onClose = vi.fn();
    document.documentElement.dir = 'rtl';

    render(
      <div>
        <DossierHeaderBand
          title="Operation Setup"
          subtitle="Configure agents"
          badge={<span>BRIEFING</span>}
          action={
            <TacticalToolbar>
              <TacticalButton variant="primary" size="sm">
                Deploy
              </TacticalButton>
              <IconButton aria-label="Options" size="sm">
                <span>*</span>
              </IconButton>
            </TacticalToolbar>
          }
        />
        <SectionDivider label="Squad Roster" />
        <InteractiveCard>Option Card</InteractiveCard>
        <TacticalInput placeholder="Callsign" />
        <SegmentedControl
          value="one"
          onChange={onTabChange}
          ariaLabel="Mode Switch"
          options={[
            { value: 'one', label: 'First' },
            { value: 'two', label: 'Second' },
          ]}
        />
        <NavDock>
          <NavButton icon={<span>I</span>} label="Vault" active />
          <NavButton icon={<span>R</span>} label="Ranks" />
          <NavButton icon={<span>W</span>} label="Words" />
          <NavButton icon={<span>P</span>} label="Players" />
          <NavButton icon={<span>S</span>} label="Settings" />
        </NavDock>
        <BottomActionBar>
          <span>Sticky Bar</span>
        </BottomActionBar>
        <ModalShell onClose={onClose} ariaLabel="Confirm Dialog">
          <p>Dialog body</p>
        </ModalShell>
      </div>
    );

    expect(screen.getByText('Operation Setup')).toBeTruthy();
    expect(screen.getByText('Squad Roster')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deploy' }).className).toContain('min-h-[44px]');
    expect(screen.getByRole('button', { name: 'Options' }).className).toContain('min-h-[44px]');
    expect(screen.getByRole('button', { name: 'Option Card' }).className).toContain('min-h-[44px]');
    expect(screen.getByPlaceholderText('Callsign').className).toContain('blacksite-input');

    // RTL keyboard navigation moves forward on ArrowLeft
    const firstTab = screen.getByRole('tab', { name: 'First' });
    expect(firstTab.className).toContain('min-h-[44px]');
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith('two');

    const dialog = screen.getByRole('dialog', { name: 'Confirm Dialog' });
    expect(dialog).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders WelcomeScreen in English LTR with unified 5-tab NavDock and clean hero actions', () => {
    saveSettings({
      soundVolume: 0,
      hapticEnabled: false,
      language: 'en',
      theme: 'dark',
    });

    const handlers = {
      onStart: vi.fn(),
      onShowScoreboard: vi.fn(),
      onManagePlayers: vi.fn(),
      onOpenSettings: vi.fn(),
      onShowRules: vi.fn(),
      onShowProfile: vi.fn(),
      onShowOnline: vi.fn(),
      onShowDictionary: vi.fn(),
      onShowInventory: vi.fn(),
      onLanguageChange: vi.fn(),
    };

    render(<WelcomeScreen {...handlers} currentTheme="dark" />);

    expect(screen.getByText('Agent Vega')).toBeTruthy();
    expect(screen.getByText('MR. WHITE')).toBeTruthy();
    expect(screen.getByText('8 Special Roles')).toBeTruthy();

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    const ltrNavImgs = Array.from(nav.querySelectorAll('img')).map((img) => img.getAttribute('src'));
    expect(ltrNavImgs).toEqual([
      '/assets/blacksite/icons/navigation-artwork/vault.webp',
      '/assets/blacksite/icons/navigation-artwork/rankings.webp',
      '/assets/blacksite/icons/navigation-artwork/dictionary.webp',
      '/assets/blacksite/icons/navigation-artwork/agents.webp',
      '/assets/blacksite/icons/navigation-artwork/settings.webp',
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Vault/i }));
    expect(handlers.onShowInventory).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Online or Pass & Play/i }));
    const ltrDialog = screen.getByRole('dialog', { name: 'Select Operation Mode' });
    expect(ltrDialog).toBeTruthy();

    fireEvent.click(within(ltrDialog).getByRole('button', { name: /Pass & Play/i }));
    expect(handlers.onStart).toHaveBeenCalledTimes(1);
  });

  it('renders WelcomeScreen in Arabic RTL with localized NavDock labels and play modal', () => {
    saveSettings({
      soundVolume: 0,
      hapticEnabled: false,
      language: 'ar',
      theme: 'dark',
    });

    const handlers = {
      onStart: vi.fn(),
      onShowScoreboard: vi.fn(),
      onManagePlayers: vi.fn(),
      onOpenSettings: vi.fn(),
      onShowRules: vi.fn(),
      onShowProfile: vi.fn(),
      onShowOnline: vi.fn(),
      onShowDictionary: vi.fn(),
      onShowInventory: vi.fn(),
      onLanguageChange: vi.fn(),
    };

    render(<WelcomeScreen {...handlers} currentTheme="dark" />);

    expect(screen.getByText('المتخفي · MR. WHITE')).toBeTruthy();
    expect(screen.getByText('8 أدوار خاصة')).toBeTruthy();

    const nav = screen.getByRole('navigation', { name: 'التنقل الرئيسي' });
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    expect(nav.querySelectorAll('img')).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: /ابدأ اللعب/i }));
    const rtlDialog = screen.getByRole('dialog', { name: 'اختر وضع التشغيل' });
    expect(rtlDialog).toBeTruthy();

    fireEvent.click(within(rtlDialog).getByRole('button', { name: /عمليات أونلاين/i }));
    expect(handlers.onShowOnline).toHaveBeenCalledTimes(1);
  });

  it('renders Phase 4.2 transformed Pass & Play and Utility screens cleanly in LTR & RTL', () => {
    saveSettings({
      soundVolume: 0,
      hapticEnabled: false,
      language: 'en',
      theme: 'dark',
    });

    const samplePlayers = [
      { id: 0, name: 'Alpha', role: 'citizen' as const, isImpostor: false, score: 2, isEliminated: false, avatar: '' },
      { id: 1, name: 'Bravo', role: 'undercover' as const, isImpostor: true, score: 0, isEliminated: false, avatar: '' },
      { id: 2, name: 'Charlie', role: 'mrwhite' as const, isImpostor: true, score: 0, isEliminated: true, avatar: '' },
    ];

    const { unmount: unmountSetup } = render(<PlayerSetup onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Add Player/i })).toBeTruthy();
    unmountSetup();

    const { unmount: unmountSettings } = render(
      <GameSettingsScreen playersCount={5} onStart={vi.fn()} onBack={vi.fn()} />
    );
    expect(screen.getByText(/Special Roles/i)).toBeTruthy();
    unmountSettings();

    const { unmount: unmountVoting } = render(
      <VotingScreen players={samplePlayers} onVoteComplete={vi.fn()} currentRound={1} />
    );
    expect(screen.getByText('Alpha')).toBeTruthy();
    unmountVoting();

    const { unmount: unmountResult } = render(
      <ResultScreen
        players={samplePlayers}
        impostorIndex={2}
        secretWord="Coffee"
        undercoverWord="Tea"
        voteData={{ 0: 2 }}
        onGameEnd={vi.fn()}
        onNext={vi.fn()}
        roundWinner="citizens"
        winReason="impostor_caught"
      />
    );
    expect(screen.getByText('Coffee')).toBeTruthy();
    unmountResult();

    saveSettings({
      soundVolume: 0,
      hapticEnabled: false,
      language: 'ar',
      theme: 'dark',
    });
    document.documentElement.dir = 'rtl';
    render(<ScoreboardScreen onBack={vi.fn()} onOpenArchive={vi.fn()} />);
    expect(screen.getByText('RANKINGS')).toBeTruthy();
  });
});
