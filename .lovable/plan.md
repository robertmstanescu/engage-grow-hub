# Lativ-crisp: remaining work

Audit of the two earlier plans against the codebase. Done already: Unbounded removed from the site fonts, band tokens (`--band-white` / `--band-tint` / `--band-deep`) with per-band foregrounds, the `bandTone` row control, the floating cream navbar island the page scrolls under, the button utilities (`btn-ink`, `btn-ghost-ink`, `btn-arrow`) plus matching Button variants, the CMS colour/gradient reset and the band sequence on the homepage.

Everything below is what is still open.

## 1. Gutters, white space and vertical rhythm

- One shared container used by every row: side gutters that grow with the viewport (24px mobile → 40px tablet → 64px desktop → 96px wide), max content width ~1280px, centred.
- Section padding moves from the flat 42px to a fluid 72–128px band, with a tighter variant for compact rows.
- More room above and below section headers, and a larger gap between the header block and its content.

## 2. Type scale reset (pixels only)

- Remove the remaining hardcoded `text-[11px]`-style classes and the rem/vh-based fluid tokens; one pixel ladder from caption to display.
- Titles stay fluid between a pixel min and max — no viewport-height terms, which is what made sizes jump between screens.
- Section headers step up about one level so they read as headlines; body copy lands at 17–18px with looser line height. Two heading sizes plus one body size, negative tracking on large headings.

## 3. Contrast (level 3)

Darker ink for headings and body on white/tint bands, stronger hairline borders, higher-contrast muted text and clearer button outlines — all through tokens, so deep bands shift with them.

## 4. All row types matched to the system

Audit and align Hero, Text, Grid, Boxed, ImageText, Image, Service, Testimonial, FAQ, LogoCloud, Profile, LeadMagnet and Contact: shared gutters, band background, hairline-bordered cards at a large radius with a barely-there shadow, ink-pill / arrow-link buttons, a uniform header block, and no leftover glass, blur, drop shadows or hardcoded hexes.

## 5. Buttons applied everywhere

The variants exist but most CTAs still use the old default. Sweep the CTA widget, contact submit, hero CTAs, service cards and navbar onto the shared ink / arrow / ghost set.

## 6. Services as a first-class entity

- New `services` table (slug, title, tag, summary, description, deliverables, process steps, FAQ, price, timeline, note, icon, order, status) with RLS: public read of published rows, admin full access, explicit grants.
- A **Services** section in the admin: list, plain-language create/edit form, drag to reorder, draft/publish, plus SEO fields (meta title, description, OG image, AI summary).
- Saving a service keeps three surfaces in sync: its page at `/services/<slug>`, its card in the homepage "Our Services" row, and the `/services` index.
- Service page layout, editable afterwards: hero band (tag, title, summary, CTA) → overview → deliverables grid (not an accordion) → numbered process strip on a tinted band → proof stat or quote → FAQ → price/timeline and closing CTA on deep plum.
- The two long service carousel rows come off the homepage; the existing Our Services boxes and the navbar link out instead.
- Navbar gains a Services dropdown of published services; mobile nests them under a Services group.

## 7. New row types

Added to the builder with band support: **stat band + proof logo strip**, **numbered process / stepper**, **editorial 60/40 split + pull-quote**, and **case study cards + closing CTA band**.

## 8. SEO wiring for services

- `ssr-index` gains `/services` and `/services/:slug` so crawlers get per-service head tags.
- `generate-sitemap` queries published services; static `public/sitemap.xml` gets `/services/`.
- `Service` + `BreadcrumbList` JSON-LD per page, `ItemList` on the index; self-referencing non-www canonicals with trailing slash.
- Services added to `llms-txt` and the noscript fallback. One H1 per page, alt text enforced on new image rows. SEO review run afterwards.

## 9. Admin fixes

- **Colours**: finish tokenising — remaining hardcoded `hsl(...)` and hex literals in Manage Team, Media and the dashboard, so nothing falls back to dark-on-dark.
- **Recent Edits**: friendly entity name (page/post title, not `page_rows`), who made the change, relative time with an absolute timestamp on hover, and a short summary of which fields changed.
- **Admin identity**: list admins by login email (resolved server-side) with display name, instead of the truncated UUID.
- **Media lag**: the folder accordion re-renders and refetches the whole asset list on expand — memoise folder rows, virtualise the list, lazy-load thumbnails.
- **Restyle + IA**: shared field components on the new tokens; three-pane shell (page/row tree, canvas, inspector) with a top command bar; each row inspector split into **Content** (visible) and **Advanced** (collapsed colours, spacing, custom classes); plain-language labels; sections regrouped as Content (Pages, Blog, Services, Media), Audience (Contacts, Leads, Campaigns), Settings (Brand, Navigation, SEO, Team).
- Email templates still hardcode Unbounded and brand hexes — migrate them to the brand fonts/tokens.

## 10. Footer logo

The footer always renders the emblem meant for dark backgrounds. Pick the dark emblem on light bands, the light one if the footer sits on a deep band.

## 11. Responsive verification

Fluid clamps mean no per-breakpoint hardcoding, but grids collapse (3 → 2 → 1), the 60/40 split stacks, hero CTAs go full-width on mobile, and the mobile menu opens as a sheet with Services nested. Verification pass with screenshots at 390, 768, 1024 and 1440px on the homepage, a service page and the admin.

## 12. Security review

RLS policies and GRANTs on every public table (including the new `services`), the `draft_content` exposure path, edge-function auth and CORS, admin-only storage buckets, the admin-scoped MCP tools, sanitisation of admin-authored HTML/CSS, and a dependency scan. Findings reported with severity; safe fixes applied, risky ones flagged first.

## Technical notes

- Container, spacing and type tokens live in `src/index.css` and `tailwind.config.ts`; rows consume them via `RowSection` and the `typography/` primitives.
- New row types are registered in `src/types/rows.ts`, the renderer registry and the elements tray, each with an inspector editor.
- Nav dropdown extends the nav item shape with optional children; `NavigationManager` gets a nested-item editor.
- Admin identity and Recent Edits need an admin-only edge function to resolve auth emails; `page_revisions` already carries `created_by` and `entity_ref`.
- No copy rewrites beyond what the service pages inherit from existing content.
