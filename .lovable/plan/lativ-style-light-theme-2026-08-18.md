# Lativ-style light theme

Turn the site light and airy in the Lativ mould — soft gradient canvas, pill navigation, oversized centred headlines, generously rounded cards — while keeping the existing brand colours (violet, plum, gold, isabelline) and the Unbounded / Bricolage Grotesque / Inter type stack.

## Visual direction

- Canvas: soft light gradient built from the brand hues — isabelline base washing into muted violet and warm gold tints, instead of the near-black purple.
- Ink: deep violet/plum for headings and body text on light surfaces; gold reserved for accents, tags and small emphasis (never as body text on light).
- Cards: solid tinted surfaces (white, pale violet, pale gold, and one deep plum "inverted" card for contrast), 1px soft borders, large radius (~24px), soft low-contrast shadows.
- Rhythm: wide max-width container, uniform gap-6 / gap-8 grids, calm 42px row padding kept as-is.

## Token work

Rebuild the light values of the existing variables in `src/index.css` — same variable names, new values, so every component follows automatically:

- Core: `--background`, `--foreground`, `--card`, `--muted`, `--border`, `--input`, `--popover`, `--secondary`.
- Section groups already defined: `--pillar-*`, `--vows-*`, `--contact-*`, `--light-bg` / `--light-fg`.
- Sidebar group `--sidebar-*` for the admin shell.
- New gradient/shadow tokens: `--gradient-canvas`, `--gradient-card`, `--shadow-soft`, `--shadow-card`, plus a larger `--radius`.
- Keep HSL channel format. Keep font variables untouched.

## Layout work (public site)

- Navbar: Lativ-style rounded pill bar — light translucent surface, soft border and shadow, compact links, dark pill CTA on the right. Existing left-rail behaviour on desktop is replaced by the pill; mobile hamburger logic stays.
- Hero: full-width soft gradient band, centred stacked block (eyebrow, oversized headline, short sub, CTA row), crisp spacing, no dark overlays. Existing fluid-size logic and load cascade preserved.
- Service cards / Boxed / Grid rows: light card enclosures with the new radius, borders and shadows; alternate one accent-tinted card per row for the Lativ colour rhythm; icon block above title.
- Logo cloud, testimonials, FAQ, image/text, profile rows: same card treatment and gaps so the whole page reads as one system.
- Contact row and footer: light surfaces, bordered inputs, dark pill submit button; footer keeps the 8px bottom legal line.

## Admin

Apply the same light tokens to the page-builder shell: sidebar, panels, inputs, tabs and canvas chrome. Behaviour (deferred saving, preview in new tab, collapsible sections) unchanged.

## Notes

- Rows whose background colour was set manually in the CMS may still render dark. I'll add a light-theme fallback so unset rows follow the new canvas, and flag any row that needs a manual colour change after the switch.
- No copy changes, no font-family changes, no CMS schema changes.
