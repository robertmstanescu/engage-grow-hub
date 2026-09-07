# Full row-system audit and repair

## Goal

Make every row render identically in the editor and on the public site, with row-level curves, backgrounds, covers, spacing, and layout owned by the row—not recreated by individual widgets. Add flexible mixed-size layouts, image shape presets with focal-point control, and dependable responsive typography without changing the current colour scheme.

## Confirmed findings

- The editor and public site use the same renderer, and published row layout data is preserved. The failure is in rendering, not publishing.
- Row corners are currently applied only when a row has multiple widgets or a row-level cover image. Single-widget rows—including the homepage Contact row—fall back to the widget’s internal section, where the radius value is hard-coded to do nothing.
- The live multi-widget test row computes a `24px` radius, but it also uses an external rounded edge cap and `overflow: visible`; these overlapping mechanisms make the visible boundary differ from the section’s computed radius.
- Row and widget responsibilities overlap: both can own backgrounds, corners, spacing, and section wrappers. Widgets still receive a synthetic legacy row, which allows them to repaint row-level surfaces.
- Image rendering is fragmented across several fixed aspect ratios. Only the standalone Image widget currently supports a focal point; hero, covers, Image & Text, Profile, resource, and blog images do not share that control.
- The active fonts are already Bricolage Grotesque for headings and Inter for body text. One stale comment still names Unbounded. Font loading is currently done through a CSS URL import, and two separate responsive type scales plus two fitting systems can drift.
- The reference site’s useful patterns are large text constrained by its actual content width, decisive light/dark section contrast, and generous whitespace. We will borrow those principles, not its branding or colour palette. [Reference](https://stellarmarketingstudio.co.uk/)

## Implementation plan

### 1. Establish one row surface

- Make `RowRenderer` create exactly one visual surface for every canonical row, regardless of widget count or cover image.
- Move background, opacity, corner radius, edge shapes, row height, cover image, overlays, outer spacing, and clipping decisions into that surface.
- Make nested legacy widget sections render content-only while they are inside the row surface.
- Define one curve scale and one clear interaction between ordinary rounded corners and decorative top/bottom edge shapes, including transparent mesh-backed rows.
- Preserve the FAQ’s intentional padded white image-card treatment as a widget-specific inner treatment.

### 2. Separate rows, cells, and widgets

- Introduce explicit rendering contracts:
  - **Row:** outer surface, columns, ratios, height, cover, edges, page-level spacing.
  - **Cell:** internal stack/grid direction, gap, alignment, span, and optional inner-cell styling.
  - **Widget:** content, semantic markup, and narrowly scoped content presentation.
- Replace the broad synthetic-row adapter progressively with a typed widget render context so widgets cannot accidentally repaint the parent row.
- Clarify the editor labels for outer row styling versus optional inner block styling; retain existing saved widget settings for compatibility rather than deleting them.
- Keep v1/v2/v3 normalization at the rendering boundary and avoid a destructive content migration - but do delete eventual outdated files no longer needed (double check if they have dependencies).

### 3. Repair curves and contact-row parity

- Apply the selected row radius on single- and multi-widget rows, with or without covers and edge shapes.
- Test the homepage Contact row and the existing two-column service rows using their real published and draft data.
- Verify that curves remain visible against adjacent rows, transparent page mesh, covers, and at mobile widths.
- Add regression coverage for computed radius, visible clipping/masking, one-surface-only rendering, and editor/public parity.

### 4. Complete structured mixed-size layouts

- Keep column ratios as a row concern and make the existing ratio control map directly to the public grid.
- Extend the model for structured mixed-size grids: configurable column ratios plus cell spans, with predictable stacking on small screens.
- Add safe defaults and validation when stored ratio counts no longer match the number of columns.
- Ensure drag-and-drop preserves ratios, spans, widget IDs, and content when widgets move between cells.
- Support balanced side-by-side blocks in the style of the Ruul reference: several blocks can share one row, and in text-and-image pairings the picture fills its whole half so both sides align top and bottom for a symmetrical result.
- Make that balance an option, not a rule: each row can switch between matched-height symmetry and a looser, deliberately uneven arrangement.
- Allow a small numbered eyebrow ("01", "02"…) above each block heading, and keep the block body short and readable with the accessible line spacing and length rules from step 7.

### 5. Add shared image shape and focal-point controls

- Create one image-display model used by every image picker: **Original, Square (1:1), Portrait (3:4), Landscape (4:3), Wide (16:9), Banner**.
- Add a visual focal-point selector stored as percentage coordinates, with sensible migration from the current top/centre/bottom/left/right values.
- Apply the same crop and focal point in the picker preview, editor canvas, and public renderer for hero backgrounds/foregrounds, row covers, Image, Image & Text, Profile, resources, testimonials/logos where applicable, and blog imagery.
- Centralise responsive image delivery, `srcSet`, sizing, lazy/eager loading, and alt-text resolution. Keep the original uploaded asset unchanged; presets control presentation rather than destructively cropping the file.

### 6. Make responsive typography reliable

- Remove the remaining Unbounded reference and keep Bricolage Grotesque for headings and Inter for body copy throughout.
- Replace the CSS font import with non-blocking document font loading while preserving the existing families and weights.
- Consolidate the overlapping type scales into one documented semantic scale for hero, row headings, card headings, body, labels, quotes, and stats.
- Replace the separate hero/body fitting implementations with one width-aware fitting utility that measures the real container, respects minimum legible sizes, refits after fonts/images load, and does not create resize loops.
- Use natural wrapping for prose and controlled shared scaling only for display headings; preserve the rule that all lines of a hero heading use the same size.

### 7. Whitespace, reading comfort, and contrast without recolouring

- Do not alter brand colours or introduce a new palette.
- Standardise row gutters, max-widths, vertical rhythm, heading measures, and content density so rows have clearer separation and more deliberate open space.
- Set accessible reading defaults for text inside rows: comfortable line spacing (roughly 1.5–1.7 for body copy, tighter for large headings), deliberate letter spacing (slightly open for small uppercase labels, neutral for body, slightly tight for display headings), consistent paragraph spacing, and a capped line length of about 60–75 characters for prose.
- Apply those text settings through shared typography tokens so every row, card, and rich-text block inherits them instead of setting its own values.
- Use only the colours already assigned to each row, but improve contrast through placement, spacing, typography weight, and surface boundaries.

### 8. Validation

- Add focused unit tests for row ownership, legacy normalization, ratios/spans, image presets/focal points, and text fitting.
- Run type checks and the relevant existing test suites.
- Use browser checks on the homepage, Contact row, and representative service pages at phone, tablet, desktop, and very wide desktop sizes.
- Compare editor draft and public output for the same saved rows, checking corners, overflow, text wrapping, image crops, horizontal scrolling, and console errors before marking the work complete.

## Technical sequencing

1. Lock regression tests around the current failing rows.
2. Unify row surface rendering without changing stored content.
3. Narrow widget responsibility and retain compatibility adapters.
4. Extend mixed-size grid behavior.
5. Add the shared image presentation model and migrate renderers incrementally.
6. Consolidate typography and spacing.
7. Complete responsive visual QA and publish-parity checks.

## Constraints

- No colour-system changes in this work.
- Bricolage Grotesque remains the heading font; Inter remains the body font.
- Existing published content, draft content, service-pillar colours, FAQ card treatment, alt text, and drag-and-drop behavior must remain intact.