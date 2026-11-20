# MR. WHITE — CLASSIFIED INTELLIGENCE · UI Design System 1.0

Visual identity and component specification for **Mr. White** (`Undercover · Mr white 2?`), designed to preserve Arabic RTL (`Cairo`) and Latin (`Outfit`) multi-language ergonomics across mobile and desktop viewports.

---

## 1. Primary & Secondary Colors (60-30-10 Budget)

| Role | Token | Hex / Value | Usage |
| :--- | :--- | :--- | :--- |
| **Foundation (60%)** | `--bg-dark` / Void Navy | `#070B14` | Root canvas & full-screen overlays |
| **Deep Navy** | `--bg-main` | `#0B1120` | Primary screen backdrop & portrait backdrops |
| **Card Surface (30%)** | `--bg-surface` / Charcoal | `#111827` | Dossier cards, modals, navigation docks |
| **Elevated Slate** | `--bg-card` | `#162033` | Nested tiles, word-deck frames, list rows |
| **Electric Blue** | `--primary` / Intelligence | `#2563EB` | Primary interactive focus, XP progress, CTAs |
| **Cyan Accent (10%)** | `--accent` / Tactical Cyan | `#38BDF8` | Active clues, tactical borders, scan highlights |
| **Amber Prestige** | Prestige Gold | `#F59E0B` | Mr. White highlights, streaks, elite badges, guesses |
| **Crimson Alert** | `--danger` / Elimination | `#EF4444` | Elimination votes, Hard difficulty, destructive actions |
| **Emerald Confirm** | Action Success | `#10B981` / `#22C55E` | Match Start CTA, unlocked perks, verified state |

Light (`.theme-light`) and Gray (`.theme-gray`) theme tokens remain intact and selectable in Settings.

---

## 2. Role Colors

| Role | Primary Accent | Surface Tint | Identity Cue |
| :--- | :--- | :--- | :--- |
| **Civilian (`citizen`)** | `#38BDF8` (Cyan) | `rgba(56, 189, 248, 0.14)` | Agency investigator blue |
| **Undercover (`undercover`)** | `#F97316` (Tactical Orange) | `rgba(249, 115, 22, 0.14)` | Shadowed double-agent |
| **Mr. White (`mrwhite`)** | `#F8FAFC` / `#F59E0B` | `rgba(245, 158, 11, 0.14)` | Ivory dossier + amber danger |
| **Inspector (`inspector`)** | `#60A5FA` (Steel Blue) | `rgba(96, 165, 250, 0.14)` | Analytical investigator |
| **Mr. Joy (`fool`)** | `#A78BFA` (Violet) | `rgba(124, 58, 237, 0.14)` | Jester operative |
| **Mr. Boomerang (`boomerang`)** | `#FB7185` (Crimson) | `rgba(239, 68, 68, 0.14)` | Counter-strike operative |
| **Mr. Shield (`protector`)** | `#60A5FA` (Shield Blue) | `rgba(59, 130, 246, 0.14)` | Ballistic guardian |
| **Mr. Justice (`justice`)** | `#34D399` (Emerald) | `rgba(16, 185, 129, 0.14)` | Tie-breaker magistrate |
| **Mr. Ghost (`ghost`)** | `#38BDF8` (Spectral Cyan) | `rgba(14, 165, 233, 0.14)` | Post-elimination observer |
| **The Lovers (`lovers`)** | `#F472B6` (Rose) | `rgba(236, 72, 153, 0.14)` | Paired agents |
| **Mr. Avenger (`avenger`)** | `#FB923C` (Amber-Orange) | `rgba(249, 115, 22, 0.14)` | Retaliation operative |
| **Mr. Meme (`mr_meme`)** | `#94A3B8` (Graphite) | `rgba(100, 116, 139, 0.14)` | Silent mime operative |

---

## 3. Typography (RTL & LTR Preserved)

