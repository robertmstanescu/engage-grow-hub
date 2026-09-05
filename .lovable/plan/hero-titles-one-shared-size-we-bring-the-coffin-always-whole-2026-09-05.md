# Hero titles: one shared size, "We bring the coffin." always whole

## What you'll see

- Every line of a hero headline is rendered at exactly the same size — no more one line looking shrunk while the other stays big.
- The size is chosen so the key short line ("We bring the coffin.", "Vampire Slayer") always fits on one line with comfortable side breathing room, at any screen width including phones.
- Longer sentences are still free to fall onto a second line naturally when they approach the edge — nothing is hard-coded, so you can keep editing the wording in the admin.
- Same behaviour everywhere a hero is used: home page, About Us, and each service page.

## How it works

1. **One size for the whole headline.** Measure every line off-screen at the natural size, then pick a single scale factor and apply it to the whole heading. No per-line font sizes anywhere.
2. **The scale is decided by the shortest-that-must-stay-whole rule.** Lines that can fit within the available width (minus a fixed safety padding) drive the scale; a line that is far too long to ever fit is excluded from the calculation and is allowed to wrap instead of dragging the whole headline down.
3. **Wrapping becomes per line, not per heading.** Today one over-long line switches the entire heading to wrapping mode, which is what lets "We bring the coffin." break. Each line gets its own wrap setting: lines that fit stay unbroken, only the genuinely over-long one wraps.
4. **Consistent side padding baked into the fit.** The measurement subtracts a fixed horizontal breathing gap (instead of the current 4px sub-pixel guard) so the chosen size always leaves visible margin on both sides.
5. **Phones use the same rule.** The mobile legibility floor that currently stops shrinking at 85% is lowered so the fit rule can still hold the key line whole on narrow screens, rather than switching to wrapping.

## Technical notes

- All changes are in `useFitTitleLines` in `src/features/site/HeroSection.tsx`; the existing anti-flicker design (off-DOM probe, parent-width ResizeObserver, hysteresis) stays intact.
- `--fs-hero-title` in `src/index.css` keeps its current clamp; the fit hook does the adapting.
- No database/content changes — hero `title_lines` stay as the two sentence entries currently stored.
- Verification with a browser pass at 1600 / 1280 / 1114 / 768 / 390 px on `/`, `/about-us/`, and one service page: confirm all lines share one computed font size, the key line is unbroken, and there is no horizontal overflow.
