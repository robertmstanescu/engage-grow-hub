# Lativ-crisp refinement + service pages

Three workstreams: finish the type/colour system properly, restyle buttons, and turn each service into its own real page.

## 1. Typography — remove Unbounded

- Drop Unbounded from the Google Fonts links in `index.html` and `src/index.css`, from the Tailwind `display` family, from the Brand settings font list, and from the default heading styles in `useBrandSettings`.
- Bricolage Grotesque becomes the single display face (headings, eyebrows, buttons); Inter stays for body.
- Any stored brand/CMS values still pointing at Unbounded get migrated to Bricolage Grotesque so saved content follows.
- Tighten the display scale: two heading sizes plus one body size, negative tracking on large headings, as in Lativ and Sequoia.

## 2. Colour — alternating bands, brand hues, crisp base

Structure borrowed from Lativ, restraint borrowed from South Pole / Sequoia.

- Base canvas: crisp off-white isabelline. No global gradient.
- Sections alternate: white band, soft brand-tinted band (very low-saturation violet or warm gold), white band, with one deep plum inverted band per page for contrast.
- Cards sit on the bands as cream/white enclosures with 1px hairline borders, large radius and a barely-there shadow. Card tints rotate within a set: cream, pale violet, pale gold, one deep plum inverted card.
- A `bandTone` control per row (`white` / `tint` / `deep`) replaces guesswork; unset rows auto-alternate.
- Every text colour is derived from the band it sits on, so nothing renders pale-on-pale again. Foreground on deep bands flips automatically.
- Remaining hardcoded colours in row components, widgets, footer, contact and admin get swept out; tokens only.

## 3. Buttons

- Primary: fully rounded ink pill, cream label, 200ms hover lift and slight darkening.
- Secondary: text link with an arrow and an underline that draws on hover (Sequoia-style).
- Tertiary/ghost: cream pill with hairline ink outline, used on deep bands.
- One shared button component/variant set so the CTA widget, contact submit, hero CTAs, service cards and navbar all match.

## 4. Service pages

Each service becomes a real published CMS page.

- New route pattern `/services/<slug>`, one page per service, generated from the existing service data (tag, title, subtitle, description, deliverables, price, timeline, note).
- Page template per service:
  - Hero band: eyebrow tag, title, subtitle, primary CTA.
  - Overview: intro paragraph.
  - Deliverables: listed as a clean grid, not a collapsed accordion.
  - Process strip: three numbered steps (pre-scaffolded, editable).
  - FAQ accordion (empty, ready to fill).
  - Price/timeline block plus closing contact CTA on a deep band.
- Everything is a normal builder page afterwards, fully editable, with its own SEO fields.
- "Our Services" boxes link to their service page, and each service card gets a "Learn more" arrow link next to the existing price CTA.
- A `/services` index page lists all service pages as cards.
- Navbar gains a "Services" dropdown listing the service pages, driven by the same navigation manager (mobile shows them nested under a Services group).

## Technical notes

- Font removal touches `index.html`, `src/index.css`, `tailwind.config.ts`, `src/features/admin/BrandSettings.tsx`, `src/hooks/useBrandSettings.ts`, plus a data migration on stored brand settings and page content.
- Band system lives in `src/index.css` as tokens (`--band-white`, `--band-tint`, `--band-deep` and matching foregrounds) with a `data-band` attribute on `RowSection`; `rowBackground.ts` resolves the alternation.
- Button variants added to the existing shadcn button `cva` config and reused by `CtaButtonFrontend`, `ServiceCard`, `ContactRow`, `HeroRow` and `Navbar`.
- Service pages are rows inserted into `cms_pages` via a one-off generation step plus an admin action to (re)generate a page from a service, so new services can get pages later.
- Navigation dropdown extends the existing nav item shape with optional children; `NavigationManager` gets a nested-item editor.
- No copy rewrites beyond what the service pages inherit from existing content.
