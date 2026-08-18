# Contact row typography harmonisation

## Goal
Make every text element in the contact row feel like it belongs to the same typographic system as the service cards and boxed rows, rather than using its own smaller/fixed scale.

## What will change

### 1. Unify the contact form card text with card-scale tokens
- **Labels**: Replace the one-off `text-[11px] uppercase tracking-[0.18em]` class with the same compact label scale used for service-card tags and deliverable headers (`clamp(10px, 0.3vh + 0.55vw, 12px)`), keeping uppercase tracking.
- **Inputs/textarea**: Replace fixed `text-sm` with the card body scale (`clamp(13px, 0.4vh + 0.7vw, 15px)`), using `font-body` and `leading-relaxed`.
- **Checkbox label + note**: Align with the service-card description / boxed-card body (`text-sm` fluid or `clamp(12px, 0.35vh + 0.6vw, 14px)`), not the current smaller `text-xs`.
- **Button**: Keep `btn-ink` but ensure the label inherits the new `--btn-ink-fg` white token and uses the same display/body font stack as other primary CTAs.

### 2. Clean up leftover hardcoded colour overrides
- Remove the `CREAM = "hsl(var(--foreground))"` variable and inline `style={{ color: CREAM }}` hacks on labels/inputs.
- Let labels and inputs inherit `--row-fg` (published by `RowSection`) or use `text-foreground` / `text-muted-foreground` tokens.
- Replace inline focus border colour strings with the `ring` / `focus-visible` tokens.

### 3. Verify the heading block is consistent
- The eyebrow, title, subtitle, and body already use `RowEyebrow`, `RowTitle`, `RowSubtitle`, and `RowBody`. Confirm their `color` props are not overriding the row foreground unnecessarily.
- Remove the hardcoded `text-left` on the heading wrapper so it respects the row alignment prop (left/center/right) like other rows.

### 4. Optional spacing polish
- Tighten the gap between the header block and the form card to `mb-rhythm-base` (matches other rows).
- Increase form card padding slightly (`p-8 md:p-10`) so the larger type does not feel cramped.

## Files to edit
- `src/features/site/rows/ContactRow.tsx` — typography classes, colour overrides, alignment fix.
- `src/index.css` — add shared utility classes for the card-scale label/body sizes if they do not already exist (e.g., `.text-card-label`, `.text-card-body`).

## Out of scope
- No changes to form behaviour, validation, or the submit edge function.
- No changes to the contact row layout grid (two-column form stays).
- No new admin controls.
