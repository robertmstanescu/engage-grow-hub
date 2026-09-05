# Fix the flickering, uneven hero headline

## What's wrong today

The hero headline does not use one font size. A script measures every headline line separately and shrinks only the lines it thinks are too wide, so lines end up at different sizes. Because the measuring happens inside the headline itself and is re-triggered by a size watcher on that same headline, it can measure → shrink → re-measure in a loop, which is the flickering and jumping seen on the homepage and About us.

There is also no rule keeping "We bring the coffin." on a single line, so it can break in two.

## What it will look like after

- All headline lines are exactly the same size, on every page that uses a hero.
- The size grows and shrinks smoothly with the browser window (no jumping, no flicker).
- Each sentence stays on its own line; "We bring the coffin." is never split.
- No visible change to colours, spacing, animation or hero height.

## How it will be done

1. Remove the per-line shrinking logic in `src/features/site/HeroSection.tsx` (`useFitTitleLines`) entirely — it is the source of both the uneven sizes and the loop.
2. Replace it with a single shared size for the whole headline:
   - Each line renders with no wrapping allowed.
   - One measurement pass measures all lines in a hidden probe attached to `document.body` (not inside the `<h1>`), so measuring can never re-trigger the watcher that caused the loop.
   - The widest line decides one scale factor, applied once to the `<h1>` as a CSS variable, so every line shares one size.
   - The scale is rounded and only re-applied when it changes by a meaningful amount (hysteresis), and it recomputes on window resize and after webfonts load — not on the headline's own size changes.
   - A floor (about 65% of the fluid size) prevents an unreasonably small headline; below that a line may wrap as a last resort.
3. Restore the fluid base size in `src/index.css` (`--fs-hero-title`) to a clamp that fills wide screens, since the new scaling handles overflow instead of a hand-tuned pixel cap.
4. Verify in a real browser at 1600px, 1280px, 1075px and mobile widths on `/` and `/about-us`: three lines on the homepage, equal sizes, "We bring the coffin." intact, and no repeated re-layout (checked by watching for size changes settling within one frame).

## Technical notes

- Files: `src/features/site/HeroSection.tsx`, `src/index.css`. `HeroRow.tsx` reuses `HeroView`, so CMS hero rows inherit the fix automatically.
- No content/database changes; the current two-sentence `title_lines` stay as they are.
