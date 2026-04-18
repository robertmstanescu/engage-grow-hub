---
name: Typography System
description: Tiered scale (Hero special, rest unified) using shared row wrapper components, 1.6 body line-height, vertical rhythm spacing scale, and .interactive hover utility
type: design
---

# Typography & Spacing System

## Tiered scale (Hero special, rest unified)
- **HeroRow** keeps its oversized fluid title `clamp(1.6rem, 5vw, 5.5rem)` — page-opener.
- **All other rows** (Boxed, Service, Profile, Grid, ImageText, Text, Contact) use the shared wrappers in `src/features/site/rows/typography/`:
  - `<RowEyebrow>` — `tracking-[0.35em]` uppercase, `clamp(9px, 0.9vw, 11px)`, `mb-rhythm-tight`
  - `<RowTitle as="h2">` — `font-display` (Unbounded) black, `leading-[0.95]`, `clamp(1.5rem, 3.5vw, 2.6rem)`, `mb-rhythm-base`
  - `<RowSubtitle>` — `Architects Daughter` script, `clamp(0.9rem, 2vw, 1.2rem)`, `mb-rhythm-base`
  - `<RowBody html={...}>` — `font-body-heading` (Bricolage), `leading-[1.6]` (WCAG 1.4.12), `clamp(0.9rem, 1.5vw, 1.05rem)`
  - `<RowSection>` — replaces hand-rolled `<section>` boilerplate; handles bg color/image, RowBackground, vAlign, `py-row md:py-row-md`, isolation, snap.

## Vertical rhythm scale (tailwind.config.ts → spacing)
- `rhythm-tight` 12px — eyebrow → title gap
- `rhythm-base` 24px — title → body, between major elements
- `rhythm-loose` 48px — section breaks within a row
- `row` 64px / `row-md` 112px — section padding-y

## Per-row color overrides preserved
Wrappers accept a `color?: string` prop. Admins still set `color_eyebrow`, `color_title`, `color_subtitle`, `color_body`, `color_description` per row in the editor. Wrappers only standardize **size / weight / spacing / line-height**, never color.

## Interactive states
- `.interactive` (in index.css) — standard hover for buttons/links: `300ms cubic-bezier(0.16, 1, 0.3, 1)`, opacity 0.85.
- `.interactive-strong` — same easing + slight scale for emphasis.
- **Do NOT** add `transition-all duration-500 hover:opacity-85` strings ad-hoc — use `.interactive`.

## Why these choices
- 1.6 line-height: WCAG 2.1 SC 1.4.12 minimum 1.5; 1.6 reads better long-form (NYT/Stripe standard).
- Bricolage Grotesque for body: more personality than Inter without sacrificing legibility — avoids generic "AI landing page" look.
- Tiered (not strict) typography: preserves visual hierarchy; hero is the page-opener, rest are scannable sections.
- Wrappers (not utility classes): stronger enforcement — components physically can't drift apart.
