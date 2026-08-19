# Fix: image rows, dark-row text contrast, profile layout

## 1. Image rows can't bleed or take a background

Image blocks (the two "Image Break" rows on /about-us) are the only block type that renders as a bare `<figure>` — they skip the shared section wrapper every other row uses. That's why they ignore row background, edge shapes and height, and why their corners are just a hardcoded soft rounding on the picture itself.

Fix: render image blocks through the same section wrapper as all other rows, and drop the hardcoded corner rounding from the picture. Result: an image row gets the Style tab's background colour, height and top/bottom edge shapes, and its shapes spill over the neighbouring rows like every other row.

## 2. Text doesn't flip on dark row backgrounds

"Why the Coffin?" is a Process Steps row. Its step number, step title, description and divider lines are wired to fixed light-theme colours, so on the deep plum row they stay dark-on-dark. The same fixed-colour pattern exists in Proof band, FAQ, Testimonials, Contact and parts of Profile / Image+Text / Grid.

Fix: rows already publish a resolved foreground for their background (`--row-fg`). Add a matching muted + hairline-border variant and switch every fixed `foreground` / `muted-foreground` / `border` usage in the public row components over to it. Any row placed on a dark colour then flips its whole text set automatically — no per-row colour picking needed. Explicit colours chosen in the admin still win.

## 3. Profile row (the image + text block)

- Columns are top-aligned, so the portrait doesn't sit centred against the text; switch the split to vertically centred.
- Body copy uses a fixed dark colour and is auto-shrunk; move it onto the row foreground token and raise its size to the standard body scale so it reads at the same weight as other rows.
- The row also forces an opaque page-background colour behind itself, which fights the "one page mesh, plain row colours" rule — remove it so a Profile row is transparent unless a colour is set.

## Technical notes

- `src/features/site/rows/ImageRow.tsx`: wrap output in `RowSection` (pass `row`), remove `rounded-md`.
- `src/index.css` / `RowSection.tsx`: expose `--row-fg-muted` and `--row-border` derived from `--row-fg` via `color-mix`; add small utilities (`.row-fg`, `.row-fg-muted`, `.row-border`) to replace `text-foreground` / `text-muted-foreground` / `border-border` inside rows.
- Update `ProcessStepsRow`, `ProofBandRow`, `FaqRow`, `TestimonialRow`, `ContactRow`, `GridRow`, `ImageTextRow`, `ProfileRow` to the new utilities/tokens.
- `ProfileRow.tsx`: `items-start` → `items-center`, body `fontSize: var(--fs-body)` without the auto-fit shrink, colour `var(--row-fg…)`, drop `defaultBg`.
