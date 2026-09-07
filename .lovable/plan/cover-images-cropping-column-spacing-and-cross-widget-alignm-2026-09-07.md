# Cover images, cropping, column spacing and cross-widget alignment

Carries over the plan you cancelled, plus the new corner/top-gap fix.

## 1. Row cover images: flush, clipped by the row's curve, and much shorter

Today a cover sits in a fixed letterbox band (3:2 on phones, 21:6 on desktop), begins *below* the row's
top padding, and its square top corners cut across the row's rounded corners — the white band and the
straight-edged photo in your About Us screenshot.

- The cover moves to the very top of the row, flush with its edges, with the row's top padding removed
  whenever a cover is present. The FAQ padded card keeps its current spacing, unchanged.
- The picture's top corners are clipped to exactly the row's own corner curve, so photo and row share
  one silhouette.
- The cover keeps the uploaded photo's own proportions instead of a forced band.
- New per-row height control: Small / Medium / Large. Small (the new default) is about 60% shorter than
  today's band; Medium and Large step up from there, and none of them exceed the photo's natural height.
- A focal-point picker sits next to every cover image field, so you choose what stays in view when the
  height cap does crop.

Applies to the row-level cover (Style tab) and the per-row cover fields on Text, Boxed, Grid, Service,
Contact, CTA band, Quote band, Proof band, Process, Logo cloud, Testimonial and Lead magnet rows. Blog
covers are untouched.

## 2. A real crop tool, plus shape presets everywhere

- Every image field in the admin gets the shape dropdown (Original / Square / Portrait / Landscape /
  Wide / Banner) and the click-to-focus point — the fields that have it keep it, the rest gain it
  (cover images, gallery picks, pasted URLs).
- New "Crop" button on the image picker: drag a box over the picture, optionally locked to the chosen
  shape, and save. It writes a genuinely cropped copy into the media library as a new file, so the
  original stays intact and pages load the smaller image (better quality per pixel, less scrolling).

## 3. Per-row column spacing

New "Column gap" control in the row's Design settings: Tight / Normal / Wide. Two-column rows currently
sit at the widest setting; the default becomes the tighter one so side-by-side blocks read as a pair.
Columns still stack with sensible spacing on phones.

## 4. Side-by-side widgets line up part by part

Right now every widget starts at the top of its column, so a widget with only body text sits level with
its neighbour's eyebrow.

New behaviour: within a row, widgets share a single implicit baseline grid made of eyebrow, title and
body lines. The first line that exists in either widget becomes the starting line for both widgets. If
both widgets have an eyebrow, those eyebrows align; if only one has an eyebrow, the other widget starts
level with that eyebrow. If neither has an eyebrow but both have titles, the titles align; if only one
has a title, the other widget starts level with that title. Only when both widgets are missing both eyebrow
and title do they fall back to today's top alignment.

## Technical notes

- `RowCoverImage.tsx` / `RowCoverCard.tsx`: drop the fixed `aspect-[3/2] md:aspect-[21/6]`; render at
  natural ratio with `max-height` from a new `coverHeight` token (`small` ≈ 40% of today, `medium`,
  `large`) and `object-position` from `layout.coverFocalX/Y`. Top corners take the row's resolved
  surface radius via `overflow:hidden` on the cover frame; the frame is hoisted above the row's padded
  container in `RowRenderer.tsx` (and in the per-row cover call sites) so it is flush. FAQ keeps
  `variant="card"` behaviour.
- New optional `RowLayout` fields: `coverFocalX`, `coverFocalY`, `coverHeight`, `columnGap`.
- `ImagePickerField.tsx`: absorbs `ImageShapeControl` (optional props) so any call site opts in, and
  gains a canvas-based crop modal that uploads the cropped result to `editor-images` and returns the new
  public URL. `src/lib/imageShape.ts` stays the single source of ratios.
- `RowStyleTab.tsx`: focal picker + height control for the row cover, and the Column gap control.
- `RowRenderer.tsx`: `gap-8` becomes a token driven by `layout.columnGap` (default tighter).
- Alignment: row grid switches to CSS subgrid tracks (eyebrow / title / body / rest); each column places
  its `RowEyebrow` / `RowTitle` / `RowBody` into the matching track, empty tracks collapsing. Behind a
  shared context so widgets not using those parts render exactly as today; browsers without subgrid keep
  top alignment.
- Tests: extend the `rowSurface` / `rowCorners` suites with cover height, flush-top corner clipping,
  column gap and part-alignment cases.
