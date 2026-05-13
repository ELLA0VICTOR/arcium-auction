# MPC-AUCTION — UI/UX TRANSFORMATION BRIEF
### Master Frontend Engineering Prompt for Codex

---

## CONTEXT & OBJECTIVE

You are a staff-level frontend engineer with deep expertise in design systems, motion engineering, and Web3 DApp architecture. You are tasked with transforming `mpc-auction` — a Solana-based sealed-bid auction platform powered by Arcium MPC cryptography — from a functional prototype into a **production-grade, visually elite DApp** that competes directly with Linear, Vercel, Hyperliquid, and dYdX in terms of visual craftsmanship.

The application is **fully functional**. Do not touch business logic, smart contract integrations, wallet adapters, or RPC connections. Your scope is purely the **visual layer, component architecture, layout system, motion design, and interaction quality**.

---

## CARDINAL RULES — READ BEFORE WRITING A SINGLE LINE

1. **NO GRADIENTS.** Zero. Not on backgrounds, not on text, not on borders, not on buttons. Flat color only. If you find a gradient in the codebase, remove it.
2. **NO GLOW EFFECTS.** No `box-shadow` with color opacity for ambient glow. No `text-shadow`. No neon. Shadows are for depth only — use sparingly, monochromatically (`rgba(0,0,0,N)`).
3. **NO AI-SLOP AESTHETICS.** This means: no generic card stacks, no "✨ Feature" bullet points with emoji, no floating blob shapes, no glassmorphism with heavy backdrop-blur, no gradient mesh backgrounds, no purple-to-pink hero gradients, no "Web3 startup template" layouts.
4. **NO DECORATIVE EMOJI.** Icons only — use Lucide React or custom inline SVGs. Every icon must earn its place by communicating function, not decoration.
5. **NO GENERIC SANS-SERIF HERO TEXT.** Typography must have deliberate weight contrast, tight optical tracking on display sizes, and intentional line-height rhythm.
6. **PRESERVE THE COLOR PALETTE.** The existing dark theme is correct. Primary background: `#0a0a0f` or `#08080d`. Surface: `#0f0f1a`. Accent purple: `#6b5ce7` or `#7c6ff7`. Text primary: `#f0eeff`. Text secondary: `#8b87a8`. Do not deviate. Do not introduce new hue families.
7. **PRESERVE ALL FONT CHOICES.** If the app uses Inter, Space Grotesk, or any existing font — keep it. Do not swap fonts.
8. **EVERY ANIMATION MUST SERVE A PURPOSE.** Motion communicates state, hierarchy, and causality. Animations that exist purely to look cool must be removed and replaced with ones that feel inevitable and necessary.

---

## DESIGN LANGUAGE TO ACHIEVE

Think: **Monochromatic depth** + **Swiss grid discipline** + **Data-forward density** + **Surgical motion**.

Reference aesthetic benchmarks (study them before implementing):
- **Linear** — how spacing creates breathing room without wasting space; how status is communicated through color alone without labels
- **Vercel Dashboard** — how data density is achieved without clutter; the use of monospace for all numerical values
- **Hyperliquid** — how a dark, data-dense trading terminal feels premium through precision, not decoration
- **dYdX v4** — component hierarchy, the disciplined use of a single accent color, table design quality
- **Raycast** — keyboard-first interaction feel, list density, micro-animation quality

The output should feel like it was built at a company with a design system team, a motion engineer, and a component library — not a hackathon project or an AI-generated scaffold.

---

## LAYOUT SYSTEM

### Spatial Tokens — Define These as CSS Custom Properties

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --radius-pill: 999px;

  --sidebar-width: 220px;
  --topbar-height: 52px;
  --content-max: 1200px;
}
```

### Page Architecture

Implement a **persistent sidebar layout** with the following zones:

```
┌──────────────────────────────────────────────────────┐
│  TOPBAR (52px fixed)                                  │
├────────────┬─────────────────────────────────────────┤
│            │                                          │
│  SIDEBAR   │  MAIN CONTENT AREA                       │
│  (220px)   │  max-width: 1200px, centered             │
│  fixed     │  padding: 32px 40px                      │
│            │                                          │
│            │                                          │
└────────────┴─────────────────────────────────────────┘
```

The sidebar replaces the current top-nav tag group. Navigation items: Dashboard, Auctions, My Bids, Protocol, Settings.

### Grid System

Use a **12-column grid** with 24px gutters for the main content. For stat cards, use a strict 4-column grid. For protocol architecture, use a 3-column grid with equal width. Never use flexbox `gap` as a substitute for a grid system on page-level layouts.

---

## COMPONENT SPECIFICATIONS

### 1. TOPBAR

**Height:** 52px exactly. Fixed position. `backdrop-filter: blur(0)` — no blur. Solid background: `#08080d`. Bottom border: `1px solid rgba(255,255,255,0.06)`.

