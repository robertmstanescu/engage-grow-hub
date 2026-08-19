# Rich text editor QA + Proof band colour controls

Two fixes: make the rich text toolbar behave predictably, and let you colour the proof point tiles.

## 1. Rich text editor QA

Confirmed in the code:

- The size dropdown applies a size by inserting `<font size="7">` and then swapping those tags for spans. Any `<font size="7">` that the swap misses is later mapped to **48px** by the shared font-size normaliser (`'7' -> '48px'`), which matches the "always goes to 48" symptom.
- The size `<select>` (and the font `<select>`) do not block mousedown, so the editor loses its selection when the dropdown is opened; the toolbar then acts on a stale saved range. Other editors in the project (e.g. the title-line editor) do prevent mousedown for exactly this reason.
- Every toolbar action, including bold/italic/underline, runs the font-size normaliser over the whole editor afterwards, so an unrelated command can rewrite sizes.

Work:

1. Reproduce first in a headless browser against the admin editor: select text, apply a size, apply italic, and log the resulting HTML so each fault is confirmed before changing behaviour.
2. Stop using the `<font size="7">` round-trip. Apply the chosen pixel size directly to the current selection (wrap the selection range in a span with `font-size`, merging with an existing span when the selection already sits in one) and keep the selection alive afterwards so the dropdown reflects the real size.
3. Prevent selection loss: block mousedown on the size and font dropdowns and restore the saved range before applying.
4. Only run the font-size normaliser after size changes, not after bold/italic/underline/strikethrough/colour, so those commands can no longer alter sizes.
5. Verify italic (and bold/underline) survive the save round-trip through sanitisation; if the sanitiser or normaliser strips the styling, fix that path.
6. Re-run the browser check afterwards and confirm: size applies exactly as chosen, repeated size changes stay correct, italic toggles on and off, and the toolbar state matches the caret.

## 2. Proof band colours

The proof point tiles currently inherit the row surface, border and foreground; there is no per-row control for them. Add to the Proof band editor:

- **Tile background** colour
- **Stat / value colour**
- **Label colour**

Each optional and empty by default, so existing rows keep inheriting the row's automatic light/dark contrast. Stored on the row content alongside the existing eyebrow/note colour fields, and applied in the proof band renderer with the inherited values as fallback.

## Technical notes

- Files: `src/features/admin/RichTextEditor.tsx`, `src/services/richTextFontSize.ts` (only if the normaliser needs a narrower scope), `src/features/admin/editors/NewRowEditors.tsx` (Proof band editor), `src/features/site/rows/ProofBandRow.tsx`, `src/types/rows.ts` (optional colour fields).
- No database migration needed: colours live in the existing row `content` JSON.
