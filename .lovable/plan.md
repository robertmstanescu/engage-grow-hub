# Simplify row styling: one page mesh, one colour picker, overlapping edges

## Goal

Kill the band system entirely. The page has exactly one mesh gradient behind everything (hero to footer). A row is transparent unless you pick a colour for it. Shaped edges (wave, arch, angled, taper, notch, rounded) sit **on top of** the section above, painted in the row's own colour.

## What changes for you

**Style tab — Surface**
- "Section band" (Mesh / Auto / White / Tint / Deep) is removed.
- One control: **Row background** — `None (mesh)` by default, plus quick swatches for White, Soft plum, Plum ink, Cream, and a custom colour picker with an opacity slider.
- Text colour keeps auto-contrasting against whatever colour you choose.

**Style tab — Edges**
- Same shape choices for top and bottom, with size and flip.
- New behaviour: the shape is your row's colour and **overlaps the row above** (top edge) or the row below (bottom edge), instead of being drawn inside the row in the neighbour's colour.
- If a row has no colour, shapes are disabled with a one-line hint ("Pick a row colour to use a shaped edge") — there is nothing to overlap with.
- Explanatory copy about mesh/bands is deleted.

**Existing content**
- White band → white, Tint → soft plum wash, Deep → plum ink. Mesh/Auto → transparent. Applied to both live and draft page content so the admin and site match.

## Technical notes

- `src/index.css`: delete `[data-band=...]` rules (white / tint / deep / auto / mesh) and the `--mesh-shape-fill` token; keep `.page-mesh-layer` as the single page background. Rewrite `.section-shape` positioning so the top-edge SVG sits at `top: calc(-1 * height)` and the bottom-edge SVG at `bottom: calc(-1 * height)`, with a positive z-index so it paints over the neighbouring section.
- `src/features/site/rows/typography/RowSection.tsx`: drop `band` / `bandTone` / `explicitBand` / `meshBand` branches; background is `getRowBgColor(row)` or nothing. Shape colour comes from the row's own resolved colour, not from neighbours.
- Delete `RowNeighborContext.tsx` and `rowSurface.ts`; remove `prevSurface` / `nextSurface` plumbing from `RowRenderer.tsx` and `PageRows.tsx`.
- Sections need `position: relative` plus ascending/descending z-index so an overlapping shape is not clipped by the next section's background; `isolation: isolate` on the section is removed so the shape can escape (decorative overlays stay contained via their own wrapper).
- `RowStyleTab.tsx`: replace the band grid with the preset swatch row + colour input; gate the two `ShapePicker`s on a colour being set.
- `src/types/rows.ts`: remove `bandTone` from `RowLayout`; `WidgetInspectorTabs.tsx` style-key list drops `bandTone`.
- Data migration: one SQL update mapping `bandTone` to `bg_color` on `site_content` / page `content` and `draft_content`, then strip the key.
- Verify with Playwright: home page and a service page screenshot, confirming a coloured row with a top wave overlaps the section above and transparent rows show a single continuous mesh.