**Left zone:** Logo mark (SVG shield/lock icon at 20px) + wordmark "ARCIUM AUCTION" in 13px uppercase with `letter-spacing: 0.12em`. Use `font-weight: 500`.

**Center zone:** Network status indicator — a row of 3 pills:
- Each pill: `height: 22px`, `padding: 0 10px`, `border-radius: var(--radius-pill)`, `font-size: 11px`, `font-weight: 500`, `letter-spacing: 0.04em`.
- MPC-SECURED pill: background `rgba(107, 92, 231, 0.12)`, text `#9b8ff5`, left dot `#6b5ce7` with a **breathing pulse animation** (scale 1→1.4→1, opacity 1→0.4→1, duration 2.4s infinite ease-in-out).
- SOLANA DEVNET pill: background `rgba(255,255,255,0.05)`, text `#8b87a8`.
- BLOCKCHAIN SYNCED pill: background `rgba(16, 185, 129, 0.08)`, text `#34d399`, left dot `#10b981` with same pulse animation offset by 0.8s.

**Right zone:** Wallet connection button — NOT a standard button. Use a component that shows:
- Disconnected: `Connect Wallet` — outlined, 34px height, `border: 1px solid rgba(255,255,255,0.12)`, text `#8b87a8`, hover: border-color `rgba(107,92,231,0.6)`, text `#f0eeff`. Transition: `all 180ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Connected: Show truncated address (`0x1a2b...3c4d`) with a 8px green dot, no border, background `rgba(255,255,255,0.04)`.

---

### 2. SIDEBAR

**Width:** 220px. Fixed left. Full viewport height. Background: `#0a0a0f`. Right border: `1px solid rgba(255,255,255,0.05)`. No box-shadow.

**Nav items:**
- Height: 36px each. `padding: 0 12px`. `border-radius: var(--radius-md)`. `margin: 2px 8px`.
- Icon (Lucide, 16px, `strokeWidth={1.5}`) + label in 13px `font-weight: 400`.
- Default: text `#5a5670`, icon `#5a5670`.
- Hover: background `rgba(255,255,255,0.04)`, text `#a89ec8`, transition `80ms`.
- Active: background `rgba(107,92,231,0.12)`, text `#c4bbf5`, icon `#9b8ff5`. **Left accent bar:** `position: absolute; left: 0; top: 8px; bottom: 8px; width: 2px; background: #6b5ce7; border-radius: 0 2px 2px 0`.

**Bottom of sidebar:**
- Protocol version badge: `v0.3.1` in 11px monospace, color `#3d3a54`.
- MPC Network uptime indicator: a minimal row showing `ARX NETWORK` label + `99.98%` in monospace.

---

### 3. HERO / PAGE HEADER

Remove the current centered block layout. Replace with:

**Left-aligned, flush to the content grid.**

```
[TAG ROW]
BLIND SEALED-BID
AUCTIONS
[DESCRIPTOR]                          [CTA BUTTONS]
```

- Heading: `font-size: clamp(36px, 5vw, 56px)`. `font-weight: 700`. `letter-spacing: -0.03em`. `line-height: 1.05`. Color: `#f0eeff`. **No gradient text.**
- Tag row above heading: Use the same pill components as topbar. Do not stack them separately — integrate them as a contextual label row.
- Descriptor text: Max-width 480px. `font-size: 14px`. `line-height: 1.7`. Color `#6b6785`. Remove verbose copy — maximum 2 sentences.
- CTA buttons placed to the right of the descriptor at the same vertical level, not below it — use a flex row with `justify-content: space-between; align-items: flex-end` for the bottom row.

**CTA Button — Create Auction:**
- Height: 38px. Background: `#6b5ce7`. Text: `#ffffff`. `font-size: 13px`. `font-weight: 500`. `border-radius: var(--radius-md)`. Padding: `0 16px`.
- **NO gradient.** Flat `#6b5ce7`.
- Hover: background `#7c6ff7`. Transform: `translateY(-1px)`. Transition: `all 150ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Active: `translateY(0)`, background `#5d4fd6`.
- Include a `+` icon (Lucide `Plus`, 14px) to the left of the label.

