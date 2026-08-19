# Fix /about-us: hero parity, edge bleed, row height, auto light text

## 1. Edge bleed on CMS pages

Two things are wrong at once:

- No row on /about-us has an edge shape stored, so nothing can spill. The Style tab's shape picker must reliably persist on CMS pages (same save path as homepage rows) — verify and fix the persistence path first.
- Apply sensible defaults on /about-us: each coloured row gets a rounded top edge so it climbs over the row above, and the last row before the footer spills down.

Shapes only render when a row has its own colour; every about-us row except "The Summoning" has one, so the coverage is there.

## 2. Hero parity

The homepage hero renders through `HeroSection`; CMS pages render `HeroRow`. They have drifted. `HeroRow` will be rebuilt to reuse the homepage hero's exact structure: same fluid type scale, same full-height rule, same slow cascade fade-in, same content stack (label, title lines, tagline, subtitle, body, CTA). One hero look everywhere.

The about-us hero also still carries a legacy `layout.mesh` block from the old per-row mesh system — that gets stripped so only the page-wide mesh applies.

## 3. Row height control

New "Height" control in the Style tab for every row:

- Presets: Auto, Small, Medium, Large, Full screen
- Custom value in px or vh

Stored on the row layout, applied as a minimum height on the section so content still grows past it. Existing rows stay on Auto, so nothing changes until set.

## 4. Automatic light text on dark backgrounds

Today only rows with their own colour flip their text. Transparent rows fall back to the dark default even when the page mesh behind them is dark. Fix: compute the mesh's effective luminance from the hero's mesh colours, publish it as a page-level readable-foreground token, and have transparent rows use that instead of the fixed dark default. Icons, hairline borders and muted text derive from the same token so they flip together.

## 5. Second row layout

"The Summoning" stores `column_widths: [45, 55]` while `columns: 1` — a leftover from the old two-column config, which is why it renders off. The row's stored layout gets normalised so widths always match the column count.

## Technical notes

- `HeroRow.tsx` → render via the shared hero markup extracted from `HeroSection.tsx` (single source of truth component, both call sites pass content).
- `pageMesh.ts` → export a `meshLuminance()` helper; `PageRows.tsx` sets `--page-fg` on the document root next to `--gradient-mesh-page`.
- `RowSection.tsx` → `--row-fg` falls back to `var(--page-fg)` instead of `hsl(var(--foreground))`; add `minHeight` from the new layout field.
- `types/rows.ts` → add `heightMode` + `heightValue` to the row layout type; `RowStyleTab.tsx` gets the preset selector and custom input.
- Data migration on `cms_pages.page_rows` (about-us): drop `layout.mesh`, fix `column_widths`, set the rounded edge shapes.
