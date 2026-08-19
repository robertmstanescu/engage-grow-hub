# Row QA pass: editable content, colour controls, image bands

A full audit of every row type, plus fixes for the specific problems found.

## What's broken today (verified in the code)

1. **Some rows can't be edited from the Inspector.** The Inspector's editor lookup has entries for hero, service, contact, image+text, profile, grid, text, boxed, lead magnet, logo cloud and vows only. Clicking a **Proof band**, **Process steps**, **Quote band**, **CTA band**, **Testimonial**, **FAQ** or **Image** widget shows "No inspector editor available" — the editors exist, they were just never wired into the panel.
2. **Eyebrow / Note colour pickers are missing** on most rows. Only Image+Text, Grid and Profile have them; the shared Section Header block used by the newer rows has none.
3. **Image row height doesn't take.** The height setting is applied as a *minimum*, so a tall picture keeps its natural size and ignores "Small".
4. **Image row full width.** Full bleed works only when the row has no leftover container settings; the figure still keeps caption padding that can look inset.
5. **Edge shapes on image rows paint the row's background colour**, not the photo, so the curve looks like a coloured band over the neighbour.
6. **Image+text split** can't favour the text side clearly — the width control is there but the first slider always means "image", regardless of which side the image is on, which is why it feels like it does the opposite.

## What will change

**Every row becomes editable**
- Wire the missing editors into the Inspector: Proof band, Process steps, Quote band, CTA band, Testimonial, FAQ, Image.
- Any future unmapped type falls back to the generic Section Header fields instead of a dead-end message.

**Colour controls everywhere**
- Add **Eyebrow colour** and **Note colour** to the shared Section Header block, so every row type (text, proof band, process steps, FAQ, testimonial, quote, CTA, logo cloud, image+text, grid, profile) exposes the same set: eyebrow, title, subtitle, body/description, note.
- Empty = follow the row's automatic light/dark text colour.

**Image rows as real page breakers**
- Height becomes **exact**: Small / Medium / Large / Full screen / Custom set the band height and the photo fills and crops to it using the Focal point setting. Auto keeps the natural ratio.
- Full bleed truly edge-to-edge: no container, no side padding, caption overlaid or placed inside the band rather than adding height.
- **Edge shapes cut the image itself.** On an image row the curve is applied as a mask on the band, and the band pulls up/down over the neighbouring row, so the photo (not a colour) spills over. Coloured-cap behaviour stays for all other rows.

**Image + text split**
- The width control gets labelled by side ("Image side" / "Text side") and follows the chosen image position, so setting the text side to 60–70% actually widens the text.
- Text column keeps its minimum readable measure at narrow splits.

**QA sweep of the remaining rows**
Check and fix, per row type: content editor reachable, all header fields present, colours applied, text contrast on dark row colours, height and edge shapes honoured, alignment settings respected, mobile behaviour. Covers hero, text, boxed, grid, image, image+text, profile, service, vows, contact, FAQ, logo cloud, testimonial, proof band, process steps, quote band, CTA band, lead magnet.

## Technical notes

- `InspectorPanel.tsx`: extend the legacy switch with the missing widget types (editors already exist in `NewRowEditors.tsx`, `ImageRow.tsx`), plus a `BrandHeaderFields` default branch.
- `NewRowEditors.tsx`: `BrandHeaderFields` gains `ColorField`s for `color_eyebrow` and `color_note`; `RowEyebrow` already reads `color_eyebrow`, renderers that show a note read `color_note`.
- `rowHeight.ts` gains `resolveRowExactHeight`; `RowSection` applies `height` + `overflow: hidden` (instead of `min-height`) when the row is an image row with a non-auto height.
- `ImageRow.tsx`: figure fills the band (`absolute inset-0` + `object-cover` + `objectPosition`), caption becomes an overlay; bleed removes `row-container`.
- `SectionShape` gains a `mask` mode: for image rows the shape renders as a CSS `mask-image` on the section plus a negative margin equal to the shape height, so the picture overlaps the neighbour. Existing cap mode untouched for coloured rows.
- `RowStyleTab.tsx`: dynamic labels for `ColumnWidthControl` on `image_text`/`profile`; `ImageTextRow` maps `column_widths` to the image/text columns by position and uses a `matchMedia` listener instead of a one-shot `window.innerWidth` read.