**CTA Button — View Protocol:**
- Same height. Background: `transparent`. Border: `1px solid rgba(255,255,255,0.1)`. Text: `#8b87a8`.
- Hover: border-color `rgba(255,255,255,0.2)`, text `#c4bbf5`.

---

### 4. METRICS STRIP

Replace the current 4-box grid with a **horizontal metrics rail** — a single `border: 1px solid rgba(255,255,255,0.06)` container, `border-radius: var(--radius-lg)`, `background: #0f0f1a`, divided by `1px solid rgba(255,255,255,0.05)` vertical dividers.

Each metric cell:
- Padding: `20px 28px`.
- Label: `10px`, `font-weight: 500`, `letter-spacing: 0.08em`, `text-transform: uppercase`, color `#4a4663`.
- Value: `28px`, `font-weight: 600`, `font-variant-numeric: tabular-nums`, `font-family: var(--font-mono)` (use `'JetBrains Mono', 'Fira Code', monospace`), color `#f0eeff`.
- Sub-label (optional): `11px`, color `#4a4663`.

**Animation on mount:** Each value counts up from 0 using a custom counter animation. Duration: 800ms. Easing: `cubic-bezier(0.16, 1, 0.3, 1)`. Stagger: 80ms between cells. Use `requestAnimationFrame` for the counter — do not use CSS animations for number counting.

**PRIVACY_RATE metric:** Display `100%` in color `#34d399` (green) with a small upward trend spark icon (Lucide `TrendingUp`, 12px) to the right. Only this metric gets an accent color — all others remain `#f0eeff`. This is intentional: it communicates that 100% privacy is the exceptional status.

---

### 5. PROTOCOL ARCHITECTURE — THREE CARDS

These are currently generic icon + title + description cards. Elevate them significantly.

**Card container:** `background: #0f0f1a`. `border: 1px solid rgba(255,255,255,0.06)`. `border-radius: var(--radius-xl)`. `padding: 28px`. `overflow: hidden`. `position: relative`.

**Card step number:** Top-left. `font-size: 11px`. `font-weight: 600`. `letter-spacing: 0.1em`. `color: #3d3a54`. Format: `01`, `02`, `03`.

**Card icon zone:** A `48px × 48px` square with `border-radius: var(--radius-md)`. Background: `rgba(107,92,231,0.08)`. Border: `1px solid rgba(107,92,231,0.16)`. Center the icon SVG (custom — see below).

**Custom SVGs to implement:**
- Card 01 (Encryption): A lock with circuit lines extending from it — simple, geometric, 2px stroke, color `#6b5ce7`.
- Card 02 (Compute): Three nodes connected by lines forming a triangle — representing distributed MPC network, 2px stroke, color `#6b5ce7`.
- Card 03 (Reveal): An eye icon with a single vertical line through the pupil — representing selective reveal, 2px stroke, color `#6b5ce7`.

**Card title:** `16px`, `font-weight: 600`, `color: #e8e4ff`, `margin-top: 16px`.
**Card description:** `13px`, `line-height: 1.65`, `color: #6b6785`, `margin-top: 8px`.

**Connector lines between cards:** Use an SVG overlay positioned absolutely across the three cards showing a dashed line from card 01 → 02 → 03 with animated `stroke-dashoffset` on mount. Duration: 1200ms. Color: `rgba(107,92,231,0.3)`.

**Hover state on cards:**
- Border: `rgba(107,92,231,0.24)`.
- Icon zone background: `rgba(107,92,231,0.14)`.
- Transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`.
- **Micro-lift:** `transform: translateY(-2px)`. Subtle only.

---

### 6. SECURITY GUARANTEES — FEATURE GRID

Current implementation is a 2×2 icon+label grid. Replace with a **list-based feature panel** that feels more like a security audit report than a marketing grid.

**Container:** Full-width. `border: 1px solid rgba(255,255,255,0.06)`. `border-radius: var(--radius-xl)`. `background: #0f0f1a`. No padding on container — apply padding to rows.

**Section header inside the component:**
- Left: `SECURITY GUARANTEES` in `11px uppercase letter-spacing: 0.1em color: #4a4663`.
- Right: A green pill `VERIFIED` with a checkmark icon. Background: `rgba(16,185,129,0.08)`. Border: `1px solid rgba(16,185,129,0.16)`. Text: `#34d399`. `font-size: 11px`.

