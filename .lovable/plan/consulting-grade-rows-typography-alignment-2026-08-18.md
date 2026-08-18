# Consulting-grade rows + typography alignment

Four new row types, an outcome-led rework of the service cards, one shared body measure across every row, and the admin controls to drive it all.

## Where this fits today

You already have: Hero, Text, Services, Boxed Cards, Image + Text, Image, Profile, Grid, Lead Magnet, Testimonials, Logo Cloud, FAQ, Contact, CTA Button, Subscribe. Each one registers itself in the widget registry, so new rows drop into the Elements tray with no engine changes.

What's missing for a consulting page: a stat/proof band, a numbered process strip, a single-quote emphasis band, and a closing CTA band. The existing Testimonials row is a multi-item carousel — it is not the same thing as one big quote on a plum band, so both stay.

## New row types

**1. Proof Band** — sits directly under the hero. Three or four cells, each with a big number, a short label, and an optional caption. Switchable to logo mode, which reuses your Logo Cloud rendering so you can run stats now and client logos later. Hairline dividers between cells, no card chrome, so it reads as a quiet credibility strip rather than another block.

**2. Process Steps ("How we work")** — three or four numbered steps in a row on desktop, stacked on mobile. Understated numerals (01, 02, 03) in the accent gold, step title, one-line description. Optional connecting hairline.

**3. Quote Band** — one testimonial, large display type, client name and role underneath, optional avatar or logo. Defaults to the deep plum band tone and ships with the wave shape preset already selected on the top edge, so it lands looking like the reference without extra setup.

**4. CTA Band** — closing "never dead-end" band above the footer. Headline, one line of support copy, primary ink pill plus an arrow text link. Sticks to the two-button vocabulary.

All four use the shared row plumbing: `row-container` gutters, `py-row-fluid` spacing, `RowTitle`/`RowSubtitle`/`RowBody` typography, band tone, section shapes, and the standard Style tab.

## Outcome-led service cards

Each service card leads with the result. Structure becomes:

```text
OUTCOME HEADLINE   (largest text in the card)
one-line framing sentence
—————————————————————
WHAT YOU GET       (small caps label)
 · deliverable
 · deliverable      (collapsed by default, secondary weight)
Explore this service →
```

The deliverable list drops to a smaller, muted treatment behind the existing accordion. The card ends with an arrow text link to the dedicated service page instead of a second button.

Copy: your service headlines get rewritten in the database into outcome statements (for example "Comms people actually read" rather than "Internal Communications"), with the service name kept as the eyebrow so nobody loses the label. All of it stays editable in the admin.

## Arrow text links

One shared `.link-arrow` style: label, gold arrow that slides 4px on hover, underline on focus. It replaces every third-tier button across the site — service cards, proof band, CTA band, footer — so the button vocabulary stays at exactly two (ink pill, arrow link).

## Contact row + one body measure

The contact row currently caps its header at 900px while other rows use 1280px, and its form labels/inputs use one-off sizes that are smaller than the rest of the page. Fix:

- Contact header adopts the same container cap and `RowEyebrow`/`RowTitle`/`RowSubtitle`/`RowBody` sizes every other row uses.
- Form labels and inputs move onto the shared body scale instead of the hardcoded 9px/12px values.
- Success state uses the same measure rather than 520px.

Body measure: a single `.measure` utility set to a classic 65-character line (about 720-760px). Applied to `RowBody` and to the body copy in Text, Grid, Hero and Contact so long paragraphs wrap consistently at roughly two-thirds of the page instead of running edge to edge.

## How to add the box / wave in the admin (already built)

Select any row, open the **Style** tab, and in "Design & Background" you'll find:

- **Section band** — Mesh (default, page gradient shows through), Auto, White, Tint, Deep.
- **Shape — top edge** and **Shape — bottom edge** — None, Rounded, Wave, Arch, Angled, Taper, Notch, each with Subtle / Medium / Dramatic and a Flip toggle.

"Rounded" is the boxy card edge from your screenshot; "Wave" is the curve. Set the band to White or Deep first — shapes are invisible on a transparent mesh row, since there's no surface to cut.

## Admin improvements included

- A **Presets** entry point when adding a row: "Proof band", "How we work", "Quote band", "Closing CTA" insert a fully populated row instead of an empty one, so you're editing copy, not building structure.
- **Shape preview swatches** in the picker (small drawn thumbnails) instead of text-only buttons.
- Shape controls **auto-disable with a hint** when the row band is Mesh, explaining why nothing renders.
- Each new row's content editor keeps the same collapsed-advanced pattern already used elsewhere: content first, styling behind the Style tab.

## Technical notes

- New files: `ProofBandRow.tsx`, `ProcessStepsRow.tsx`, `QuoteBandRow.tsx`, `CtaBandRow.tsx` in `src/features/site/rows/`, each with an admin editor, plus four `registerWidget(...)` calls in `src/widgets/index.tsx` and content types in `src/types/rows.ts`.
- `.link-arrow` and `.measure` added to `src/index.css` alongside `.btn-ink`.
- `ServiceCard.tsx` restructured; service copy updated via a database content migration on the existing rows.
- `ContactRow.tsx` switched onto the shared typography components and container cap.
- Row presets registered in the defaults module so the Elements tray can seed them.
- Verification: multi-breakpoint screenshots (390 / 768 / 1280 / 1680) of the homepage plus a typecheck.

## Open item

The CTA band copy defaults to "Book a free consultation" with a "See how we work →" arrow link, pointing at your contact section. Change the wording any time in the row editor.
