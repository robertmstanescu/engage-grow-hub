# Row visuals, hero controls and an accessible type scale

## 1. Visual elements (the up-to-5 images behind a row)

Confirmed in the code: those images are drawn in a layer set *behind* the row, but a row that has its own colour paints that colour on top of them, so they can never be seen. They will be moved into a layer that sits above the row colour and below the text, keeping the existing opacity, blend, position and rotation controls. Upload permissions are in place, so nothing changes there.

## 2. Hero fixes

- **Foreground image doesn't show**: today it only appears on very wide screens (1280px+) *and* only when alt text is filled in. Change to: show from 1024px up, and show as soon as an image is chosen (alt text stays required to publish, with a clear warning in the editor).
- **Alignment**: add a Hero alignment choice (left / centre / right) that moves the eyebrow, title, tagline, subtitle, body and button together. Default stays centred.
- **Eyebrow colour**: the hero currently ignores the admin's colour choice and always uses the theme colour. It will use the chosen colour when set. Same fix applied to the tagline colour, which has the same bug.
- **Background image/video**: verify the hero-row background field end to end (upload, saved value, render) and fix whatever breaks it — likely candidates are the image/video URL not reaching the renderer and the page mesh painting over it. Cause to be confirmed before the fix.

## 3. Cover images on other rows

Today the cover picture is wrapped in a white card with a drop shadow and inner padding. Change it so the picture starts flush at the top of the row's content area, drops the shadow and the white card, and fades directly into the row's own background colour (or the page background when the row is transparent). Corners keep matching the row's rounding.

## 4. Image & Text rows

- Text auto-shrinking will be confined to the body copy only; title and eyebrow keep their size. (The code already targets body only, so the exact trigger will be reproduced in the browser first, then fixed.)
- The picture's corner rounding changes from a 4px sliver to the same radius as every other box on the site.

## 5. FAQ

Questions and answers always align left, regardless of the row's alignment setting. The row's heading/intro keeps following the alignment setting.

## 6. Rounded/curved edges on transparent rows

Rows without a colour currently render no spilling edge at all. They will spill using the page background (the mesh/gradient), in the same direction and sizes as coloured rows, so a transparent row can also curve over its neighbours.

## 7. Accessible type scale

Raise the shared sizes so body text is comfortably readable and widget headings clearly read as headings:

| Token | Now (min → max) | Proposed |
| --- | --- | --- |
| Row title | 24px → 48px | 30px → 52px |
| Subtitle | 15px → 21.6px | 18px → 24px |
| Body | 14.4px → 17.6px | 17px → 20px |
| Card title | 15.2px → 17.6px | 19px → 22px |
| Card body | 13.6px → 16px | 16px → 18px |
| Eyebrow | 9px → 11px | 12px → 14px |
| Small labels | 10px → 12px | 12px → 14px |
| FAQ question / answer | 16 / 14px | uses card title / body tokens |

Also: minimum line-height 1.5 on body copy, and the hero scale left untouched.

## Technical notes

- Overlays: move `renderOverlayElements` out of `z-[-1]` in `RowSection.tsx` into a `z-0` absolute layer, with content raised to `z-10`.
- Hero: `HeroSection.tsx` — `hasVisual` drops the alt requirement, breakpoint `xl:` → `lg:`; new `align` content field driving the flex/text alignment classes and `useFitTitleLines`; `color_label` / `color_tagline` honoured over `--hero-label`; audit `bg_type`/`bg_url` path in `HeroRowFieldsInline` → `HeroRow` → `HeroView`.
- `RowCoverCard.tsx`: drop `boxShadow`/`--gradient-card`/outer padding, keep radius from the row's shape size, keep the `CoverFadeImage` mask so it dissolves into the inherited row surface.
- `ImageTextRow.tsx`: image `borderRadius: 4` → `var(--radius)`; reproduce the title-shrink report against `useAutoFitText`.
- `FaqRow.tsx`: force `text-left` on the accordion block.
- `RowSection.tsx`: allow `shapeTop`/`shapeBottom` when the row is transparent by filling `SectionShape` with `var(--gradient-mesh-page)` instead of the row colour.
- Type scale: edit only the `--fs-*` tokens in `index.css`; no per-component clamps.

## Verification

Browser pass at mobile, tablet and desktop on the homepage, About Us, a service page, blog and a page containing FAQ, Image & Text and cover-image rows; plus an admin pass adding a visual element, a hero foreground image and a hero background.
