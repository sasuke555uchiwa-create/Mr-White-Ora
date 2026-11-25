import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export type TacticalButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cyan';
export type TacticalButtonSize = 'sm' | 'md' | 'lg';

export interface TacticalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TacticalButtonVariant;
  size?: TacticalButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const BUTTON_VARIANT_STYLES: Record<TacticalButtonVariant, string> = {
  primary:
    'bg-[#B49A62] hover:bg-[#C2A870] text-[#080B10] border border-[#D8C492]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_18px_rgba(8,11,16,0.34)]',
  cyan:
    'bg-[#668F9A] hover:bg-[#77A0AB] text-[#080B10] border border-[#96BAC4]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_18px_rgba(8,11,16,0.34)]',
  secondary:
    'bg-bg-card hover:bg-bg-surface text-text-main border border-border-strong shadow-[inset_0_1px_0_var(--surface-highlight)]',
  ghost:
    'bg-transparent hover:bg-bg-card/85 text-text-muted hover:text-text-main border border-transparent',
  danger:
    'bg-[#963F46] hover:bg-[#A64A52] text-[#F4F6F8] border border-[#BC636B]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_6px_18px_rgba(8,11,16,0.34)]',
};

const BUTTON_SIZE_STYLES: Record<TacticalButtonSize, string> = {
  sm: 'min-h-[44px] px-3.5 py-2 text-xs gap-1.5 rounded-[9px]',
  md: 'min-h-[44px] px-4 py-2.5 text-sm gap-2 rounded-[10px]',
  lg: 'min-h-[52px] px-5 py-3 text-[15px] gap-2.5 rounded-[10px]',
};

export const TacticalButton: React.FC<TacticalButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  trailingIcon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const hasComplexChildren =
    React.Children.count(children) > 1 || React.isValidElement(children);

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold tracking-normal transition-all duration-150 active:translate-y-[0.5px] active:scale-[0.985] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 select-none ${
        BUTTON_VARIANT_STYLES[variant]
      } ${BUTTON_SIZE_STYLES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0 flex items-center">{icon}</span>
      )}
      {children !== undefined &&
        children !== null &&
        (hasComplexChildren ? (
          <span className="min-w-0 flex-1 flex items-center justify-center gap-2">{children}</span>
        ) : (
          <span className="truncate">{children}</span>
        ))}
      {!loading && trailingIcon && (
        <span className="shrink-0 flex items-center">{trailingIcon}</span>
      )}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'secondary' | 'ghost' | 'danger' | 'primary';
  size?: 'sm' | 'md';
}

const ICON_BUTTON_VARIANTS: Record<NonNullable<IconButtonProps['variant']>, string> = {
  secondary:
    'bg-bg-surface hover:bg-bg-card text-text-main border border-border-strong shadow-[inset_0_1px_0_var(--surface-highlight)]',
  ghost:
    'bg-transparent hover:bg-bg-card/85 text-text-muted hover:text-text-main border border-transparent',
  danger: 'bg-[#963F46]/15 hover:bg-[#963F46]/25 text-danger-text border border-[#963F46]/35',
  primary: 'bg-[#B49A62]/15 hover:bg-[#B49A62]/25 text-primary-text border border-[#B49A62]/40',
};

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}) => {
  const dims =
    size === 'sm'
      ? 'w-11 h-11 min-w-[44px] min-h-[44px] rounded-[9px]'
      : 'w-11 h-11 min-w-[44px] min-h-[44px] rounded-[10px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 shrink-0 ${dims} ${ICON_BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
  ariaLabel,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    const enabledIndices = options
      .map((opt, i) => (opt.disabled ? -1 : i))
      .filter((i) => i !== -1);
    if (enabledIndices.length <= 1) return;

    const isRtl =
      (containerRef.current && getComputedStyle(containerRef.current).direction === 'rtl') ||
      (typeof document !== 'undefined' && document.documentElement.dir === 'rtl');

    let targetIdx: number | null = null;
    if (e.key === 'Home') {
      targetIdx = enabledIndices[0];
    } else if (e.key === 'End') {
      targetIdx = enabledIndices[enabledIndices.length - 1];
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const forward = isRtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
      const currentEnabledPos = enabledIndices.indexOf(currentIdx);
      if (currentEnabledPos !== -1) {
        const nextPos = forward
          ? (currentEnabledPos + 1) % enabledIndices.length
          : (currentEnabledPos - 1 + enabledIndices.length) % enabledIndices.length;
        targetIdx = enabledIndices[nextPos];
      }
    }

    if (targetIdx !== null && options[targetIdx]) {
      e.preventDefault();
      onChange(options[targetIdx].value);
      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[targetIdx]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center bg-bg-main/85 border border-border-strong rounded-[10px] p-1 gap-1 ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt, idx) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 font-bold whitespace-nowrap shrink-0 transition-all rounded-[7px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 disabled:opacity-40 disabled:cursor-not-allowed ${
              size === 'sm' ? 'min-h-[44px] px-2.5 text-xs' : 'min-h-[44px] px-3 text-xs sm:text-sm'
            } ${
              active
                ? 'bg-bg-card text-text-main border border-border-strong shadow-[inset_0_1px_0_var(--surface-highlight)]'
                : 'text-text-muted hover:text-text-main border border-transparent'
            }`}
          >
            {opt.icon && <span className="shrink-0 flex items-center">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const NavDock: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`blacksite-panel rounded-[14px] p-1.5 grid grid-cols-5 gap-1 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export const NavButton: React.FC<NavButtonProps> = ({
  icon,
  label,
  active = false,
  className = '',
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      className={`group relative flex flex-col items-center justify-center gap-1 min-h-[50px] px-0.5 sm:px-1.5 py-2 rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 active:scale-[0.97] ${
        active
          ? 'bg-bg-card text-text-main'
          : 'bg-transparent hover:bg-bg-card/65 text-text-muted hover:text-text-main'
      } ${className}`}
      {...props}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-1 w-4 h-[2px] rounded-full bg-[#B49A62]"
        />
      )}
      <span
        className={`transition-colors ${
          active ? 'text-[#B49A62]' : 'text-text-muted group-hover:text-primary-text'
        }`}
      >
        {icon}
      </span>
      <span className="text-[10.5px] sm:text-[11px] font-bold leading-tight whitespace-nowrap text-center">
        {label}
      </span>
    </button>
  );
};

export const IntelligencePanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`rounded-[14px] blacksite-panel ${className}`} {...props}>
    {children}
  </div>
);

