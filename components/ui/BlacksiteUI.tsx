import React from 'react';
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
    'bg-[#B49A62] hover:bg-[#C2A870] text-[#080B10] border border-[#D4BE8A]/45 shadow-[0_6px_18px_rgba(8,11,16,0.35)]',
  cyan:
    'bg-[#668F9A] hover:bg-[#77A0AB] text-[#080B10] border border-[#8CB3BE]/45 shadow-[0_6px_18px_rgba(8,11,16,0.35)]',
  secondary:
    'bg-bg-card hover:bg-bg-surface text-text-main border border-border-strong shadow-xs',
  ghost:
    'bg-transparent hover:bg-bg-card/80 text-text-muted hover:text-text-main border border-transparent hover:border-border',
  danger:
    'bg-[#963F46] hover:bg-[#A64A52] text-[#F4F6F8] border border-[#B85C64]/45 shadow-[0_6px_18px_rgba(8,11,16,0.35)]',
};

const BUTTON_SIZE_STYLES: Record<TacticalButtonSize, string> = {
  sm: 'min-h-[40px] px-3.5 py-2 text-xs gap-1.5 rounded-[8px]',
  md: 'min-h-[44px] px-4 py-2.5 text-sm gap-2 rounded-[10px]',
  lg: 'min-h-[50px] px-5 py-3 text-[15px] gap-2.5 rounded-[10px]',
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
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold tracking-normal transition-all duration-150 active:scale-[0.985] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/70 select-none ${
        BUTTON_VARIANT_STYLES[variant]
      } ${BUTTON_SIZE_STYLES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin shrink-0" /> : icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span className="truncate">{children}</span>
      {!loading && trailingIcon && <span className="shrink-0 flex items-center">{trailingIcon}</span>}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'secondary' | 'ghost' | 'danger' | 'primary';
  size?: 'sm' | 'md';
}

const ICON_BUTTON_VARIANTS: Record<NonNullable<IconButtonProps['variant']>, string> = {
  secondary: 'bg-bg-surface hover:bg-bg-card text-text-main border border-border-strong',
  ghost: 'bg-transparent hover:bg-bg-card/80 text-text-muted hover:text-text-main border border-transparent hover:border-border',
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
  const dims = size === 'sm' ? 'w-10 h-10 min-w-[40px] min-h-[40px] rounded-[8px]' : 'w-11 h-11 min-w-[44px] min-h-[44px] rounded-[10px]';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center transition-colors active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/70 shrink-0 ${dims} ${ICON_BUTTON_VARIANTS[variant]} ${className}`}
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
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center bg-bg-card/90 border border-border rounded-[10px] p-1 gap-1 ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 font-bold whitespace-nowrap shrink-0 transition-all rounded-[7px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/70 disabled:opacity-40 disabled:cursor-not-allowed ${
              size === 'sm' ? 'min-h-[36px] px-2.5 text-xs' : 'min-h-[40px] px-3 text-xs sm:text-sm'
            } ${
              active
                ? 'bg-bg-surface text-text-main border border-border-strong shadow-xs'
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
      className={`group flex flex-col items-center justify-center gap-1 min-h-[48px] px-1.5 py-2 rounded-[10px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#668F9A]/70 ${
        active
          ? 'bg-bg-card border-[#B49A62]/45 text-text-main'
          : 'bg-bg-surface/85 border-border hover:border-border-strong hover:bg-bg-card text-text-muted hover:text-text-main'
      } ${className}`}
      {...props}
    >
      <span className={`transition-colors ${active ? 'text-[#B49A62]' : 'text-text-muted group-hover:text-text-main'}`}>
        {icon}
      </span>
      <span className="text-[11px] font-bold leading-tight truncate max-w-full">{label}</span>
    </button>
  );
};

export const IntelligencePanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-[14px] bg-bg-surface border border-border-strong shadow-[0_12px_32px_rgba(4,7,12,0.28)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const ClassifiedDossierPanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-[16px] bg-bg-surface border border-[#B49A62]/35 shadow-[0_18px_44px_rgba(4,7,12,0.42)] ${className}`}
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
  <div
    className={`rounded-[12px] bg-bg-card/85 border border-border transition-colors ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const TacticalDataRow: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-[10px] bg-bg-card/80 border border-border px-3.5 py-2.5 flex items-center justify-between gap-3 ${className}`}
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

export interface ModalShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidthClass?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  children,
  className = '',
  maxWidthClass = 'max-w-md',
}) => (
  <div
    className={`w-full ${maxWidthClass} rounded-[16px] bg-bg-surface border border-border-strong shadow-[0_24px_64px_rgba(4,7,12,0.68)] overflow-hidden ${className}`}
  >
    {children}
  </div>
);

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
