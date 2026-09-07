# Fix the double curve, the unwanted corners, and the missing spill

## What is actually happening

Two different things are drawing curves on every row, and they are fighting each other.

1. **Corner rounding** — a "Corners" setting that rounds the row's own box. Its current default is **medium**, so *every* row is rounded on all four corners whether or not you asked for it. That is why rows show a curve at the bottom when you only chose a top edge.
2. **Edge shapes** — the curve/arch/rounded cap you pick per edge, painted just outside the row so its colour spills over the neighbour.

When both land on the same edge, the row's own rounded box sits behind a full-width cap, and the mismatch between the two curves is the visible cut/step in your screenshot.

Not yet confirmed: why the last row no longer spills down over the footer. The footer is already set to stay underneath, so the likely cause is that those rows only have corner rounding (no bottom edge shape) — but this will be checked against the live page before changing anything.

## What will change

1. **Corners stop being on by default.** Rows without an explicit choice render square, exactly as before this setting existed. Rows where you picked a corner size keep it.
2. **Corners never fight an edge shape.** If an edge has a shape assigned, that edge's corners are left square and the shape owns the look — no more cut between two curves. The opposite edge still respects your corner choice.
3. **The Style panel makes the difference obvious**, so "Corners" (the row's own box) and "Edges" (curves that spill onto the next row) are not mistaken for one another.
4. **Spill over the footer verified end-to-end**: a bottom edge shape on the last row must visibly cover the top of the footer, on desktop and mobile. If the live check shows it broken, the paint-order/clipping cause is fixed in the same pass.

## Technical notes

- `RowSection.tsx`: default `surfaceRadius` becomes `none` instead of `medium`; radius is applied per corner — top corners suppressed when `shapeTop.kind !== "none"`, bottom corners when `shapeBottom.kind !== "none"`; clipping only when no shape at all.
- `RowStyleTab.tsx`: corner control reflects the `none` default and gets clarifying help text next to the edge-shape controls.
- Live check on `/` and `/services/internal-communications/` (published + preview) with Playwright: assert computed `borderRadius`, presence of `.section-shape[data-edge="bottom"]` on the last row, and its bounding box overlapping the footer.
- Add a regression test covering: shape edge ⇒ square corners on that edge, no shape ⇒ chosen radius, default ⇒ no radius.
