# Move existing widgets between cells + fix widgets you can't fill in

## 1. Drag a widget that already exists into an empty cell

Today the page builder only supports dragging *new* elements from the left tray. A widget that already sits in a row cannot be picked up and moved — there is no drag source on it and the drop handler ignores anything that isn't a tray item.

What will change:

- Every widget on the canvas gets a small drag handle (appears on hover / when selected), so you can pick it up.
- You can drop it into any empty cell, into a cell that already has widgets (it lands where you hover), or between rows to make it its own row.
- The widget is *moved*, not copied: it disappears from its original cell.
- Dropping somewhere invalid snaps it back, exactly like today's rejected drops.
- After the move the widget stays selected so the settings panel keeps showing it.

## 2. Widgets you can't fill in (Quote Band, How We Work, and others)

Several widget types deliberately draw nothing when they are still empty — Quote Band, How We Work, Proof Band, Testimonials, FAQ, Logo Cloud, CTA Band and Image all hide themselves when their list of items or main text is blank. That is correct on the live site, but in the editor it means a freshly added widget is invisible, so there is nothing to click and no way to open its settings and fill it in.

What will change:

- First, reproduce in the editor by adding each of those widget types and confirming which ones vanish (the diagnosis above is from reading the code; it will be verified before the fix).
- In the editor only, an empty widget renders a clearly labelled dashed placeholder ("Quote Band — click to add content") that is selectable, so its settings open normally. The live site keeps hiding empty widgets.
- Additionally, the section list on the left will let you pick widgets inside a row, as a second way to reach anything invisible.
- Check the settings panel actually shows all fields for Quote Band and How We Work once selected, and fix any that are missing.

## Technical notes

- Drag/move: add a `source: "canvas"` drag payload (row id, column id, cell id, widget id) via `useDraggable` in `SelectableWrapper`/`WidgetNode`; extend `handleDragEnd` in `PageBuilderShell.tsx` with a canvas branch that removes the widget from its origin and re-inserts it via `addWidgetToCell` (with `insertIndex`) or `insertPrebuiltRow`-style row insertion for `before`/`end` drops. Add `moveWidget` to `BuilderContext` so click/keyboard paths share the logic. Guard against dropping a widget onto its own position.
- Empty-state placeholder: in `src/features/site/rows/WidgetNode.tsx`, when `renderWidget()` returns `null`, render the placeholder instead of `null` when inside the builder (builder context available) and keep returning `null` on the public site.
- Verification: Playwright pass over the page builder — add Quote Band and How We Work into a cell, select each, fill a field, and confirm it persists; then drag an existing widget into another cell and confirm both origin and target update. Typecheck with `tsgo`.