export const ClassifiedDossierPanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-[16px] bg-bg-surface border border-[#B49A62]/35 shadow-[inset_0_1px_0_var(--surface-highlight),0_18px_44px_rgba(4,7,12,0.42)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const PlayerIntelligenceCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`rounded-[12px] blacksite-card ${className}`} {...props}>
    {children}
  </div>
);

export interface InteractiveCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  accent?: 'gold' | 'cyan' | 'crimson' | 'emerald' | 'neutral';
}

const INTERACTIVE_ACCENT_SELECTED: Record<NonNullable<InteractiveCardProps['accent']>, string> = {
  gold: 'bg-[#B49A62]/12 border-[#B49A62] text-text-main',
  cyan: 'bg-[#668F9A]/14 border-[#668F9A] text-text-main',
  crimson: 'bg-[#963F46]/15 border-[#963F46] text-text-main',
  emerald: 'bg-[#3E7B67]/15 border-[#3E7B67] text-text-main',
  neutral: 'bg-bg-card border-border-strong text-text-main',
};

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  selected = false,
  accent = 'neutral',
  className = '',
  children,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`rounded-[12px] min-h-[44px] transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/75 disabled:opacity-45 disabled:cursor-not-allowed ${
      selected
        ? `border ${INTERACTIVE_ACCENT_SELECTED[accent]} shadow-[inset_0_1px_0_var(--surface-highlight)]`
        : 'blacksite-card-interactive text-text-main'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const TacticalDataRow: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-[10px] blacksite-card px-3.5 py-2.5 flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const TacticalInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => <input className={`blacksite-input px-3.5 py-2.5 text-sm font-medium ${className}`} {...props} />;

export const BottomActionBar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`sticky bottom-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-bg-surface/95 border-t border-border-strong shadow-[0_-10px_28px_rgba(4,7,12,0.34)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

export type StatusTone = 'gold' | 'cyan' | 'crimson' | 'emerald' | 'neutral';

const STATUS_TONES: Record<StatusTone, string> = {
  gold: 'bg-[#B49A62]/12 border-[#B49A62]/35 text-primary-text',
  cyan: 'bg-[#668F9A]/14 border-[#668F9A]/35 text-cyan-text',
  crimson: 'bg-[#963F46]/15 border-[#963F46]/40 text-danger-text',
  emerald: 'bg-[#3E7B67]/15 border-[#3E7B67]/40 text-emerald-text',
  neutral: 'bg-bg-card border-border text-text-muted',
};

export interface StatusIndicatorProps {
  tone?: StatusTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  tone = 'neutral',
  icon,
  children,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border text-[11px] font-bold whitespace-nowrap shrink-0 tabular-nums ${STATUS_TONES[tone]} ${className}`}
  >
    {icon && <span className="shrink-0 flex items-center">{icon}</span>}
    <span>{children}</span>
  </span>
);

export interface ClassifiedStampProps {
  children: React.ReactNode;
  tone?: 'gold' | 'cyan' | 'crimson' | 'neutral';
  className?: string;
}

export const ClassifiedStamp: React.FC<ClassifiedStampProps> = ({
  children,
  tone = 'gold',
  className = '',
}) => (
  <span
    dir="ltr"
    className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border font-mono-code text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap shrink-0 tabular-nums ${STATUS_TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

export type OperationPhaseType = 'briefing' | 'active' | 'interrogation' | 'tribunal' | 'verdict';

const OPERATION_PHASE_CONFIG: Record<
  OperationPhaseType,
  {
    code: string;
    tone: 'gold' | 'cyan' | 'crimson' | 'neutral';
    panelAccentClass: string;
    labels: { ar: string; en: string; fr: string };
  }
> = {
  briefing: {
    code: 'BRIEFING',
    tone: 'gold',
    panelAccentClass: 'border-[#B49A62]/40',
    labels: {
      ar: 'إحاطة سرّية',
      en: 'Confidential Briefing',
      fr: 'Briefing confidentiel',
    },
  },
  active: {
    code: 'ACTIVE OP',
    tone: 'cyan',
    panelAccentClass: 'border-[#668F9A]/40',
    labels: {
      ar: 'عملية نشطة',
      en: 'Active Operation',
      fr: 'Opération active',
    },
  },
  interrogation: {
    code: 'INTERROGATION',
    tone: 'neutral',
    panelAccentClass: 'border-border-strong',
    labels: {
      ar: 'استجواب ميداني',
      en: 'Field Interrogation',
      fr: 'Interrogatoire',
    },
  },
  tribunal: {
    code: 'TRIBUNAL',
    tone: 'crimson',
    panelAccentClass: 'border-[#963F46]/45',
    labels: {
      ar: 'محكمة الاقتراع',
      en: 'Tribunal Vote',
      fr: 'Tribunal de vote',
    },
  },
  verdict: {
    code: 'VERDICT',
    tone: 'gold',
    panelAccentClass: 'border-[#B49A62]/45',
    labels: {
      ar: 'الحكم الموثّق',
      en: 'Official Verdict',
      fr: 'Verdict officiel',
    },
  },
};

export const getOperationPhaseMeta = (phase: OperationPhaseType, lang: string) => {
  const cfg = OPERATION_PHASE_CONFIG[phase];
  const normalizedLang = lang === 'sa' ? 'ar' : lang;
  return {
    code: cfg.code,
    tone: cfg.tone,
    panelAccentClass: cfg.panelAccentClass,
    label: cfg.labels[normalizedLang as 'ar' | 'en' | 'fr'] || cfg.labels.en,
  };
};

export interface OperationPhaseBadgeProps {
  phase: OperationPhaseType;
  round?: number;
  lang?: string;
  className?: string;
}

export const OperationPhaseBadge: React.FC<OperationPhaseBadgeProps> = ({
  phase,
  round,
  lang = 'en',
  className = '',
}) => {
  const meta = getOperationPhaseMeta(phase, lang);
  return (
    <div className={`inline-flex items-center gap-2 min-w-0 ${className}`}>
      <ClassifiedStamp tone={meta.tone}>
        {meta.code}
        {round !== undefined ? ` · R${round}` : ''}
      </ClassifiedStamp>
      <span className="text-xs font-semibold text-text-muted truncate">{meta.label}</span>
    </div>
  );
};

export interface ModalShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidthClass?: string;
  onClose?: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  className = '',
  maxWidthClass = 'max-w-md',
  onClose,
  ariaLabel,
  ariaLabelledBy,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    const frame = requestAnimationFrame(() => {
      const el = dialogRef.current;
      if (el && typeof document !== 'undefined' && !el.contains(document.activeElement)) {
        el.focus({ preventScroll: true });
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      className={`w-full ${maxWidthClass} rounded-[16px] bg-bg-surface border border-border-strong shadow-[0_24px_64px_rgba(4,7,12,0.68)] overflow-hidden outline-none ${className}`}
    >
      {children}
    </div>
  );
};

export interface ScreenSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const ScreenSectionHeader: React.FC<ScreenSectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  className = '',
}) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <div className="flex items-center gap-2.5 min-w-0">
      {icon && (
        <div className="w-8 h-8 rounded-[8px] bg-bg-card border border-border flex items-center justify-center text-primary-text shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-bold text-text-main truncate">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted truncate">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

