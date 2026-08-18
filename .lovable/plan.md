# Crisp pass: spacing, type scale, service pages, admin fixes

Continues the approved Lativ/South Pole/Sequoia redesign. No new visual direction — this closes the gaps.

## 1. Page gutters and white space

- One shared container: generous side gutters that grow with the viewport (24px mobile → 40px tablet → 64px desktop → 96px on wide screens), max content width ~1280px, centred. Every row type uses it, so nothing touches the edge again.
- Vertical rhythm gets a step up: section padding moves from the current flat 42px to a fluid 72–128px band, with a tighter variant for compact rows.
- Section headers get more room above and below, and the gap between a header block and its content grows.

## 2. Type scale reset

- Remove the remaining hardcoded `text-[11px]`-style sizes and rem-based fluid tokens; the scale is redefined in pixels only, one ladder from caption to display.
- Section headers step up roughly one level so they read as headlines, not labels; body copy lands at a comfortable 17–18px with looser line height.
- Titles stay fluid between a pixel min and max (no viewport-height terms, which is what made sizes jump between screens).

## 3. Contrast (level 3)

- Darker ink for body and headings on white/tint bands, stronger hairline borders, higher-contrast muted text, and clearer button borders. Applied through tokens so light and deep bands both shift.

## 4. Every row type matched to the redesign

Audit and align all rows — Hero, Text, Grid, Boxed, ImageText, Image, Service, Testimonial, FAQ, LogoCloud, Profile, LeadMagnet, Contact — to the same rules: shared gutters, band background, hairline-bordered cards with 24px radius, ink-pill / arrow-link buttons, uniform header block, no leftover gradients or per-row hex colours.

## 5. Service pages

- Real `/services/:slug` pages generated as editable CMS pages from the current service content (hero, body, deliverables, CTA).
- The two long service carousel rows are removed from the homepage; the existing "Our Services" boxes and the navbar link out to the new pages.
- Sitemap, canonical URLs and per-page meta included.

## 6. Admin fixes

- **Colour mismatches**: finish tokenising the admin — remaining hardcoded `hsl(...)` literals (Manage Team, Media, dashboard) replaced with tokens so nothing falls back to dark-on-dark.
- **Recent Edits**: show what changed, when and by whom — friendly entity name (page/post title, not `page_rows`), the editor's name/email from the revision author, absolute timestamp on hover, and a short summary of which fields changed.
- **Admin identity**: list admins by login email (resolved server-side, since the client cannot read auth users) with display name, instead of the truncated UUID.
- **Media lag**: the folder accordion currently re-renders the whole asset list and refetches on expand. Fix by memoising folder rows, virtualising the asset list, and loading thumbnails lazily.

## 7. Footer logo

Footer uses the emblem variant and never switches for the light theme — point it at the dark emblem for light bands (and keep the light one if a deep band footer is chosen).

## 8. Security review

Read-only pass plus fixes for anything found: RLS policies and GRANTs on every public table, the `draft_content` exposure path, edge-function auth and CORS, admin-only storage buckets, the admin-scoped MCP tools, sanitisation of admin-authored HTML/CSS, and a dependency vulnerability scan. Findings reported with severity; safe fixes applied, anything risky flagged first.

## Technical notes

- Container + spacing + type tokens live in `src/index.css` and `tailwind.config.ts`; rows consume them through `RowSection` and the `typography/` primitives.
- Service pages: rows migrated into `cms_pages` records with a `/services/` slug prefix, plus route wiring in `src/App.tsx` and sitemap generation.
- Admin identity and Recent Edits need an admin-only edge function to resolve auth emails; revisions already carry `created_by` and `entity_ref`.
