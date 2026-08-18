# Balanced content centring for rows with edge shapes

## Answers first

1. **Radius corners** — no, not all four. The rounded edge paints a cap outside the row and only rounds the two *outer* corners: top-left + top-right for a top edge, bottom-left + bottom-right for a bottom edge. The two corners touching the row stay square so the cap and the row read as one surface.

2. **Why the padding looks uneven** — the row's own padding is equal top and bottom (42px fluid), but a shape cap adds extra painted surface *outside* the row on whichever edge it's set. With a bottom cap only, the coloured area below the content grows by the cap height while the top stays the same, so the content sits visually high (and vice versa for a top cap).

## What will change

Rows compensate for their own edge shapes so content stays optically centred in the **total painted surface** (row + caps):

- A row with a **top shape** gets extra bottom padding equal to that shape's height.
- A row with a **bottom shape** gets extra top padding equal to that shape's height.
- Both shapes set: the additions cancel out and nothing changes.
- Mobile uses the flattened heights (28px SVG / 24px rounded) so the compensation matches what's actually drawn.

Result: whatever combination of edges you pick, the text block sits in the middle of the coloured mass, not the middle of the box.

## Technical notes

- Export a `shapeHeightPx(config, isMobile)` helper from `SectionShape.tsx` reusing the existing `SIZE_PX` map (40 / 72 / 120) and the rounded radii (24 / 48 / 80), with mobile overrides.
- In `RowSection.tsx`, add `paddingTop`/`paddingBottom` deltas to the inline `style` (on top of the `py-row-fluid` class) using those heights; keep `style` prop overrides winning as they do today.
- No changes to shape rendering, colours, z-index or the admin panel.
