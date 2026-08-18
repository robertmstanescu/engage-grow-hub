# One background per row, one mesh for the page

Three things: fix the consultation button on the service pages, strip every hard-coded tint/glow/mesh out of the front-end code, and reduce row styling to a single plain colour picker — with the page-wide mesh controlled from the Hero row.

## 1. "Book a free consultation" button

The button inside each service card is hard-coded to `#contact`. On `/services/employee-experience` and `/services/internal-communications` there is no contact section on the page, so the click does nothing.

Fix: point it at the homepage contact section (`/#contact`) everywhere, and make sure landing on the homepage with that hash scrolls smoothly to the contact row. Same fix for the CTA band's default link.

## 2. Remove the hard-coded decoration

Today every row silently paints a blurred radial "glow" behind itself, with a different hard-coded colour pair per row type (hero, text, service, boxed, contact, image+text, profile, grid). That is the extra mesh you see on top of a colour you pick.

Removing:
- The per-row decorative glow layer and all its hard-coded colour tables.
- The hard-coded `mesh-hero` / `mesh-dark` background classes on the standalone Hero section.
- The per-row Gradient editor and the per-row Background Image field (nothing on the site currently uses an image; one row uses a gradient and will be flattened to the closest plain colour).
- The duplicate "Background Color" field in the old rows list, and the widget-level Design > Background Colour, so there is exactly one place to set a background.

Result: a row is transparent (the page mesh shows through) unless you give it a plain colour.

## 3. One background control per row

The Style tab's Surface group keeps:
- Quick swatches: None (mesh), White, Plum, Ink, Cream.
- A custom colour picker + hex field.
- Opacity.

Nothing else paints the row. Text colour keeps flipping automatically to stay readable on whatever colour you pick.

## 4. Page mesh is owned by the Hero row

The Hero row's Style tab gets a "Page background (mesh)" group: four mesh colours plus an intensity slider. Those values paint the single fixed gradient behind the whole page, from the hero down to the footer. Rows below simply show it through.

If a page has no hero, it falls back to the global default currently in Brand Settings, which stays as the site-wide default.

## 5. Decorative edges

Edge shapes stay as they are: a shape is painted in the row's own colour and sits on top of the neighbouring section — top edge spills up over the row above, bottom edge spills down over the row below. I will re-check both directions after the layering changes above, since removing the glow layer changes the stacking.

## Technical notes

- Delete `src/features/site/rows/RowBackground.tsx` and the legacy gradient helpers in `rowBackground.ts`; `RowSection.tsx` renders only `backgroundColor` + shapes + overlays.
- `RowStyleTab.tsx`: drop `GradientEditor`, the background-image field and the per-type gradient defaults; keep swatches, colour, opacity, dividers, shapes, alignment, column widths, snap.
- `WidgetInspectorTabs.tsx`: remove the Design > Background block and its `onDesignBgChange` wiring; `RowsManager.tsx`: remove its bg colour field.
- `ServiceCard.tsx` and `CtaBandRow.tsx`: `#contact` becomes `/#contact`; `useSmoothAnchors` / homepage hash handling scrolls on arrival.
- Hero mesh: hero `layout.mesh` (4 colours + strength) is written to the `--gradient-mesh-page` / `--mesh-strength` variables consumed by `.page-mesh-layer`.
- Data migration over `site_content` (live + draft) and `cms_pages`: flatten the single existing gradient to a plain `bg_color`, then strip `gradient`, `gradientStart`, `gradientEnd`, `bgImage`, `bgImageOpacity` keys. No rows currently use background images or overlays.
