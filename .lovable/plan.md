# Lativ-crisp refinement + service pages

Three workstreams: finish the type/colour system properly, restyle buttons, and turn each service into its own real page.

## 1. Typography — remove Unbounded

- Drop Unbounded from the Google Fonts links in `index.html` and `src/index.css`, from the Tailwind `display` family, from the Brand settings font list, and from the default heading styles in `useBrandSettings`.
- Bricolage Grotesque becomes the single display face (headings, eyebrows, buttons); Inter stays for body.
- Any stored brand/CMS values still pointing at Unbounded get migrated to Bricolage Grotesque so saved content follows.
- Tighten the display scale: two heading sizes plus one body size, negative tracking on large headings, as in Lativ and Sequoia.

## 2. Reset all custom styling

Everything hand-tuned over time gets wiped so the new system is the only source of truth.

- Custom mesh and multi-stop gradients saved on rows in the CMS are cleared; rows fall back to the new band system.
- Per-row colour overrides (section bg, card bg, title, subtitle, description, deliverables, meta, CTA, dots, note, divider colours) are cleared unless deliberately re-set afterwards.
- Leftover per-row padding, snapping flags, overlay settings and custom classes reset to the new global defaults.
- Hardcoded hexes and rgb values still living in components are removed; tokens only.
- Old glass/blur washes, drop shadows and animation leftovers go, replaced by the single hairline + soft shadow treatment.
- A revision snapshot is taken before the reset so nothing is irrecoverable.

## 3. Colour — alternating bands, brand hues, crisp base


Structure borrowed from Lativ, restraint borrowed from South Pole / Sequoia.

- Base canvas: crisp off-white isabelline. No global gradient.
- Sections alternate: white band, soft brand-tinted band (very low-saturation violet or warm gold), white band, with one deep plum inverted band per page for contrast.
- Cards sit on the bands as cream/white enclosures with 1px hairline borders, large radius and a barely-there shadow. Card tints rotate within a set: cream, pale violet, pale gold, one deep plum inverted card.
- A `bandTone` control per row (`white` / `tint` / `deep`) replaces guesswork; unset rows auto-alternate.
- Every text colour is derived from the band it sits on, so nothing renders pale-on-pale again. Foreground on deep bands flips automatically.
- Remaining hardcoded colours in row components, widgets, footer, contact and admin get swept out; tokens only.

## 4. Buttons

- Primary: fully rounded ink pill, cream label, 200ms hover lift and slight darkening.
- Secondary: text link with an arrow and an underline that draws on hover (Sequoia-style).
- Tertiary/ghost: cream pill with hairline ink outline, used on deep bands.
- One shared button component/variant set so the CTA widget, contact submit, hero CTAs, service cards and navbar all match.

## 5. Services as a first-class entity

Services stop being loose row content and become their own thing in the admin.

- New `services` table: slug, title, eyebrow/tag, summary, description, deliverables, process steps, FAQ, price, timeline, note, icon, order, status.
- A **Services** section in the admin: list view, create/edit form with plain-language fields, drag to reorder, draft/publish.
- Saving a service keeps three things in sync automatically: its own page at `/services/<slug>`, its card on the homepage "Our Services" row, and its entry in the `/services` index.
- Service page layout, generated from the entity and then editable per page for anything extra:
  - Hero band: eyebrow tag, title, summary, primary CTA.
  - Overview: intro copy on white.
  - Deliverables: clean grid, not a collapsed accordion.
  - Numbered process strip on a tinted band.
  - Proof: stat band or quote.
  - FAQ accordion.
  - Price/timeline plus closing CTA band on deep plum.
- Each service page gets its own SEO fields and appears in the sitemap.
- Homepage service cards and the card CTA link straight to the page ("Learn more" arrow link beside the price CTA).
- Navbar gains a **Services** dropdown listing published services; mobile nests them under a Services group.

## 6. New row types (Sequoia / South Pole patterns)

All four added to the builder with light/tint/deep band support:

- **Stat band + proof logos** — three or four oversized numbers with short captions on a deep band, plus a hairline client/partner logo strip. Both reference sites lead with credibility before copy.
- **Numbered process / stepper** — 3-5 steps, big muted numerals, short titles and one line each; horizontal on desktop, stacked on mobile.
- **Editorial split + pull-quote** — asymmetric 60/40 image-and-text with generous whitespace, and a large pull-quote row with name/role attribution (the Lativ testimonial band, done crisply).
- **Case study cards + CTA band** — case/insight cards with tag, title and arrow link, plus a full-width closing CTA band on deep plum.

Other things worth borrowing from those sites, applied throughout: one action per section, arrow-link affordances instead of extra buttons, hairline rules as the main separator, generous vertical rhythm, and a strict two-heading type scale.

## 7. Admin: full restyle + information architecture rework

- **Visual**: the same off-white canvas, ink text, hairline borders, large-radius panels and new button variants as the site. Every input, select, tab and modal uses shared field components — no more one-off hexes or mismatched controls.
- **Shell**: three panes — slim left page/row tree, wide canvas, right inspector — with a top command bar carrying page title, save state, preview and publish.
- **Inspector IA**: each row splits into **Content** (visible: text, images, links) and **Advanced** (collapsed: colours, gradients, spacing, custom classes). Rows inherit brand and band defaults, so the standard flow is type-and-save.
- **Language**: plain-language labels replace technical field names; helper text where a control is non-obvious.
- **Navigation**: admin sections regrouped as Content (Pages, Blog, Services, Media), Audience (Contacts, Leads, Campaigns), and Settings (Brand, Navigation, SEO, Team).


## 7. SEO for the new pages

The site already has the right machinery: a crawler-facing `ssr-index` edge function that injects title, description, canonical, OG/Twitter and JSON-LD per route, a dynamic `generate-sitemap` function reading published `cms_pages` and `blog_posts`, an `llms-txt` function, and the `usePageMeta` hook for browsers. Right now none of it knows about `/services`, so the new pages have to be wired into each piece:

- **Crawler head**: `ssr-index` currently dispatches on `/`, `/blog/:slug` and `/p/:slug`. Add `/services` and `/services/:slug`, reading meta from the `services` table, so bots and social scrapers see per-service titles, descriptions and OG tags rather than the neutral template.
- **Sitemap**: `generate-sitemap` gains a third query over published services, so a new service appears in the sitemap the moment it is published. The static `public/sitemap.xml` stays as the fallback and gets `/services/` added.
- **Structured data**: each service page emits `Service` plus `BreadcrumbList` JSON-LD; the index page emits an `ItemList`. Organization stays sitewide.
- **Canonicals**: `/services/<slug>/` self-referencing, non-www, trailing slash — same rule as the rest of the site.
- **Editable SEO fields**: the service form includes meta title, meta description, OG image and an AI summary field, matching what pages and posts already have, with character counters and a preview.
- **AI discovery**: services are added to the `llms-txt` output and to the noscript crawler fallback.
- **Content-side wins from the redesign**: one H1 per page, real heading hierarchy in the new row types, alt text enforced on the stat/logo/case-study images, and internal links from the homepage cards to each service page — which is what actually helps these pages rank.

After the build I'll run an SEO review so anything the scanner still flags gets picked up.

## Technical notes


- Font removal touches `index.html`, `src/index.css`, `tailwind.config.ts`, `src/features/admin/BrandSettings.tsx`, `src/hooks/useBrandSettings.ts`, plus a data migration on stored brand settings and page content.
- Band system lives in `src/index.css` as tokens (`--band-white`, `--band-tint`, `--band-deep` and matching foregrounds) with a `data-band` attribute on `RowSection`; `rowBackground.ts` resolves the alternation.
- Button variants added to the existing shadcn button `cva` config and reused by `CtaButtonFrontend`, `ServiceCard`, `ContactRow`, `HeroRow` and `Navbar`.
- `services` table gets RLS: public read of published rows, full access for admins via `is_admin()`, plus explicit grants.
- Service pages render through a dedicated route/template that reads the service entity, with optional extra builder rows stored alongside; the `/services` index and sitemap read the same table.
- New row types are added to `src/types/rows.ts`, the renderer registry, and the elements tray, each with a matching inspector editor.
- Navigation dropdown extends the nav item shape with optional children; `NavigationManager` gets a nested-item editor.
- No copy rewrites beyond what the service pages inherit from existing content.