**Each row:**
- `padding: 14px 24px`. `border-bottom: 1px solid rgba(255,255,255,0.04)`.
- Last row: no border-bottom.
- Hover: background `rgba(255,255,255,0.015)`.
- Layout: `display: grid; grid-template-columns: 24px 1fr auto`.
  - Col 1: Status icon — checkmark circle in `#34d399` (Lucide `CheckCircle2`, 16px, `strokeWidth={1.5}`).
  - Col 2: Feature name in `13px font-weight: 500 color: #c4bbf5` + description in `12px color: #6b6785` below.
  - Col 3: Technical tag — e.g. `ZK-PROOF`, `SEALED-FORMAT`, `HASH-LOCKED`. `font-size: 10px`. `font-weight: 600`. `letter-spacing: 0.06em`. `color: #5a5670`. Monospace. Right-aligned.

**Stagger entrance animation:** Each row enters from `opacity: 0; translateY(8px)` to `opacity: 1; translateY(0)`. Duration `300ms`. Stagger `60ms`. Trigger on viewport entry (IntersectionObserver).

---

### 7. TECHNICAL STACK — FOOTER PANEL

Current implementation is a simple label/value grid. Elevate to a **status terminal panel**.

**Container:** `background: #080810`. `border: 1px solid rgba(255,255,255,0.06)`. `border-radius: var(--radius-xl)`. `padding: 24px 28px`. Font throughout: monospace (`'JetBrains Mono', monospace`).

**Header row:** `TECHNICAL STACK` left. Right: live timestamp updating every second — `2026-05-13 14:23:07 UTC`. `font-size: 11px`. `color: #3d3a54`. This makes the panel feel live.

**Entries:** Displayed as a two-column grid (label: right-aligned `color: #4a4663`; value: left-aligned `color: #a89ec8`). `font-size: 12px`. `gap: 4px 24px`.

**CIPHER entry:** Show `Rescue` with a yellow/amber `ACTIVE` pill — `background: rgba(245,158,11,0.08)`. `border: 1px solid rgba(245,158,11,0.2)`. `color: #fbbf24`. This communicates it is a live, operational component.

**Network latency readout:** Add a row `MPC_LATENCY` with a simulated updating value (e.g., `142ms → 138ms → 145ms`) that changes every 4–8 seconds with a smooth `cross-fade` transition. Value color: `#34d399` if below 200ms.

---

### 8. AUCTION CARDS (for listing pages)

When showing auction listings, each card should follow this anatomy:

**Card:** `background: #0f0f1a`. `border: 1px solid rgba(255,255,255,0.06)`. `border-radius: var(--radius-xl)`. `padding: 0`. Overflow hidden.

**Card header:** `padding: 16px 20px`. `border-bottom: 1px solid rgba(255,255,255,0.05)`. Row with auction title (left, `14px font-weight: 600`) and status badge (right).

**Status badge system:**
- ACTIVE: `background: rgba(16,185,129,0.08)` `border: 1px solid rgba(16,185,129,0.16)` `color: #34d399` with pulsing dot.
- ENCRYPTED: `background: rgba(107,92,231,0.08)` `border: 1px solid rgba(107,92,231,0.16)` `color: #9b8ff5`.
- REVEALING: `background: rgba(245,158,11,0.08)` `border: 1px solid rgba(245,158,11,0.2)` `color: #fbbf24`.
- CLOSED: `background: rgba(255,255,255,0.04)` `border: 1px solid rgba(255,255,255,0.08)` `color: #5a5670`.

**Card body:** `padding: 20px`. Monospace numbers for amounts. Countdown timer with `font-variant-numeric: tabular-nums` to prevent jitter. Participant count.

**Countdown timer component:** Shows `HH:MM:SS`. Each unit in a `40px × 44px` block. `background: rgba(0,0,0,0.3)`. `border-radius: var(--radius-md)`. Monospace bold. Separator colons blink at 1s interval using `opacity: 1 → 0.2` keyframe. This is the ONLY blink animation permitted in the UI.

**Card footer:** `padding: 12px 20px`. `border-top: 1px solid rgba(255,255,255,0.05)`. `background: rgba(0,0,0,0.15)`. Shows bid count and `Place Encrypted Bid →` action link in `13px color: #9b8ff5`. Hover: `color: #c4bbf5`. Transform: `translateX(2px)` on hover for the arrow.

---

### 9. BID SUBMISSION MODAL

This is the highest-stakes UI interaction. It must feel secure and precise.

**Overlay:** `background: rgba(0,0,0,0.7)`. `backdrop-filter: blur(8px)` — **the only place blur is permitted**, and only on the overlay scrim, never on a card surface. Entrance: opacity `0→1`, duration `120ms`.

