import { PlayerRole } from '../../types';

/**
 * MR. WHITE — BLACKSITE (Visual Identity 2.0)
 * Unified Intelligence Design Tokens & Role Presets
 */
export const BLACKSITE_TOKENS = {
  identity: 'MR. WHITE — BLACKSITE',
  palette: {
    foundations: {
      obsidian: '#080B10',
      deepNavy: '#0D1219',
      gunmetal: '#151C25',
      steelSurface: '#202B36',
    },
    accents: {
      gold: '#B49A62',
      cyan: '#668F9A',
      crimson: '#963F46',
      emerald: '#3E7B67',
      ochre: '#A46F44',
      silver: '#A8B1BA',
    },
    text: {
      primary: '#ECEFF4',
      secondary: '#A8B1BA',
      muted: '#6E7985',
    },
    borders: {
      subtle: 'rgba(168, 177, 186, 0.14)',
      strong: 'rgba(168, 177, 186, 0.25)',
      goldClassification: 'rgba(180, 154, 98, 0.38)',
      cyanActive: 'rgba(102, 143, 154, 0.42)',
      crimsonAlert: 'rgba(150, 63, 70, 0.45)',
    },
  },
  roleColors: {
    citizen: { primary: '#668F9A', tint: 'rgba(102, 143, 154, 0.14)', border: 'rgba(102, 143, 154, 0.38)' },
    undercover: { primary: '#A46F44', tint: 'rgba(164, 111, 68, 0.16)', border: 'rgba(164, 111, 68, 0.42)' },
    mrwhite: { primary: '#B49A62', tint: 'rgba(180, 154, 98, 0.14)', border: 'rgba(180, 154, 98, 0.42)' },
    inspector: { primary: '#6E8EA8', tint: 'rgba(110, 142, 168, 0.14)', border: 'rgba(110, 142, 168, 0.38)' },
    fool: { primary: '#9A8866', tint: 'rgba(154, 136, 102, 0.15)', border: 'rgba(154, 136, 102, 0.38)' },
    boomerang: { primary: '#963F46', tint: 'rgba(150, 63, 70, 0.16)', border: 'rgba(150, 63, 70, 0.42)' },
    protector: { primary: '#5A819E', tint: 'rgba(90, 129, 158, 0.15)', border: 'rgba(90, 129, 158, 0.4)' },
    justice: { primary: '#3E7B67', tint: 'rgba(62, 123, 103, 0.15)', border: 'rgba(62, 123, 103, 0.4)' },
    ghost: { primary: '#668F9A', tint: 'rgba(102, 143, 154, 0.14)', border: 'rgba(102, 143, 154, 0.38)' },
    lovers: { primary: '#A8826B', tint: 'rgba(168, 130, 107, 0.15)', border: 'rgba(168, 130, 107, 0.4)' },
    avenger: { primary: '#A45A44', tint: 'rgba(164, 90, 68, 0.16)', border: 'rgba(164, 90, 68, 0.42)' },
    mr_meme: { primary: '#7B8794', tint: 'rgba(123, 135, 148, 0.15)', border: 'rgba(123, 135, 148, 0.38)' },
  } satisfies Record<PlayerRole, { primary: string; tint: string; border: string }>,
  typography: {
    latinFont: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    arabicFont: '"Cairo", sans-serif',
    monoFont: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    numericStyle: 'tabular-nums',
  },
  surfaces: {
    dossierCard:
      'rounded-[16px] bg-bg-surface border border-[#B49A62]/35 shadow-[0_18px_44px_rgba(4,7,12,0.42)]',
    intelligencePanel:
      'rounded-[14px] bg-bg-surface border border-border-strong shadow-[0_12px_32px_rgba(4,7,12,0.28)]',
    tacticalRow:
      'rounded-[10px] bg-bg-card/85 border border-border transition-colors',
    modalShell:
      'rounded-[16px] bg-bg-surface border border-border-strong shadow-[0_24px_64px_rgba(4,7,12,0.68)]',
    modalScrim:
      'fixed inset-0 z-50 bg-black/75 backdrop-blur-xs',
  },
  phaseTransitions: {
    screenEnter: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } },
    modalPop: { initial: { scale: 0.96, opacity: 0, y: 8 }, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 0.97, opacity: 0, y: 6 } },
    cardReveal: { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 } },
  },
} as const;

export const CLASSIFIED_DESIGN_TOKENS = BLACKSITE_TOKENS;