- **Arabic & RTL (`dir="rtl"`, `lang="ar-TN"`)**: `Cairo` (`--font-cairo`), applied cleanly via `.font-cairo` when Arabic is active. Line heights `1.45–1.6` for Arabic readability; avoid tight uppercase tracking on Arabic labels.
- **English, French & European LTR**: `Outfit` (`--font-sans`), weights `500`–`900`.
- **Numeric Precision**: Every timer, XP counter, rank index, vote tally, and score badge uses `tabular-nums` so columns never jitter on countdown ticks.
- **No Text in Artwork**: All artwork stays purely visual; localized strings render exclusively in real DOM typography.

---

## 4. Card Surfaces, Borders & Shadows

- **Primary Dossier Card (`.card-modern`)**: `rounded-3xl` to `rounded-[2rem]`, `background: var(--bg-surface)`, `1px solid var(--border-strong)`, subtle top highlight (`inset 0 1px 0 rgba(255,255,255,0.06)`), and deep ambient shadow `0 16px 40px rgba(2, 6, 23, 0.45)`.
- **Minimal Backdrop Blur**: Reserve `backdrop-blur-md` strictly for modal scrims (`bg-black/75 backdrop-blur-sm`) and top sticky bars; keep inner cards crisp and opaque (`90%–96%` opacity) to avoid excessive glassmorphism.
- **Cover Artwork Cards**: `aspect-[4/3]` containers with `object-cover`, dark bottom gradient scrim (`from-black/90 via-black/35 to-transparent`), and crisp localized title/subtitle aligned via logical `text-start`.

---

## 5. Button States

- **Primary Match CTA**: High-contrast emerald (`#22C55E`) or electric blue (`#2563EB`) tactile surface, crisp `active:translate-y-0.5` press state, `disabled:opacity-45 disabled:cursor-not-allowed`, `whitespace-nowrap shrink-0` on horizontal buttons.
- **Secondary / Outline (`.btn-modern-outline`)**: Transparent or elevated slate (`--bg-card`), `1px solid var(--border-strong)`, hover brightening without harsh neon bloom.
- **Danger / Elimination (`.btn-modern-danger`)**: Crimson gradient (`#EF4444` → `#B91C1C`) reserved for voting/logout/hard-mode indicators.

---

## 6. Modal Styles

- **Scrim**: `fixed inset-0 z-50 bg-black/75 backdrop-blur-sm` with click-outside dismissal where safe.
- **Shell**: `max-w-md` / `max-w-lg`, `rounded-[2rem]`, `border border-border-strong`, `bg-bg-surface`, `max-h-[88vh] flex flex-col overflow-hidden` with internal scrollable body and anchored footer button.
- **Bottom-Sheet Mobile Adaptation**: `items-end sm:items-center` on setup pickers (`rounded-t-[2rem] sm:rounded-[2rem]`) for thumb ergonomics.

---

## 7. Loading & Empty States

- **Loading**: Clean centered ring spinner (`border-t-2 border-b-2 border-sky-400`) + localized single-line label; zero fake telemetry or skeleton shimmer spam.
- **Empty States**: Dashed border container (`border border-dashed border-border-strong`), muted 40px icon (`opacity-50`), concise localized prompt, and direct recovery CTA (e.g., "Browse Store" or "Play a round").

---

## 8. Achievement Cards

- **Surface**: `rounded-2xl` dark navy dossier tile (`bg-bg-card/85 border border-border-strong`) featuring a `56x56` rounded-xl framed `512x512` WebP emblem (`object-cover`), localized title, one-line description, and clear unlocked/locked visual contrast (`grayscale opacity-55` when locked vs subtle amber/cyan border highlight when earned).

---

## 9. Game Phase Transitions

- **Screen Transitions**: Smooth 220–320ms vertical settle (`opacity: 0 → 1, y: 12 → 0`) via `framer-motion`.
- **Mystery Card Deal & Role Reveal**: `AnimatePresence` modal pop (`scale: 0.92 → 1`) with crisp role portrait presentation and immediate privacy confirmation CTA before passing the device.
- **Vote & Elimination Reveal**: Flip accent (`rotateY: [0, 90, 0]`) transitioning into either an emerald/amber/crimson outcome badge or a protected special-role shield notice (`Mr. Shield` / `Mr. Boomerang`).

---

## 10. Asset Registry Architecture

All visual assets live under `src/assets/mr-white/` and are imported exclusively through `src/design/assetRegistry.ts` (zero external hotlinks).