**Modal panel:** `width: 480px`. `background: #0f0f1a`. `border: 1px solid rgba(255,255,255,0.1)`. `border-radius: var(--radius-xl)`. `padding: 28px`. Entrance: `translateY(12px) → translateY(0)`, `opacity: 0→1`, duration `200ms cubic-bezier(0.16, 1, 0.3, 1)`.

**Modal header:** Title `Place Encrypted Bid` in `16px font-weight: 600`. Right: close button (Lucide `X`, 16px) in `color: #4a4663`. Hover: `color: #8b87a8`.

**Bid amount input:**
- Full-width. Height: `52px`. `background: rgba(0,0,0,0.4)`. `border: 1px solid rgba(255,255,255,0.08)`. `border-radius: var(--radius-md)`.
- `font-size: 24px`. `font-weight: 600`. `font-family: monospace`. `color: #f0eeff`. `text-align: right`. `padding-right: 16px`.
- Left unit label (SOL or USDC) absolutely positioned inside, `color: #6b6785`.
- Focus: border-color `rgba(107,92,231,0.6)`. `outline: none`. `box-shadow: 0 0 0 3px rgba(107,92,231,0.1)`.

**Encryption progress visualization:** After submitting, show a multi-step progress track:
```
[●━━━━━━━━━] Encrypting bid with k20519...
[●●━━━━━━━━] Submitting to MPC network...
[●●●━━━━━━━] Broadcasting to Solana...
[●●●●●●●●●●] Bid sealed on-chain.
```
Steps animate sequentially. Each bullet transitions `color: #3d3a54 → #6b5ce7` when reached. Progress bar fills left-to-right. This is NOT a generic spinner — it communicates the actual cryptographic steps happening.

**Security notice:** Below the input, a small strip: Lock icon + `Your bid is encrypted client-side. Private key never leaves your device.` in `11px color: #4a4663`. This is not marketing copy — it's a precise technical statement.

---

## ANIMATION SYSTEM

Define a global animation philosophy. Implement it as a set of composable utilities.

### Easing Curves

```css
:root {
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-sine: cubic-bezier(0.37, 0, 0.63, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* slight overshoot for interactive elements */
}
```

### Animation Inventory

| Trigger | Animation | Duration | Easing |
|---|---|---|---|
| Page mount (hero text) | `opacity 0→1, translateY 16px→0` | 400ms | `--ease-out-expo` |
| Page mount (cards) | `opacity 0→1, translateY 12px→0` | 320ms, stagger 60ms | `--ease-out-expo` |
| Metrics counter | JS `requestAnimationFrame` count-up | 800ms | `--ease-out-quint` |
| Security rows | `opacity 0→1, translateY 8px→0` | 280ms, stagger 50ms | `--ease-out-expo` |
| Button hover | `translateY -1px`, background shift | 150ms | `--ease-out-expo` |
| Card hover | `translateY -2px`, border brightens | 200ms | `--ease-out-expo` |
| Modal open | `opacity 0→1, translateY 12px→0` | 200ms | `--ease-out-expo` |
| Modal close | `opacity 1→0, translateY 0→8px` | 140ms | `--ease-in-out-sine` |
| Status pulse dot | `scale 1→1.4→1, opacity 1→0.3→1` | 2400ms | `ease-in-out`, infinite |
| Countdown flip | `translateY 0→-2px→0` per tick | 80ms | `--ease-spring` |
| Tab/nav transition | Active bar `width` or `left` slides | 180ms | `--ease-out-expo` |
| Connector SVG draw | `stroke-dashoffset` animation | 1200ms | `--ease-out-quint` |

### What to Never Animate
- Font-weight (causes layout shift)
- Width/height (use transform: scaleX/scaleY instead)
- `top`, `left`, `right`, `bottom` (use transform)
- Background-color on the page itself
- Opacity of text during normal reading state

### Reduced Motion

Wrap all non-essential animations in:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## TYPOGRAPHY SYSTEM

Define exactly these styles as utility classes or Tailwind tokens:

```
Display (hero):     56px / line-height 1.05 / weight 700 / tracking -0.03em
Heading 1:          32px / line-height 1.15 / weight 600 / tracking -0.02em
Heading 2:          20px / line-height 1.3  / weight 600 / tracking -0.01em
Heading 3:          16px / line-height 1.4  / weight 600 / tracking 0
Label:              11px / line-height 1.2  / weight 600 / tracking 0.08em / UPPERCASE
Body:               14px / line-height 1.65 / weight 400 / tracking 0
Body small:         13px / line-height 1.6  / weight 400 / tracking 0
Caption:            12px / line-height 1.5  / weight 400 / tracking 0.01em
Mono data:          13px / line-height 1.4  / weight 500 / font-family: monospace
Mono display:       24px / line-height 1.2  / weight 600 / font-family: monospace
```

