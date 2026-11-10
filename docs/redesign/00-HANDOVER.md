# The Magic Coffin: design rebrand handover (design only)

Owner: Robert-Marian Stănescu · Project: themagiccoffin.com (this Lovable project, repo engage-grow-hub) · 10 Nov 2026

## 0. Read this first: the four rules of this job

1. **Design only. The live copy stays.** Every word on the site today stays exactly as it is in the database (`cms_pages.page_rows`, `site_content`, `blog_posts`, FAQ items, service tiers, footer, navbar labels). The screenshots and HTML artboards attached contain *proposed* copy. Treat all text in them as placeholder. Never copy text from an artboard into a page, a seed, a migration or a default that ships to the live site. Never run an UPDATE on existing content.
2. **Frontend and backend must match.** Every visual option in this spec is a field in a row/widget `zod/mini` schema, editable in the admin, read by the renderer, and covered by a default. Nothing is hard-coded into a page component. If the page reads a field, the admin can edit it; if the admin can edit it, the page reads it. Add a test that enforces this for each new or touched row type (schema keys == editor keys == renderer reads).
3. **Follow ARCHITECTURE.md and the project knowledge.** Row pipeline, `registerWidget`, lazy editors, eight-field diet, `blockFamilies`, `sectionLibrary`, image rules, public-bundle rules, `npm run check`, visual baselines. This spec adds to those rules and never overrides them.
4. **Plan first, then one phase per change.** Reply to this message with a plan (plan mode). After Robert approves, build phase by phase (section 9). Each phase ends with `npm run check` passing and a short note of what changed in the admin and on the site.

For anything this spec does not state, the artboard file is the answer: match it. Where this spec and the attached reference docs disagree, this spec wins. The reference docs (01, 02) were written before Robert decided the copy stays: ignore anything in them about applying a copy deck, seeding work items or changing text.

## 1. What is in the handover folder (`docs/redesign/` in the repo)

The design canvas ("Magic Coffin redesign examples") is the source of truth. Its whole content is in this folder: open `artboards/index.html` to click through every artboard in a browser (serve the folder, e.g. `npx serve docs/redesign/artboards`).

