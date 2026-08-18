# Edge shapes, cleaner Style panel, slugs everywhere

## 1. Edge shapes continue the row above

Today a shape is filled with the *current* row's colour and pushed up over its neighbour, so the curve looks like the wrong surface intruding.

- Each row asks its previous/next sibling for its effective surface colour and fills the top/bottom shape with that instead.
- The top shape therefore reads as the row above bleeding down into this row; the bottom shape reads as the row below rising up.
- When a neighbour is transparent (mesh), the shape is filled with the page mesh's own tint so the curve still reads instead of disappearing.

## 2. Shapes available on every row

Shapes are currently skipped whenever a row has no explicit surface — that is why Our Vows and Contact offered no edge options.

- Remove the "needs a surface" gate: shapes render on mesh rows too, using the neighbour colour from step 1.
- Contact rows use a hand-rolled `<section>` instead of the shared wrapper, so they never got shapes or separators. Move the contact row onto the shared section wrapper (keeping its light styling) so it gets the same edge, separator and band controls as everything else.

## 3. Remove the stray glow on Our Services

Rows on the default mesh background still paint a legacy decorative radial glow, which is the extra gradient fighting the page mesh on Our Services. Mesh rows will paint nothing unless the admin has deliberately chosen a colour, gradient or image.

## 4. Simplified Style panel

Restructure the Style tab into two visible groups plus a collapsed Advanced group:

```text
Surface     band tone (mesh / white / tint / deep), background colour, background image
Edges       top separator, top shape, bottom shape (kind, size, flip)
Advanced    gradient editor, decorative overlays, opacity, alignment, column widths, custom CSS
```

Advanced stays collapsed by default so the common controls are the only thing on screen.

## 5. Slugs everywhere

- Add an editable `slug` to rows/sections, defaulting to a slugified title, shown at the top of the Content tab with a copy-anchor button.
- Slugs are validated (lowercase, dashes) and de-duplicated within a page; the row renders with that slug as its DOM id, so `#our-vows` always resolves.
- Widgets get an optional slug field in their Advanced tab for direct anchors.
- Pages and blog posts already have slugs — surface them in the same position and style so the editor feels consistent.
- Nav and footer link editors get a picker listing available slugs on each page rather than free-text hashes only.

## 6. Footer link from other pages

Footer/nav links stored as bare `#vows` do nothing outside the homepage. Links will resolve to `/#vows` (or `/<page>/#slug`) when the current route is not the page that owns the anchor, and the target scrolls into view after navigation.

## Technical notes

- Shape colour resolution: a small helper computes a row's effective surface (band tone token, `bg_color`, gradient start, or mesh tint) and `PageRows` passes the previous/next surface down to `RowSection`, which forwards it to `SectionShape`.
- `dividerTop`, `shapeTop`, `shapeBottom` stay in the existing `layout` schema; no migration needed for shapes.
- Row slug persists as `row.scope` (already used as the anchor id fallback in `RowRenderer`), so no schema change is required — only an editor field, validation and default backfill on save.
