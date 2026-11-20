import { PlayerRole } from '../../types';

/**
 * MR. WHITE — CLASSIFIED INTELLIGENCE
 * Design System Tokens & Visual Presets
 */
export const CLASSIFIED_DESIGN_TOKENS = {
  identity: 'MR. WHITE — CLASSIFIED INTELLIGENCE',
  palette: {
    foundations: {
      voidNavy: '#070B14',
      deepNavy: '#0B1120',
      charcoalSurface: '#111827',
      elevatedSlate: '#162033',
      cardSurface: 'rgba(17, 24, 39, 0.88)',
    },
    accents: {
      electricBlue: '#2563EB',
      cyan: '#38BDF8',
      amber: '#F59E0B',
      crimson: '#EF4444',
      emerald: '#10B981',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
    },
    borders: {
      subtle: 'rgba(148, 163, 184, 0.14)',
      strong: 'rgba(148, 163, 184, 0.24)',
      cyanFocus: 'rgba(56, 189, 248, 0.45)',
      amberPrestige: 'rgba(245, 158, 11, 0.45)',
      crimsonDanger: 'rgba(239, 68, 68, 0.45)',
    },
  },
  roleColors: {
    citizen: { primary: '#38BDF8', tint: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.4)' },
    undercover: { primary: '#F97316', tint: 'rgba(249, 115, 22, 0.14)', border: 'rgba(249, 115, 22, 0.4)' },
    mrwhite: { primary: '#F8FAFC', tint: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.45)' },
    inspector: { primary: '#60A5FA', tint: 'rgba(96, 165, 250, 0.14)', border: 'rgba(96, 165, 250, 0.4)' },
    fool: { primary: '#A78BFA', tint: 'rgba(124, 58, 237, 0.14)', border: 'rgba(167, 139, 250, 0.4)' },
    boomerang: { primary: '#FB7185', tint: 'rgba(239, 68, 68, 0.14)', border: 'rgba(251, 113, 133, 0.4)' },
    protector: { primary: '#60A5FA', tint: 'rgba(59, 130, 246, 0.14)', border: 'rgba(96, 165, 250, 0.4)' },
    justice: { primary: '#34D399', tint: 'rgba(16, 185, 129, 0.14)', border: 'rgba(52, 211, 153, 0.4)' },
    ghost: { primary: '#38BDF8', tint: 'rgba(14, 165, 233, 0.14)', border: 'rgba(56, 189, 248, 0.4)' },
    lovers: { primary: '#F472B6', tint: 'rgba(236, 72, 153, 0.14)', border: 'rgba(244, 114, 182, 0.4)' },
    avenger: { primary: '#FB923C', tint: 'rgba(249, 115, 22, 0.14)', border: 'rgba(251, 146, 60, 0.4)' },
    mr_meme: { primary: '#94A3B8', tint: 'rgba(100, 116, 139, 0.14)', border: 'rgba(148, 163, 184, 0.4)' },
  } satisfies Record<PlayerRole, { primary: string; tint: string; border: string }>,
  typography: {
    latinFont: '"Outfit", ui-sans-serif, system-ui, sans-serif',
    arabicFont: '"Cairo", sans-serif',
    numericStyle: 'tabular-nums',
  },
  surfaces: {
    dossierCard:
      'rounded-3xl bg-bg-surface/90 border border-border-strong shadow-[0_16px_40px_rgba(2,6,23,0.45)]',
    tacticalRow:
      'rounded-2xl bg-bg-card/85 border border-border transition-colors',
    modalShell:
      'rounded-[2rem] bg-bg-surface border border-border-strong shadow-[0_24px_64px_rgba(2,6,23,0.65)]',
    modalScrim:
      'fixed inset-0 z-50 bg-black/75 backdrop-blur-sm',
  },
  phaseTransitions: {
    screenEnter: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } },
    modalPop: { initial: { scale: 0.92, opacity: 0, y: 14 }, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 0.94, opacity: 0, y: 10 } },
    cardReveal: { initial: { rotateY: 90, opacity: 0 }, animate: { rotateY: 0, opacity: 1 } },
  },
} as const;
