# Image rows as page breakers

Bring back the full-width look of image rows, now combined with the new height and edge-shape controls.

## What you get

- Image rows render edge-to-edge by default: no side margins, no top/bottom padding — a true page-breaker band.
- A **Full bleed** toggle in the Style tab lets you switch any image row back to the normal contained width.
- When a height is set (Small / Medium / Large / Full screen / Custom), the image fills the whole band and crops the overflow instead of letter-boxing.
- A **Focal point** control (top / centre / bottom, plus left / right) decides which part of the picture stays visible when cropped.
- Edge shapes and row background still apply, so a rounded or wave edge cuts into the image itself.

## Technical notes

- `RowSection` gains a `bleed` prop that drops the container max-width and horizontal padding, and zeroes the fluid vertical padding (optical-centring padding for edge shapes still applies).
- `ImageRow` passes `bleed` from `row.layout.fullBleed` (default `true` for image rows).
- With a non-auto `heightMode`, the image wrapper stretches to the row's min-height and the `<img>` uses `object-fit: cover` with `object-position` from the new focal setting; auto height keeps the current natural-ratio rendering.
- New optional layout fields in `src/types/rows.ts`: `fullBleed?: boolean`, `focalPoint?: 'top' | 'center' | 'bottom' | 'left' | 'right'`.
- `RowStyleTab` shows the Full bleed switch and the Focal point selector (focal only when a height is set), following the existing deferred-save pattern.
- Rounded-edge content clipping for transparent rows keeps working, so a bleeding image can still have rounded outer corners.

No new row type is needed — the existing image row covers the breaker use case.
