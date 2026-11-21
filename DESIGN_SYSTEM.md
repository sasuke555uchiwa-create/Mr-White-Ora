# MR. WHITE — BLACKSITE · UI Design System 2.0

Unified Intelligence Noir & Classified Systems visual specification for **Mr. White** (`Undercover · Mr white 2?`), supporting Arabic RTL (`Cairo`), English/French (`Outfit`), and technical monospace codes (`JetBrains Mono`) across Dark (Primary), Gray, and Light themes.

---

## 1. Global Color System

### Foundations (Dark — Primary BLACKSITE Experience)
| Token | Name | Hex | Role |
| :--- | :--- | :--- | :--- |
| `--bg-dark` | Obsidian | `#080B10` | Root canvas & full-screen scrim backdrops |
| `--bg-main` | Deep Black Navy | `#0D1219` | Screen background gradient anchor |
| `--bg-surface` | Gunmetal | `#151C25` | Primary panels, modals, tactical dock |
| `--bg-card` | Steel Surface | `#202B36` | Interactive rows, segmented tracks, player cards |

### Accents & Semantics
| Role | Hex | Usage |
| :--- | :--- | :--- |
| **Muted Intelligence Gold** (`--primary`) | `#B49A62` | Authority, prestige, classified seals, primary CTA (`#080B10` text) |
| **Signal Cyan** (`--accent`) | `#668F9A` | Active information, selection focus, tactical indicators |
| **Alert Crimson** (`--danger`) | `#963F46` | Elimination, voting phase, danger CTAs (`#F4F6F8` text) |
| **Neutral Silver** (`--text-muted`) | `#A8B1BA` | Secondary metadata, technical coordinates, inactive icons |
| **Agency Emerald** | `#3E7B67` | Shield protection, verified clearance, Mr. Justice verdict |

Select themes: `.theme-dark` (primary), `.theme-gray` (slate tactical), `.theme-light` (archival paper). Pink and purple defaults are banned across the interface.

---

## 2. Controlled Corner Radius & Elevation
- **Small controls, buttons, inputs, status chips**: `6px` – `10px` (`rounded-[6px]`, `rounded-[10px]`)
- **Standard player & briefing cards**: `12px` – `14px` (`rounded-[12px]`, `rounded-[14px]`)
- **Classified Case File & modal shells**: `16px` (`rounded-[16px]`)
- **Single-elevation discipline**: Use hairline dividers (`border-t border-border`) inside panels instead of nested bordered cards; avoid heavy glassmorphism blur on inner panels.

---

## 3. Button System (`components/ui/BlacksiteUI.tsx`)
1. **Primary Tactical Button (`variant="primary"`)**: `#B49A62` Gold with `#080B10` high-contrast label (`>= 7.1:1`), `min-h-[44px]`, `rounded-[10px]`.
2. **Cyan Active Button (`variant="cyan"`)**: `#668F9A` Cyan with `#080B10` text (`>= 5.6:1`).
3. **Secondary Outline Button (`variant="secondary"`)**: Steel surface (`--bg-card`) with `border-border-strong`.
4. **Ghost Button (`variant="ghost"`)**: Transparent hover surface for secondary navigation & dismiss actions.
5. **Danger / Elimination Button (`variant="danger"`)**: `#963F46` Alert Crimson with `#F4F6F8` text (`>= 5.8:1`).
6. **Icon Button (`IconButton`)**: `44x44px` minimum touch target, `rounded-[10px]`.
7. **Segmented Control (`SegmentedControl`)**: `rounded-[10px]` track with elevated active segment.
8. **Navigation Button (`NavButton`)**: Compact bottom dock tactical control.

---

## 4. Typography & Localization Rules
- **Arabic (`dir="rtl"`)**: `Cairo` (`--font-cairo`). **Never** apply `uppercase` or wide `tracking-widest` to Arabic copy.
- **English / French (`dir="ltr"`)**: `Outfit` (`--font-sans`).
- **Operation Codes / Timestamps / Counters**: `JetBrains Mono` (`--font-mono-code`) + `tabular-nums`.
- **Static Metadata**: Use unboxed typographic separators (`·`) or `6px` rectangular technical tags (`StatusIndicator` / `ClassifiedStamp`), never rounded pill capsules.

---

## 5. Role Color System
| Role | Primary Accent | Identity |
| :--- | :--- | :--- |
| **Civilian** (`citizen`) | `#668F9A` | Signal Cyan investigator |
| **Undercover** (`undercover`) | `#A46F44` | Muted Amber-Ochre infiltrator |
| **Mr. White** (`mrwhite`) | `#B49A62` | Intelligence Gold ghost operative |
| **Inspector** (`inspector`) | `#6E8EA8` | Steel Blue analyst |
| **Mr. Joy** (`fool`) | `#9A8866` | Warm Brass decoy |
| **Mr. Boomerang** (`boomerang`) | `#963F46` | Alert Crimson counter-strike |
| **Mr. Shield** (`protector`) | `#5A819E` | Slate Blue defender |
| **Mr. Justice** (`justice`) | `#3E7B67` | Agency Emerald arbiter |
| **Mr. Ghost** (`ghost`) | `#668F9A` | Spectral Cyan observer |
| **The Lovers** (`lovers`) | `#A8826B` | Muted Bronze paired operatives |
| **Mr. Avenger** (`avenger`) | `#A45A44` | Rust Copper retaliation |
| **Mr. Meme** (`mr_meme`) | `#7B8794` | Neutral Graphite mime |
