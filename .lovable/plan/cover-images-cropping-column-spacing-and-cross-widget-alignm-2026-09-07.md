# Cover images, cropping, column spacing and cross-widget alignment

Four fixes to the row system, based on your answers.

## 1. Cover images: shorter, shaped by the photo, focal point everywhere

Today every row cover is forced into a fixed letterbox band (3:2 on phones, 21:6 on desktop), which crops
your picture, stretches the row and makes the page long.

- The cover keeps the uploaded picture's own proportions instead of a forced band.
- A default maximum height caps it at roughly 40% of the current band (about 60% shorter), so rows stay
  compact and images are no longer blown up and blurred.
- A focal-point picker is added next to every cover image field, so you choose what stays in view when
  the cap does crop.
- FAQ covers and blog covers keep their current treatment, untouched.

Applies to the row-level cover (Style tab) and the per-row cover fields on Text, Boxed, Grid, Service,
Contact, CTA band, Quote band, Proof band, Process, Logo cloud, Testimonial and Lead magnet rows.

## 2. A real crop tool, plus presets everywhere

- Every image field in the admin gets the shape preset dropdown (Original / Square / Portrait /
  Landscape / Wide / Banner) and the click-to-focus point — the ones that have it today keep it, the
  rest gain it (cover images, gallery picks, pasted URLs).
- New "Crop" button on the image picker: drag a box over the picture, optionally lock it to the chosen
  shape, and save. This writes a genuinely cropped copy back to the media library as a new file, so the
  original stays intact and the page only loads the smaller cropped image.

## 3. Per-row column spacing

New "Column gap" control in the row's Design/Layout settings: Tight / Normal / Wide (plus the current
value as the default so nothing shifts unless you change it). Applies to the space between side-by-side
columns and stacks down sensibly on phones.

## 4. Side-by-side widgets line up part by part

Right now every widget starts at the top of the column, so a widget with only body text sits level with
its neighbour's eyebrow.

New behaviour: within a row, eyebrows line up with eyebrows, titles with titles, body with body. A
widget that has no eyebrow starts at the title line; one with neither starts at the body line. Widgets
that share no parts at all fall back to today's top alignment.

## Technical notes

- `RowCoverImage.tsx`: drop the fixed `aspect-[3/2] md:aspect-[21/6]`; render at natural ratio with
  `max-height` from a new token (~40% of current effective band height) and `object-position` from
  `layout.coverFocalX/Y`. New optional layout fields: `coverFocalX`, `coverFocalY`, `coverMaxHeight`.
- `ImagePickerField.tsx`: absorbs `ImageShapeControl` (optional `shape` props) so every call site can
  opt in with two props, and gains a crop modal (canvas-based crop → upload to `editor-images` →
  `onChange` with the new public URL). `src/lib/imageShape.ts` stays the single source of ratios.
- `RowStyleTab.tsx`: focal picker for the row cover + the new Column gap control writing
  `layout.columnGap: "tight" | "normal" | "wide"`.
- `RowRenderer.tsx`: `gap-8` becomes a token driven by `layout.columnGap`.
- Alignment: switch the row grid to CSS subgrid rows (eyebrow / title / body / rest). Each single-widget
  column places its `RowEyebrow` / `RowTitle` / `RowBody` into the matching subgrid track, with empty
  tracks collapsing. Implemented behind a shared context so widgets that don't use the typography parts
  render exactly as today. Fallback for browsers without subgrid: current top alignment.
- Tests: extend `rowSurface`/`rowCorners` suites with cover-height, column-gap and part-alignment cases.