| Path | What it is | Use it for |
| --- | --- | --- |
| `00-HANDOVER.md` | This spec | Rules, tokens, components, backend, user stories, build order |
| `03-appendix-section-layouts.md` | Every artboard broken into its sections, in order, with the exact inline layout styles | Reproducing each section's grid, padding, radius, background |
| `artboards/*.dc.html` | The design source of every artboard, with all styles inline, plus `img/` (every photo, logo and mark used) and `ds/` | The exact spec: sizes, radii, shadows, gradients, the world-map SVG paths and animation CSS, the mesh shader, hover and filter behaviour |
| `shots/*-1440.jpg` | Full-page renders of every artboard at 1440px | What it must look like. Text is placeholder |
| `shots/*-390.jpg` | Phone renders of Home, Work, Case study, a service page | Mobile behaviour |
| `tokens/*.css` | The Magic Coffin design system tokens (deck layer and `web.css`) | Colour names and the web surface rules (use `web.css` and section 2, never the deck's 4px radius) |
| `01-cms-drives-the-design.md` | How each design element maps to the CMS, plus the wiring faults found in the code | Backend mapping, faults to fix first |
| `02-cms-build-spec.md` | Earlier build spec (world map row, work items) | Detail for the world map and Work |

Images in the artboards are design stand-ins. On the site, every image comes from the media library through the row's own image field; Robert chooses them in the admin. Upload the logos and marks (`img/emblem-*.png`, `img/lockup-*.png`, `img/hand-underline.svg`, `img/hand-arrow.svg`, `img/grain.svg`) to the media library or `public/` only if the site does not already have them.

Artboard file → live page: `Main` → `/` · `Services` → `/services` · `About` → `/about-us` · `Work` → `/work` (new) · `CaseStudy` → `/work/:slug` (new) · `Blog` → `/blog` · `BlogPost` → `/blog/:slug` · `Privacy` → `/privacy-policy` · `ServiceIC/EX/Ops/HRBP/Pay/Mgr` → `/services/internal-communications`, `/services/employee-experience`, `/services/people-operations`, `/services/fractional-hrbp`, `/services/pay-transparency`, `/services/manager-enablement`. The draft page `pay-transparency-check` takes the same look; leave its status alone · `NavStates` → navbar · `AdminWork`, `AdminWorkEdit`, `AdminProof`, `AdminTeaser` → new admin screens.

Artboards: Homepage · Services index · About · Work index · Case study · Blog index · Blog post · Privacy · six service pages (IC, EX, Ops, HRBP, Pay, Mgr) · Navbar states · Admin: Work items list, Work item editor, Proof points, Work teaser panel.

## 2. Design tokens (web surface)

Put these in ONE token layer: CSS variables in `src/index.css`, mirrored in `tailwind.config.ts` (`colors`, `borderRadius`, `boxShadow`, `fontFamily`), and written at runtime by `applyBrandCSSVars` from `site_content.brand_settings` where the admin may change them. Tailwind classes and `RowSection` read the variables, never a hex. Keep a `tokens.json` (W3C Design Tokens format) generated from the same values. Add a unit test that checks every text/ground pair below against WCAG AA.

### 2.1 Colour

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#FAF8F5` | Page ground under the mesh |
| `--ink` | `#26142E` | Strong text, body on cards |
| `--heading` | `#481C5F` | Every H1–H3 on light |
| `--body` | `#5C4965` | Default body text, nav links |
| `--meta` | `#8A7A92` | Captions, meta, dates |
| `--link` | `#672786` | Links; hover `--heading` |
| `--gold-text` | `#815E18` | Eyebrows/labels on light (only gold allowed as text on light) |
| `--gold` | `#E6C24C` | Fills, underline strokes, focus ring. Never text on light |
| `--gold-decor` | `#E5C54F` | Map "comms" fill, decorative marks |
| `--deep` | `#2A0E33` | Deep plum bands, primary pill button, nav CTA |
| `--deep-fg` | `#FBF7EC` | Text on `--deep` |
| `--violet` | `#4D1B5E` | Brand violet, map "comms and HR" fill |
| `--line-1` | `#E5D7EA` | Hairlines, footer rules |
| `--line-2` | `#DED3E4` | Card and nav borders |
| `--line-3` | `#D6C9DC` | Strong borders, inputs |
| `--tint` | `#F6F2F7` | Faint violet fills |
| `--glass` | `rgba(255,255,255,0.74)` + `backdrop-filter: blur(10px)` | Glass cards on the mesh |
| `--glass-border` | `rgba(214,201,220,0.9)` | Glass card border |

Six pillar colours (extend `src/lib/constants/pillarColors.ts` from four to six; it stays the only place they live):

| Pillar key | Name | Hex |
| --- | --- | --- |
| `ic` | Internal Communications | `#43143B` |
| `ex` | Employee Experience | `#002B67` |
| `ops` | People Operations | `#6A010E` |
| `hrbp` | Fractional HRBP | `#003728` |
| `pay` | Pay Transparency | `#883500` |
| `mgr` | Manager Enablement | `#201A53` |

Page mesh (moving background, keep the existing liquid-silk WebGL mesh): default colours `#EBD3F0, #FAECC0, #E8D6F2, #F6E9C4`, drift `#F4D3E9, #D5EFE4, #D9E3F7, #F8DCCF`, strength 55, grain overlay at 0.32 opacity. Service pages tint the mesh toward their pillar (values in each service artboard's `<canvas data-colors>`). These stay editable per page on the hero's Page background panel, as today.

### 2.2 Type

| Role | Family / weight | Size | Line height / tracking |
| --- | --- | --- | --- |
| Hero H1 | Bricolage Grotesque 800 | `clamp(44px, 5.6vw, 84px)` (home up to `clamp(56px, 7.4vw, 124px)`) | 0.98, -0.02em |
| Section H2 | Bricolage Grotesque 800 | `clamp(32px, 3.6vw, 52px)` | 1.05, -0.01em |
| Card H3 | Bricolage Grotesque 700 | 22–26px | 1.15 |
| Big number | Bricolage Grotesque 800 | `clamp(36px, 4.4vw, 64px)` | 1 |
| Lead | Inter 400 | 19–21px | 1.6 |
| Body | Inter 400 | 16–17px | 1.7–1.8 |
| Small / UI | Inter 500–600 | 13–15px | 1.5 |
| Eyebrow | Inter 700, uppercase | 11–12px | tracking 0.28–0.32em, colour `--gold-text` |
| Handwritten note | Architects Daughter 400 | 18–22px | 1.2, colour `--link` |

Map these onto the existing `--fs-*` tokens (never `vh`, never script-shrunk copy, `.measure` stays 54ch). Fonts: keep the self-hosted families already in the repo.

### 2.3 Shape, depth, space

| Token | Value | Use |
| --- | --- | --- |
| `--radius-card` | 24px (1.5rem) | Cards, panels, image frames, glass boxes |
| `--radius-inner` | 14px | Images and tiles inside cards |
| `--radius-island` | 2.1rem | Floating navbar |
| `--radius-pill` | 999px | Buttons, tags, chips, filter pills |
| `--shadow-soft` | `0 1px 2px rgba(38,20,46,.04), 0 8px 24px -12px rgba(38,20,46,.12)` | Navbar, small cards |
| `--shadow-card` | `0 1px 2px rgba(38,20,46,.05), 0 18px 40px -24px rgba(38,20,46,.25)` | Cards and panels |
| Page gutter | `clamp(16px, 5vw, 96px)` | Left/right padding of every section |
| Section padding | `clamp(56px, 7vw, 112px)` top, `clamp(80px, 9vw, 140px)` bottom on the last block | Vertical rhythm |
| Container | 1280px max; reading column 760–820px | |
| Card gap | 24–28px | Grids |

Buttons: two pills and one arrow link, nothing else. Primary pill: `--deep` ground, `--deep-fg` text, 44px high, 24px side padding, 15px/600. Ghost pill: transparent with `--line-3` border, `--heading` text. Arrow link: `--link` text with "→", underline on hover. Focus: `outline 2px solid --gold; offset 2px` on every interactive element.

## 3. Components and variants (each one a schema-driven option)

| Component | Variants | Schema fields (new unless noted) | Notes |
| --- | --- | --- | --- |
| Row look (exists) | Plain, Card, Band, Cover + new **Glass** | `layout.look` | Glass = `--glass` card on the mesh; Band deep = `--deep` |
| Hero (exists) | Centred (today), **Half-bleed photo** | `visual_layout`, `secondary_cta_label`, `secondary_cta_url`, `visual_badge_label/title/text`, `underline_word` | Fix first: Hero must render inside `RowSection` (fault list) |
| Title accent | Brand, Gold, Pillar | named accent stored in `title_lines` instead of an inline rgb | Changing a token recolours every title |
| Gold underline | on/off per word | `underline_word` | Hand-drawn SVG stroke under one word (artboard `hand-underline.svg`) |
| Handwritten note | on/off | `note`, `note_handwritten` (exists on hero; add to steps, image+text, services) | Architects Daughter |
| Card (boxed row, exists) | Glass, **Dark**, **Pillar accent** | `cards[].variant`, `cards[].pillar` | Pillar sets top border, icon and title colour |
| Boxed list layout | **List** (numbered rows) | `layout_mode: grid | list`, `cards[].meta`, `cards[].price` | Services index |
| Proof band (exists) | as today | `items[].proof_id` (optional link to `proof_points`) | Typed items work exactly as today |
| Service tiers (exists) | restyled card: tag pill, "What's inside" list, "Done looks like" box, note, CTA | `services[].tag`, `services[].deliverables[]`, `services[].cta_url` (fix: today hard-wired to `/#contact`), `done_looks_like`, `start_here` | |
| FAQ (exists) | open accordion, restyled | none | Keep content and order |
| **World map** | new row type `world_map` | see 5.3 | Homepage |
| **Work teaser** | new row type `work_teaser` | see 5.2 | Homepage, service pages |
| **Work card** | Photo, Number, Dark, Quote | `card_style` | Shared by Work page, teaser, admin preview |
| Navbar (exists) | keep behaviour, restyle | none new; add "Work" link in admin data | See 4.1 |
| Footer (exists) | pillar dots per service link | dot colour from pillar map | "In plain words" answer stays as built |

## 4. Page-by-page (restyle the existing rows; keep their content)

For every page: open its current rows, keep them and their text, and restyle with the tokens and variants above so the page matches the artboard. Where the artboard shows a section the live page does not have, do NOT add it with artboard text: build the row type/variant, add a pre-designed version with neutral placeholder text to `builder/sectionLibrary.ts`, and leave it for Robert to place and fill in the admin.

### 4.1 Global
- **Navbar: keep today's behaviour exactly** (emblem 32px on desktop from 1024px; full logo on the compact island below 1024px; tightens on scroll from 16px to 10px top offset and turns near-solid `rgba(255,255,255,.97)`; phone menu is a full-screen overlay with Services expanded). Restyle only: island radius 2.1rem, `rgba(255,255,255,.8)` + blur 12px, border `--line-2`, `--shadow-soft`, links 14px `--body` with 36px gaps, active link `--heading` 600, Contact pill `--deep`. Add the Work link through the admin's navbar settings once `/work` exists, never hard-coded. See `NavStates` artboard.
- **Footer**: three columns (brand + "In plain words" answer, Services with pillar dots, The Coffin links), bottom rule with emblem and city line. Content from `site_content.footer` as today.
- **Mesh**: as 2.1; respects `prefers-reduced-motion` (static frame) and pauses off-screen.

### 4.2 Homepage (`site_content` rows)
Hero in the **Half-bleed** layout as drawn (text left, photo bleeding off the right edge with a 28px left radius; keep the hero's current title, labels, body and button; photo = the hero's image field, stand-in `img/brand/home-hero.jpg`) → proof strip (deep band) → world map (new) → six service cards (boxed, pillar variant) → picture + text → work teaser (new, featured items) → problem and fix (boxed, Dark variant) → vows → FAQ → contact. Use the homepage's current rows and text in their current order; insert the world map and work teaser rows only after Robert confirms (they have no live copy yet: the map takes its labels from its own fields, which Robert fills).

### 4.3 Services index (`/services`)
Hero → boxed row in List layout (number, pillar dot, tier line, starting price from the row's existing fields) → FAQ → contact.

### 4.4 Six service pages (one template)
Hero with pillar-coloured second title line and optional photo badge → who this is for (steps row with handwritten note) → what good looks like (image+text on pillar background, light text) → problem and fix → engagement tiers (restyled service cards) → **Work in this area** (work teaser, `mode: auto`, pillar = this page; hides itself when empty) → FAQ → From the blog → contact. Each page tints its mesh and accents with its pillar.

### 4.5 About
Profile hero → story text → three "stays exposed" cards → proof band → fit cards → contact. Existing rows, restyled.

### 4.6 Work index (`/work`) and case study (`/work/:slug`): new
See 5.1. Work index: hero, filter pills (pillar and type, built from the data), card grid in each item's default card style, contact. Case study: hero (eyebrow pillar · type, H1 = item title, summary), cover, a 220px sticky "On this page" column with a vertical divider (`--line-3`) beside a 760px reading column, an "At a glance" strip, the case body as rows, closing CTA.

### 4.7 Blog index and post
Existing data and behaviour (filters by `?category=`/`?tag=`, `from_the_blog`, `AllPostsButton`, `MoreArticles`, one article row). Restyle: wide first card, category chips as pills, glass cards, reading column 760px, author block once under the article.

### 4.8 Privacy
Glass card with the existing text row, 820px column.

## 5. New backend (data, admin and public, built together)

### 5.1 Work items and proof points

Migration (through Lovable), RLS like `blog_posts`: public SELECT only where `status = 'published'` (work_items) or `approved = true` (proof_points); all writes require `is_admin()`. Snapshot triggers like `trg_snapshot_blog_post` so Version history covers both. Include `work_items` in `run_scheduled_publishing`. **Create both tables empty. Seed nothing.**

`proof_points`: `id uuid pk`, `value text`, `label text`, `source_note text` (admin only), `approved bool default false`, `pillars text[]`, `sort_order int`, timestamps.

`work_items`: `id uuid pk`, `slug text unique`, `type text check in ('case','artefact','playbook')`, `pillar text check in ('ic','ex','ops','hrbp','pay','mgr')`, `title text` (≤72), `summary text` (≤140), `metric text`, `metric_label text`, `proof_point_id uuid null references proof_points`, `card_style text default 'photo' check in ('photo','number','dark','quote')`, `pull_line text`, `honesty_label text`, `role_title text`, `year text`, `tags text[]`, `cover_image text`, `cover_image_alt text`, `gallery jsonb` (array of `{url, alt, caption}`, max 10), `link_out text`, `has_case_study bool`, `case_rows jsonb`, `draft_case_rows jsonb`, `case_proof_ids uuid[]`, `featured_home bool`, `sort_order int`, `status text`, `published_at`, `publish_at`, `expiry_at`, `meta_title`, `meta_description`, `og_image`, `ai_summary`, timestamps.

Services `src/services/workItems.ts` and `proofPoints.ts`, mirroring `blogPosts.ts`.

Admin: new **Work** destination in `navigation.ts` with sub-tabs **Work items** and **Proof points** (artboards AdminWork, AdminWorkEdit, AdminProof).
- Work items list: drag to reorder (`sort_order`), filters by pillar/type/status, featured toggle, status pill, "New item".
- Work item editor: default card fields (eight up front, the rest in `MoreFields`), card style picker with a live `WorkCard` preview, number typed or linked to a proof point, cover via `ImagePickerField` + required alt, gallery (up to 10, alt + caption each), schedule panel, pre-publish checks, and **Edit case study**, which opens `PageBuilderShell` on `case_rows` the way `BlogPostBuilder` does for posts.
- Proof points: table with value, label, source note, Approved switch and a computed "Used in" list.

Public: routes `/work` and `/work/:slug`; case study renders `case_rows` through the normal row renderer; the "At a glance" strip reads `case_proof_ids`; a linked number hides itself when its proof point is unapproved; `link_out` items open the original instead of a case study.

SEO: add both routes to `scripts/prerender-seo.mjs`, the sitemap and llms.txt; case studies emit `Article` + `Person` (Robert) + `BreadcrumbList` (Home › Work › title); `/work` emits `ItemList`. SEO checks panel covers work items like pages.

### 5.2 Work teaser widget (`work_teaser`)
New family beside `from_the_blog` (artboard AdminTeaser). Schema: `eyebrow`, `title`, `link_label`, `mode: 'auto' | 'picked'`, `pillar`, `types[]`, `limit` (default 3), `default_style`, `items[]` (`work_item_id`, `style`, `overrides{title, summary, metric, metric_label, proof_point_id, pull_line, image, image_alt, link_text, hide_image}`). Render: `auto` takes newest published items of the pillar (on a service page the pillar defaults to the page's) or featured items; `picked` uses the list in order. Any override left empty falls back to the item's field at render time, so fixing a typo on the item fixes every page that did not override it. Inspector: card list, edited cards marked, "Reset to the item's default" per card. Hides itself when it resolves to zero items. Three styles mixed in one row is allowed (homepage).

### 5.3 World map row (`world_map`)
Homepage artboard is the source: take the SVG paths, classes and keyframes from `artboards/Main.dc.html`. Schema: `eyebrow`, `title`, `body`, `groups[]` (`key`, `label`, `colour token`, `countries[]`), `markets[]`, `dots[]` (`name`, `lon`, `lat`), `counters[]` (`value`, `label`, optional `proof_id`), `motion: on | off`, `legend_note`. Defaults hold no countries: Robert fills them in the admin (search, paste or click countries on the preview). Behaviour:
- Worked countries fill in a staggered sequence when the row scrolls into view; a Replay button restarts it; `prefers-reduced-motion` shows the end state.
- Colours: other `#E4DBE8`; group "comms" `--gold-decor`; group "comms and HR" `--violet`; main markets `#3E164B` (violet 20% darker).
- Hover/focus on a worked country only: outline plus a tooltip with the country name (`data-name`) and its group; other countries get no hover. Tooltip is keyboard reachable.
- Small countries render as dots. No city pins.
- Legend lists the groups and an optional note; counters render as real text.

## 6. User stories with acceptance criteria

Format: As a … I want … so that …. Every story's last criterion is the same: **the admin control and the rendered page read the same schema field, and `npm run check` passes.**

### Epic A: Foundations
- **A1 Token layer.** As Robert, I want one place for colours, type and shapes so that changing the brand in Design → Brand changes the whole site. AC: Tailwind and `RowSection` read CSS variables; Brand screen writes them; contrast test passes; no hex left in public components except `pillarColors.ts`.
- **A2 Six pillars.** As a visitor I want each service in its own colour everywhere. AC: six entries; cards, heroes, footer dots, blog tags, map and work cards read the map; Pay and Mgr pages join the visual suite.
- **A3 Wiring faults.** As Robert I want what I set in the admin to show on the site. AC: Hero inside `RowSection`; Save always writes draft and only Publish goes live (alt check + cache refresh); Preview opens the draft; prerender falls back to the hero answer; cover images and overlays go through alt check and `imageShrink`.

### Epic B: Global chrome
- **B1 Navbar restyle**, behaviour unchanged (4.1). AC: identical breakpoints and scroll behaviour; visual baseline updated only for the restyle.
- **B2 Footer** with pillar dots and existing content.
- **B3 Mesh** per page, reduced-motion safe.

### Epic C: Row variants
- **C1 Glass look**, **C2 Half-bleed hero + badge + second link**, **C3 Named title accents + gold underline**, **C4 Dark and pillar cards**, **C5 List layout**, **C6 Handwritten notes on more rows**, **C7 Service tier card fields + per-tier CTA URL**. AC for each: new fields defaulted so every existing page renders unchanged until an option is chosen; the option appears in the row's editor within the eight-field diet; a pre-designed version exists in the section library.

### Epic D: Page restyles (content untouched)
- **D1 Homepage, D2 Services index, D3 six service pages, D4 About, D5 Blog index, D6 Blog post, D7 Privacy.** As a visitor I want the new look with the words I already know. AC: a diff of every page's text before and after is empty; layout matches the artboard at 1440 and 390; visual baselines refreshed for these pages only.

### Epic E: Work and proof
- **E1 Tables + RLS + triggers**, empty. **E2 Admin Work destination**: list, editor, proof library. **E3 `/work`** with filters. **E4 `/work/:slug`** with sticky contents, At a glance, case rows. **E5 Work teaser** with per-page styles and overrides. **E6 Proof links** on proof band and map counters. **E7 SEO** for both routes.
- Key ACs: an unpublished item never reaches a visitor; a scheduled item appears at `publish_at`; alt text required before publish; artefacts and playbooks require an honesty label; an item without a case study shows no link to one; the teaser hides when empty; reorder in the admin changes `/work` order.

### Epic F: World map
- **F1 Row + editor + defaults.** **F2 Animation, replay, reduced motion.** **F3 Hover/focus tooltip on worked countries only.** **F4 Counters as text, optional proof links.**

## 7. States, edge cases, responsive

| Case | Behaviour |
| --- | --- |
| Empty `/work` | Hero plus one line: "New work is on its way." (UI string, editable in the Work page settings) and the contact row |
| Teaser with no items | Row renders nothing (no heading) |
| Missing cover | Photo card falls back to Number style; never a broken image |
| Long title | Cards clamp the title at 3 lines and the summary at 3 lines; full text on the case study |
| Unapproved linked number | Number hidden, label kept if typed |
| Loading | Skeleton cards at the card size; no layout shift |
| Data error | Row hides itself on the public site and logs once; admin shows the error inline |
| Breakpoints | Phone < 640, tablet 640–1023, desktop ≥ 1024. Side-by-side blocks stack under 768. Case study contents column becomes a collapsible "On this page" above the body under 1024. Filters wrap; wide tables scroll inside their box |

## 8. Motion and accessibility

| Element | Trigger | Animation | Duration / easing |
| --- | --- | --- | --- |
| Section entrance | in view | existing `.mc-rise` | as today |
| Map fill | in view, Replay | staggered fill by group | per artboard keyframes |
| Map main-market ring | after fill | ring pulse | 2.4s ease-out, 3 times then stop |
| Card hover | hover/focus | lift 2px + `--shadow-card` | 160ms ease-out |
| Nav tighten | scroll > 24px | top 16→10px, bg alpha .8→.97 | 200ms |

All motion off under `prefers-reduced-motion`. Focus order follows reading order; filter pills are real buttons with `aria-pressed`; the map tooltip is announced; icon-only buttons carry `aria-label`; tap targets ≥ 44px; text contrast AA (gold text only `#815E18` on light).

## 9. Build order (one phase per change, plan approved first)

1. Wiring faults (A3)
2. Token layer and six pillars (A1, A2)
3. Row variants (Epic C)
4. Global chrome (Epic B)
5. Page restyles (Epic D), page by page, text diff empty each time
6. Work tables (E1), then admin, pages, teaser, proof links, SEO (E2–E7)
7. World map (Epic F)
8. Visual suite: all six service pages, frozen test page for design checks, new baselines

Nothing in any phase writes to existing content rows. Ask Robert before any data migration that touches live rows.