Apply `font-variant-numeric: tabular-nums` to **all** numeric displays. This prevents width jitter in live-updating values.

---

## INTERACTION STATES

Every interactive element must implement all 5 states — no exceptions:

1. **Default** — resting state
2. **Hover** — visual feedback within 80–150ms
3. **Active/Pressed** — `scale(0.98)` or subtle darken, 80ms
4. **Focus** — `box-shadow: 0 0 0 2px rgba(107,92,231,0.5)` for keyboard users — never `outline: none` without a custom focus style
5. **Disabled** — `opacity: 0.35`, `cursor: not-allowed`, no pointer events — do not remove disabled buttons from the DOM

---

## EMPTY STATES

Design explicit empty states for:
- No active auctions: An inline SVG illustration (geometric, abstract) + heading `No active auctions` + subtext + `Create Auction` CTA.
- Bids list empty: `Your encrypted bids will appear here.` with a lock icon.
- Loading state: Use a **skeleton loader** pattern, not a spinner. Match skeleton blocks exactly to the dimensions of the content they replace. Skeleton color: `rgba(255,255,255,0.04)` with a horizontal shimmer using `background-size: 200% 100%` animated keyframe. Duration: 1.4s infinite.

---

## WHAT NOT TO BUILD

Do not add any of the following — these are signs of AI-generated "enhancement" that must be avoided:

- ❌ Hero section with floating 3D cube or orb
- ❌ Any section with the word "Powered by AI" or "Zero Knowledge" in large decorative text
- ❌ Particle animation backgrounds (canvas particle systems)
- ❌ Scrolling ticker/marquee animations as decorative elements
- ❌ "Glassmorphism" cards with `backdrop-filter: blur(20px)` and colored borders
- ❌ Animated gradient border effects (the rotating conic-gradient trick)
- ❌ Stats that auto-increment on scroll just for visual effect (only increment if showing real data)
- ❌ Confetti or celebration animations on bid submission
- ❌ Dark-mode toggle — this is a dark-only application, do not add one
- ❌ Any tooltip that uses a CSS triangle arrow — use a borderless flat tooltip or none
- ❌ Loading spinners that are not tied to actual async operations
- ❌ Hover effects that change the element's size or push surrounding content

---

## RESPONSIVE BEHAVIOR

**Desktop first.** This is a DApp primarily used on desktop. But implement these breakpoints cleanly:

- `>= 1280px` — Full sidebar + full content. Default layout.
- `960px – 1279px` — Sidebar collapses to icon-only (40px wide). Tooltip on hover shows label.
- `< 960px` — Sidebar becomes a bottom tab bar. Content takes full width. Metrics strip becomes 2×2 grid.
- `< 640px` — Single column. Modal takes full screen. Typography scale reduces by ~15%.

---

## CODE QUALITY REQUIREMENTS

- All components are JavaScript (JSX) — do not introduce TypeScript or `.ts`/`.tsx` files
- Extract all magic numbers into design tokens
- Animation values must live in constants, not inline
- No `!important` in styles — ever
- No inline styles on stateful elements that need to be overridden — use class composition
- Custom hooks for: `useCountUp`, `useIntersectionObserver`, `useCountdown`, `useLiveTimestamp`
- All SVG icons must be encapsulated as `<Icon>` components with `size`, `color`, and `strokeWidth` props
- Skeleton loaders must share exact dimensions with their content via shared layout components

---

## DELIVERABLE QUALITY BAR

When you are done, the UI should:

1. Pass a visual comparison against Hyperliquid's dark UI at first glance
2. Have zero layout shift on page load or data update
3. Have every number formatted consistently in monospace tabular font
4. Have no element that looks "approximate" — every alignment, every spacing, every color is deliberate
5. Have entrance animations so natural that a designer would not notice them, only feel the quality
6. Have all interactive states implemented including keyboard-focus
7. Feel like a production application used by serious auction participants — not a demo or a prototype

If any part of the resulting UI makes you think "this looks like a starter template" — rebuild it.

---

*Built for MPC-Auction · Powered by Arcium on Solana · Cryptographically guaranteed privacy*
