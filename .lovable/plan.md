# Editor and row layout fixes

## 1. Quote Band: appears but can't be filled in

You can select it and the settings panel opens, but typing doesn't stick. The wiring from the panel to the widget looks correct (the quote field is routed to the right editor and saves onto the right widget), so the cause is unconfirmed — most likely the rich-text box inside the panel resetting itself while you type.

Step one is to reproduce it in the editor and watch what happens on each keystroke, then fix the actual cause (rich-text box resetting/remounting, or the field losing focus). The same check runs for "How We Work", which has the same kind of fields.

Acceptance: type a quote, a name and a role, click away, reload the page — the text is still there and shows on the canvas and the live page.

## 2. Rounded edges should belong to the row, not each widget

Today every widget paints its own coloured band, so a row holding two widgets side by side shows two separate rounded caps with a seam between them (as in your screenshot).

Change: a row paints its background colour, its top/bottom edge shapes, its rounded corners and its height **once**, around all of its widgets. Widgets inside a row that already paints itself render transparently on top, keeping their own spacing and content only.

Acceptance: a two-widget row shows one continuous coloured band with a single rounded top edge across the full width; single-widget rows look exactly as they do now.

## 3. Services widget: eyebrow can't be emptied

Clearing the eyebrow makes the widget fall back to the old "pillar number" value, so something always shows. Change it so an empty eyebrow means no eyebrow at all: the fallback only applies when the field has never been set, and an emptied field hides the line entirely.

Acceptance: clear the eyebrow on a Services widget — nothing is displayed above the title, in the editor and on the live page.

## 4. Row-level cover image (optional)

Because the row now owns its background, it also gets its own optional cover image — one picture for the whole row, spanning its full width and matching its rounded corners and edge shapes, fading into the row's colour exactly like the widget cover does today. Per-widget cover images stay available for single-widget rows.

New controls in the row's Style panel: pick an image, alt text, and choose fade or plain fill.

## 5. Pull the text further up over a fading cover image

A "text overlap" control on the row cover: slide the content block upward so it sits higher over the fading picture instead of starting below it. Zero keeps today's look; higher values pull the text up over the image. Reduced automatically on phones so nothing collides.

Acceptance: with a fading row cover, raising the overlap moves the text up over the image without clipping it or overflowing the row, on desktop and mobile.

## Technical notes

- **1.** Reproduce with Playwright on `/admin/site`: select a Quote Band widget, type into the Quote `RichField` (`FieldComponents.tsx` → `RichTextEditor`) and log the value after each input. Suspect a content-prop resync on every parent re-render (each keystroke calls `patchWidgetContent`, re-rendering `InspectorPanel`). Fix inside the rich text editor's sync effect (only re-sync when the incoming HTML differs from the editor's own current HTML) rather than special-casing the quote widget. Re-check `process_steps` afterwards.
- **2.** Introduce a row-level surface in `RowRenderer.tsx` that owns what `RowSection` currently paints (`bg_color`, `shapeTop`/`shapeBottom` via `SectionShape`, divider, min-height, optical padding). Provide a context flag (e.g. `RowSurfaceContext`) consumed by `RowSection` so a widget inside a painted row renders as a bare wrapper: no background, no shapes, no `min-height`, content padding only. Keep the standalone path unchanged for anything that renders a row outside the v3 renderer.
- **3.** In `ServiceRow.tsx`, replace `c.eyebrow || c.pillar_number` with a resolved value that uses `pillar_number` only when `eyebrow` is `undefined`, and skip the whole eyebrow block when the resolved value is empty.
- **4/5.** Store on `row.layout`: `coverImage`, `coverImageAlt`, `coverMode` (`fade` | `fill`), `coverTextOverlap` (0–160px). Render inside the new row surface reusing `RowCoverCard`'s flush fade treatment (`CoverFadeImage`) so radius and shapes are inherited from the row clip, with the widget grid pulled up by a negative margin equal to the overlap (clamped, halved below `md`). Add the controls to the row Style panel next to Surface/Edges, using the existing `ImagePickerField` + `ImageAltInput`.

Verification: `bunx tsgo --noEmit`, plus Playwright passes on the admin editor (quote typing, two-widget row band, row cover with overlap) and on a services page.
