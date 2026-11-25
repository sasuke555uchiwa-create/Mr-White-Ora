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
import {
  BottomActionBar,
  IconButton,
  InteractiveCard,
  ModalShell,
  NavButton,
  NavDock,
  SegmentedControl,
  TacticalButton,
  TacticalInput,
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

describe('BLACKSITE Phase 4.1 UI Design System & Home Ergonomics', () => {
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
        <TacticalButton variant="primary" size="sm">
          Deploy
        </TacticalButton>
        <IconButton aria-label="Options" size="sm">
          <span>*</span>
        </IconButton>
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

    fireEvent.click(screen.getByRole('button', { name: /ابدأ اللعب/i }));
    const rtlDialog = screen.getByRole('dialog', { name: 'اختر وضع التشغيل' });
    expect(rtlDialog).toBeTruthy();

    fireEvent.click(within(rtlDialog).getByRole('button', { name: /عمليات أونلاين/i }));
    expect(handlers.onShowOnline).toHaveBeenCalledTimes(1);
  });
});
