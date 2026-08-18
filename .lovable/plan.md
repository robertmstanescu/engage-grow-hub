# Edges that always spill over the neighbouring row

## What's wrong today

- The "Rounded" edge is not a real shape: it only sets `border-radius` on the section itself. So the row does not extend over the row above — instead its own corners are cut away and the page mesh shows through them.
- Shapes only render when a row has its own colour, so a transparent Contact row can't spill anywhere.
- Nothing lets the dark footer curve up over the Contact row.

## What will change

### 1. Rounded becomes a spilling cap
Rounded stops cutting the section's corners. Instead the row paints a cap in its own colour that sits fully **outside** the section (above for a top edge, below for a bottom edge), with the outer corners rounded. Result: the row's surface visibly climbs over the row above (or down over the one below), and there are never mesh-coloured corners at the seam. Radius sizes stay subtle 24 / medium 48 / dramatic 80.

### 2. Spill is guaranteed, always
Every row that renders a top or bottom shape gets lifted above its neighbours in paint order, so a curve, wave, arch, angle or rounded cap can never be covered by the next section — including the last row over the footer.

### 3. Footer top edge control
The footer gains its own edge-shape setting (same shape + size + flip options as rows) in Global Settings ▸ Footer. When set, the dark footer colour spills **upward** over the Contact row.

### 4. Contact row spilling down
Give the Contact row a colour in Style and its bottom edge now spills over the footer. Both directions are available; you choose per design.

## Technical notes

- `SectionShape.tsx`: add a `rounded` branch rendering a coloured div (height = radius, `bottom:100%` / `top:100%`, outer corners rounded) instead of returning `null`; keep the SVG path branch as-is.
- `RowSection.tsx`: drop the `borderRadius` styling from the section; set `zIndex: 2` and `position: relative` whenever `shapeTop || shapeBottom` so the overhang always paints above neighbours.
- `index.css`: footer gets `position: relative; z-index: 0` so row overhangs land on top of it; footer's own shape renders with `z-index: 2`.
- `Footer.tsx` + footer settings type/editor: new `shapeTop` config, rendered with the existing `SectionShape` using `hsl(var(--revolver))` as the fill.
- Mobile keeps the existing 28px flattening for all shape kinds, including rounded.
