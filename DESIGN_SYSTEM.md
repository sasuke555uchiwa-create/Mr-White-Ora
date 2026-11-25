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

---

## 6. Phase 4.1 — 4-Level Component Surface System & Mobile Ergonomics

### Surface Hierarchy (`index.css` & `components/ui/BlacksiteUI.tsx`)
| Level | Token / Class | Purpose |
| :--- | :--- | :--- |
| **Level 0** | `--bg-dark` (`#080B10`) / `--bg-main` (`#0D1219`) | Root canvas, gradient backdrop, solid modal scrims (`bg-[#080B10]/85` without heavy `backdrop-blur`) |
| **Level 1** | `.blacksite-panel` (`--bg-surface`, `border-border-strong`, `inset` highlight + `--panel-shadow`) | Primary intelligence panels, `IntelligencePanel`, `ClassifiedDossierPanel`, `ModalShell`, `NavDock`, `BottomActionBar` |
| **Level 2** | `.blacksite-card` / `.blacksite-card-interactive` (`--bg-card`, `--bg-card-hover` on hover) | `PlayerIntelligenceCard`, `InteractiveCard`, `TacticalDataRow`, segmented track active items |
| **Level 3** | `.blacksite-input` (`--bg-input`) | Recessed input fields (`TacticalInput`) with `min-h-[44px]` and `#668F9A` focus ring |

### Ergonomic & Accessibility Mandates
- **Touch Targets**: All `TacticalButton` (`sm`/`md` >= `44px`, `lg` >= `52px`), `IconButton` (`44x44px`), `SegmentedControl` tabs (`min-h-[44px]`), `InteractiveCard` (`min-h-[44px]`), and `NavButton` (`min-h-[50px]`) satisfy mobile `>= 44px` hitboxes.
- **Thumb-Zone Anchors**: Primary navigation uses `NavDock` (`5`-column unified dock on Home) and screen-level confirmations use sticky in-flow `BottomActionBar` with safe-area padding (`env(safe-area-inset-bottom)`).
- **Zero Floating Clutter**: Eliminate unanchored mini-badges, corner status dots, and `fixed` floating overlays over scrollable player grids; replace with inline badges or structured action rows.
- **RTL/LTR Parity**: Logical directional spacing (`start`/`end`, `ps-`/`pe-`), RTL keyboard arrow inversion in `SegmentedControl`, and mirrored chevron affordances.

---

## 7. Phase 4.2 — Cinematic Composition, Hairlines & Screen Framing

### Compositional Primitives (`components/ui/BlacksiteUI.tsx` & `index.css`)
- **Metallic Hairlines & Surfaces**: `.blacksite-hairline` (gold `#B49A62` gradient line), `.blacksite-hairline-cyan` (cyan `#668F9A` gradient line), `.blacksite-dossier-surface`, and `.blacksite-corner-brackets`.
- **`DossierHeaderBand`**: Standardized header container across setup, settings, online rooms, online lobby, scoreboard, profile, vault, lexicon, rules, and archive screens (`ClassifiedStamp` + title/subtitle + optional icon + `TacticalToolbar` action slot).
- **`TacticalToolbar`**: Grouped horizontal utility bar (`inline-flex rounded-[12px] blacksite-panel p-1`) for compact top-bar navigation & mode switches without scattered floating buttons.
- **`SectionDivider`**: Hairline rule with centered label separating major briefing sections.

### Layout & Card Seat Rules
- **No Overlapping Corner Badges or Floating Counters**: Status tags (`SPEAKING`, `TARGET`, `HOST`, `READY`, `Shielded`) and chat/log counters sit inside structured card header/footer strips or inline `TacticalButton` counters rather than floating `-top-2 -right-1` badges over avatars.
- **Flagship Home (`WelcomeScreen.tsx`)**: Responsive `lg:grid-cols-12` composition (`max-w-5xl`) balancing the focal hero emblem & Play CTA with a Command Console mode preview, 3-column framed Core Factions dossier (`/images/1.png`–`4.png`), and the unified 5-tab `NavDock`.
- **Anchored Bottom Actions**: Setup, settings, active match, scoreboard, debrief, and utility flows terminate cleanly in sticky in-flow `BottomActionBar` containers rather than orphaned buttons.

---

## 8. Phase 4.2 — Original BLACKSITE Visual Asset Library (`public/assets/blacksite/`)

### 8.1 Environmental Screen Backgrounds (`1080×1920` WebP, Lazy-Loaded)
Registered in `src/design/assetRegistry.ts` (`BLACKSITE_BACKGROUNDS` + `SCREEN_BACKGROUND_MAP`) and rendered via `<BlacksiteScreenBackdrop bgKey=... texture=... />`:
- `home-bg.webp` (`home`) — `WELCOME`: Obsidian command headquarters with subtle gold telemetry (priority eager on initial load).
- `setup-bg.webp` (`setup`) — `SETUP`, `PLAYERS_LIST`, `GAME_SETTINGS`: Tactical mission briefing table.
- `briefing-bg.webp` (`briefing`) — `REVEAL` (Local & Online): Sealed dossier briefing vault.
- `discussion-bg.webp` (`discussion`) — `PLAYING`, `DISCUSSION` (Local & Online): Interrogation & investigation room.
- `voting-bg.webp` (`voting`) — `VOTING`, `REVEAL_VOTE_RESULT`, `IMPOSTOR_GUESS` (Local & Online): Alert crimson tribunal chamber.
- `results-bg.webp` (`results`) — `RESULT`, `SCOREBOARD` (Local & Online): Official agency debriefing hall.
- `online-bg.webp` (`online`) — `ONLINE_ROOMS`, `ONLINE_LOBBY`, default `ONLINE_GAME`: Cyber-intelligence network hub.
- `archive-bg.webp` (`archive`) — `CASE_FILE`, `OPERATION_ARCHIVE`, `DICTIONARY`, `RULES`: Underground classified archive corridor.
- `profile-bg.webp` (`profile`) — `PROFILE`, `INVENTORY`, `SETTINGS`: Operative locker suite.

Only the active screen's background mounts at runtime (`loading="lazy"` except Home hero priority), keeping memory and initial download lean. Contrast scrims (`.blacksite-backdrop-scrim`) adapt cleanly across `.theme-dark`, `.theme-gray`, and `.theme-light` so cards and typography preserve legibility.

### 8.2 Custom BLACKSITE Iconography & Surface Textures
- **Bottom Navigation Pairs (`public/assets/blacksite/icons/navigation/`)**: 5 bespoke dual-state SVGs (`vault`, `rankings`, `dictionary`, `agents`, `settings`, each with inactive silver outline and `-active.svg` `#B49A62` gold active frame) wired into `NavDock`.
- **16 Reusable Action Icons (`public/assets/blacksite/icons/actions/`)**: `play-operation`, `online-multiplayer`, `pass-and-play`, `add-player`, `remove-player`, `edit-player`, `secure-room`, `search`, `back-nav`, `help`, `profile`, `secret-vote`, `shield-protection`, `special-ability`, `timer`, and `official-verdict`, rendered cleanly via `<BlacksiteIcon />` (supports `tone="native" | "ink"` and `rtlFlip`).
- **6 Tactical Textures & Stamps (`public/assets/blacksite/textures/`)**: `classified-paper.svg`, `tactical-map.svg`, `technical-carbon.svg`, `metallic-surface.svg`, `confidential-stamp.svg`, and `dossier-ornament.svg`, applied through `.blacksite-texture-*` CSS utility classes and decorative card overlays.
