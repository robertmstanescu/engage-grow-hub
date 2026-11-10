# Redesign plan — The Magic Coffin (design only, copy stays)

Source: `docs/redesign/00-HANDOVER.md` (wins on conflict), artboards, `03-appendix`. The four rules in spec §0 govern everything: no content writes, schema-driven fields, ARCHITECTURE.md rules, one bundle at a time ending with `npm run check`.

**How we build:** after two groundwork phases, every page is its own bundle — everything that page needs (rows, variants, styling, schema fields, tests) lands together, and we finish one bundle before starting the next. Every visual option is a schema field the admin edits and the renderer reads, with a test proving schema, editor and renderer agree — so backend and frontend can never drift apart. The portfolio (Work) groundwork comes before the page bundles, so adding the portfolio page later is just placing rows, not building features.

**Every story's last acceptance criterion is the same (spec §6): the admin control and the rendered page read the same schema field, and `npm run check` passes.**

---

## Phase 1 — Wiring faults (Epic A, story A3)

**User story.** As Robert, I want what I set in the admin to show on the site, so that nothing I configure is silently ignored.

**Why first:** these are bugs where the admin and the site disagree today. Building the redesign on top of them would bake the disagreement into every new variant.

**Detailed actions:**

1. **Hero inside `RowSection`** — Today `HeroRow.tsx:19-53` renders `HeroView` directly; the outer row only uses `RowSection` when multi-widget or covered (`RowRenderer.tsx:106-116`). So text tone, edge shapes, rounded corners and outlines set on a hero do nothing (the homepage hero even stores a rounded bottom edge nobody sees). Action: wrap the hero's render in `RowSection` like every other row, keeping its current height and background behaviour.
2. **Save means draft, Publish means live** — Today "Save" on a live page publishes without the alt-text check and, on the homepage, without refreshing the cache. Action: route every save path (autosave, Save button) to the draft column only; Publish is the single path that goes live, runs the alt check and invalidates the cache.
3. **Preview opens the draft** — the CMS Preview button currently shows the published version. Action: use the same draft-preview parameter everywhere.
4. **Prerender falls back to the plain answer** — Google sees an empty description on pages without a meta description. Action: `scripts/prerender-seo.mjs` falls back to the hero `answer`, as the live page already does.
5. **Image rule gaps** — row cover images skip the alt check; overlay uploads skip `imageShrink`. Action: add both to the checks.
6. **Minor:** the llms-txt edge function logs to a table that does not exist — fix the target.

**Tests:** save/publish unit tests (Save never touches live columns), prerender fallback test, alt-check coverage test for covers. No visual change expected; visual suite must stay green without baseline changes.

---

## Phase 2 — Foundations (Epics A, B, C)

Everything later reads these tokens and variants, so they land once, here.

### 2a. Token layer (A1)

**User story.** As Robert, I want one place for colours, type and shapes, so that changing the brand in Design → Brand changes the whole site.

**Why:** today the look is spread over four places that don't talk — `index.css`, `tailwind.config.ts`, the `brand_settings` row, and inline colours in titles. `applyBrandCSSVars` (`useBrandSettings.ts:116-144`) writes `--brand-*` variables that nothing reads. One token layer fixes that permanently.

**Actions:**
- Add spec §2.1 colour tokens to `src/index.css`: `--paper #FAF8F5`, `--ink #26142E`, `--heading #481C5F`, `--body #5C4965`, `--meta #8A7A92`, `--link #672786`, `--gold-text #815E18`, `--gold #E6C24C`, `--gold-decor #E5C54F`, `--deep #2A0E33`, `--deep-fg #FBF7EC`, `--violet #4D1B5E`, `--line-1/2/3`, `--tint`, `--glass` + `--glass-border`. All in HSL channel form, per project rules.
- Add §2.3 shape/depth/space tokens: `--radius-card 24px`, `--radius-inner 14px`, `--radius-island 2.1rem`, `--radius-pill 999px`, `--shadow-soft`, `--shadow-card`, page gutter `clamp(16px,5vw,96px)`, section padding, 1280px container, 24–28px card gaps.
- Type per §2.2 mapped onto the existing `--fs-*` tokens — never `vh`, never script-shrunk, `.measure` stays 54ch. (The handover's `tokens/web.css` uses `vh` in clamps; §2.2 of the spec forbids it, so web.css type values are ignored — see Conflicts.)
- Mirror everything in `tailwind.config.ts` (`colors`, `borderRadius`, `boxShadow`, `fontFamily`).
- Rewire `applyBrandCSSVars` to write these variables so Brand settings actually change the site.
- Generate `src/lib/tokens.json` (W3C Design Tokens format) from the same values.
- Buttons: exactly two pills + one arrow link (primary `--deep`/`--deep-fg` 44px pill; ghost pill with `--line-3` border; arrow link `--link` with "→"); focus ring `2px solid --gold, offset 2px` everywhere.

**Tests:** a unit test checks every text/ground token pair against WCAG AA (gold text only `#815E18` on light); a test fails on raw hex in public components outside `pillarColors.ts`.

### 2b. Six pillars (A2)

**User story.** As a visitor, I want each service in its own colour everywhere, so I can recognise it across the site.

**Why:** `pillarColors.ts` has four entries and only boxed cards read it; blog tags duplicate the hexes in `useTagColors.ts:21-45`; the footer doesn't colour service links at all.

**Actions:** add `pay-transparency #883500` and `manager-enablement #201A53` to `pillarColors.ts`; add a short-key alias map (`ic`, `ex`, `ops`, `hrbp`, `pay`, `mgr`) for the new tables and artboards; make blog tags and footer dots read the map; `pillarColorFromLink` learns the two new slugs.

**Tests:** pillar lookup tests (both key forms); the visual suite's service-route derivation picks up all six.

### 2c. Row variants (Epic C, stories C1–C7)

**User stories.** As Robert, I want each new look to be a named option on the row I already have, so that existing pages render unchanged until I choose the option. As a visitor, I want the new card, hero and list styles to match the artboards.

**Why named variants instead of colour pickers:** the project's own rules say "pick, don't paint" — raw colour pickers stay in "Custom colours"; new looks arrive as named choices with defaults, so an empty page never looks broken and the eight-field diet is kept.

**Actions (all fields defaulted so every existing page renders unchanged):**

- **C1 Glass look** — a fifth Look preset in `rowLooks.ts` (glass background + radius + `--glass-border`), derived/applied like Plain/Card/Band/Cover. Not a stored `layout.look` field — see Conflicts.
- **C2 Half-bleed hero + badge + second link** — hero schema gains `visual_layout` (`centred`|`half_bleed`), `secondary_cta_label`, `secondary_cta_url`, `visual_badge_label/title/text`. Renderer splits text/photo per the Main artboard (photo bleeds off the right edge, 28px left radius; stacks on phones).
- **C3 Named title accents + gold underline** — `title_lines` entries can carry a named accent (`brand`|`gold`|pillar) instead of inline rgb; the renderer supports both forever (existing content keeps its inline rgb — it may not be rewritten). Hero and text titles gain `underline_word`, rendered with the hand-drawn `hand-underline.svg` stroke.
- **C4 Dark and pillar cards** — boxed schema gains `cards[].variant` (`glass`|`dark`|`pillar`) and `cards[].pillar`; pillar sets the top border, icon and title colour from the map.
- **C5 List layout** — boxed gains `layout_mode` (`grid`|`list`), `cards[].meta`, `cards[].price` (numbered rows for the Services index).
- **C6 Handwritten notes on more rows** — `note` + `note_handwritten` (Architects Daughter, `--link` colour) added to process_steps, image_text and service rows, reusing the shared `NoteField`.
- **C7 Service tier fields** — `services[].cta_url` (default `/#contact`, fixing the hard-wire in `ServiceCard.tsx:53-62`), `done_looks_like`, `start_here`, and the restyled tier card (tag pill, "What's inside" list, "Done looks like" box).
- Each variant gets a pre-designed entry in `builder/sectionLibrary.ts` with neutral placeholder text.

**Tests:** schema/editor/renderer agreement per touched row type; `fieldDiet.test.tsx` stays green (new fields go in `MoreFields`); defaults test proves an old row's data renders byte-identical output.

### 2d. Global chrome (Epic B, stories B1–B3)

**User stories.** As a visitor, I want the navigation and footer to feel like the new brand without changing how they behave. As Robert, I want the moving background per page, safe for reduced-motion users.

**Actions:**
- **B1 Navbar** — restyle only: island radius 2.1rem, `rgba(255,255,255,.8)` + blur 12px, `--line-2` border, `--shadow-soft`, links 14px `--body` with 36px gaps, active link `--heading` 600, Contact pill `--deep`. Behaviour untouched: emblem 32px from 1024px, full logo on the compact island below, tightens on scroll 16→10px and turns near-solid, phone menu full-screen overlay. The "Work" link is added through admin navbar settings once `/work` exists — never hard-coded.
- **B2 Footer** — three columns (brand + "In plain words" answer, Services with pillar dots, The Coffin links), bottom rule with emblem and city line; content from `site_content.footer` as today.
- **B3 Mesh** — keep the liquid-silk WebGL mesh; default colours `#EBD3F0, #FAECC0, #E8D6F2, #F6E9C4`, drift set, strength 55, grain 0.32; `prefers-reduced-motion` shows a static frame; the shader pauses off-screen.

**Tests:** existing navbar behaviour tests must pass unchanged; visual baselines refreshed for the chrome restyle only, stated in the commit.

---

## Phase 3 — Portfolio groundwork (Epic E, stories E1, E2, E5, E6)

**User stories.** As Robert, I want a Work collection with its own tables and admin screens, so that case studies, artefacts and playbooks are managed like blog posts — and so that a portfolio page can be added later by simply placing rows, not building features. As a visitor, I want to see only published work.

**Why before the page bundles:** the homepage and service-page bundles place the work teaser; building the tables, services, card component and teaser first means every later bundle — and any future portfolio page — is pure presentation.

**Actions:**

1. **E1 Migration (via Lovable), both tables empty, seed nothing:**
   - `proof_points`: `id uuid pk`, `value text`, `label text`, `source_note text` (admin only), `approved bool default false`, `pillars text[]`, `sort_order int`, timestamps.
   - `work_items`: `id uuid pk`, `slug text unique`, `type text check in ('case','artefact','playbook')`, `pillar text check in ('ic','ex','ops','hrbp','pay','mgr')`, `title text` (≤72), `summary text` (≤140), `metric text`, `metric_label text`, `proof_point_id uuid null references proof_points`, `card_style text default 'photo' check in ('photo','number','dark','quote')`, `pull_line text`, `honesty_label text`, `role_title text`, `year text`, `tags text[]`, `cover_image text`, `cover_image_alt text`, `gallery jsonb` (max 10 of `{url, alt, caption}`), `link_out text`, `has_case_study bool`, `case_rows jsonb`, `draft_case_rows jsonb`, `case_proof_ids uuid[]`, `featured_home bool`, `sort_order int`, `status text`, `published_at`, `publish_at`, `expiry_at`, `meta_title`, `meta_description`, `og_image`, `ai_summary`, timestamps.
   - RLS like `blog_posts`: public SELECT only where `status='published'` (work_items) or `approved=true` (proof_points); all writes require `is_admin()`; GRANTs in the same migration; column privileges exclude `draft_case_rows` from anon (same pattern as the blog's `draft_page_rows`).
   - Snapshot triggers like `trg_snapshot_blog_post` so Version history covers both; both tables added explicitly to `run_scheduled_publishing` (it does not auto-discover tables).
   - Regenerate `types.ts` afterwards.
2. **Services:** `src/services/workItems.ts` and `proofPoints.ts`, mirroring `blogPosts.ts` (thin CRUD, explicit column lists on public queries).
3. **E2 Admin Work destination** in `navigation.ts` with sub-tabs **Work items** and **Proof points** (artboards AdminWork, AdminWorkEdit, AdminProof):
   - Work items list: drag to reorder (`sort_order`), filters by pillar/type/status, featured toggle, status pill, "New item".
   - Work item editor: eight primary fields, rest in `MoreFields`; card-style picker with a live `WorkCard` preview; number typed or linked to a proof point; cover via `ImagePickerField` + required alt; gallery (≤10, alt + caption each); schedule panel; pre-publish checks (alt, honesty label for artefacts/playbooks, linked number approved, title/summary/meta lengths, warning-only word lists); **Edit case study** opens `PageBuilderShell` on `case_rows` via a work adapter, the way `BlogPostBuilder` does for posts.
   - Proof points: table with value, label, source note, Approved switch, computed "Used in" list.
4. **WorkCard component** — the four styles (Photo, Number, Dark, Quote), shared by the Work page, teaser and admin preview; title clamped at 3 lines, summary at 3; missing cover falls back to Number style; loading skeletons at card size.
5. **E5 Work teaser widget** (`work_teaser`, one block family beside `from_the_blog`, lazy editor): schema `eyebrow`, `title`, `link_label`, `mode: 'auto'|'picked'`, `pillar`, `types[]`, `limit` (default 3), `default_style`, `items[]` (`work_item_id`, `style`, `overrides{title, summary, metric, metric_label, proof_point_id, pull_line, image, image_alt, link_text, hide_image}`). `auto` takes newest published items of the pillar (defaults to the page's pillar on service pages) or featured items; `picked` uses the list in order. Empty overrides fall back to the item's field at render time — fixing a typo on the item fixes every page. Inspector lists the cards, marks edited ones, "Reset to the item's default" per card. Hides itself at zero items. Three styles may mix in one row.
6. **E6 Proof links** — `proof_band` items gain an optional `proof_id`; typed items work exactly as today; a linked number hides when its proof point is unapproved (label kept if typed).

**Acceptance highlights (spec §6 Epic E):** an unpublished item never reaches a visitor; a scheduled item appears at `publish_at`; alt text required before publish; artefacts and playbooks require an honesty label; an item without a case study shows no link to one; the teaser hides when empty; reorder in the admin changes `/work` order.

**Tests:** teaser filtering and override fallback, proof-link hiding, scheduled publishing, RLS patterns, schema/editor/renderer agreement for the new widget; `rowRegistry.test.ts` and `blockFamilies.test.ts` cover the wiring.

---

## Phase 4 — Page bundles, one at a time (Epic D, stories D1–D7 + E3, E4, E7)

**User story (each bundle).** As a visitor, I want the new look with the words I already know — so each bundle's acceptance is: the page's text diff is empty, the layout matches the artboard at 1440 and 390, and visual baselines are refreshed for that page only.

**Why per-page bundles:** every change a page needs lands together and is verified together; a half-finished redesign never ships. Where the artboard shows a section the live page doesn't have, we build the row type/variant and add a neutral section-library entry — Robert places and fills it; artboard text is never copied.

1. **D1 Homepage** — hero in Half-bleed layout (current title, labels, body, button kept; photo from the hero's image field) → proof strip as a deep band → six service cards (boxed, pillar variant) → picture + text → work teaser (featured items) → problem and fix (boxed, Dark variant) → vows → FAQ → contact. Current rows, current order, current text. The world map is built in Phase 5 and placed here only after Robert confirms.
2. **D2 Services index** — hero → boxed row in List layout (number, pillar dot, tier line, starting price from existing fields) → FAQ → contact.
3. **D3 Six service pages** (one template, six passes: IC, EX, Ops, HRBP, Pay, Mgr) — hero with pillar-coloured second title line and optional photo badge → who this is for (steps + handwritten note) → what good looks like (image+text on pillar background, light text) → problem and fix → restyled engagement tiers → work teaser (`mode: auto`, pillar = page, hides when empty) → FAQ → From the blog → contact. Each page's mesh tints toward its pillar (values from each service artboard's `data-colors`), set via the hero's Page background panel as today.
4. **D4 About** — profile hero → story text → three "stays exposed" cards → proof band → fit cards → contact.
5. **D5 Blog index** — wide first card, category chips as pills, glass cards; existing `?category=`/`?tag=` filters, `AllPostsButton` unchanged.
6. **D6 Blog post** — 760px reading column, author block once under the article, `MoreArticles` beside/below as today, one article row.
7. **D7 Privacy** — glass card with the existing text row, 820px column.
8. **E3/E4/E7 Work index + case study** — routes `/work` and `/work/:slug`: hero, filter pills (pillar and type, built from the data, real buttons with `aria-pressed`), card grid in each item's default style, contact; case study: hero (eyebrow pillar · type, H1, summary), cover, 220px sticky "On this page" column with `--line-3` divider beside a 760px reading column (collapsible above the body under 1024px), "At a glance" strip from `case_proof_ids`, case body through the normal row renderer, closing CTA. Empty `/work`: hero + "New work is on its way." (editable UI string) + contact. `link_out` items open the original. SEO: both routes into `prerender-seo.mjs`, sitemap and llms.txt; case studies emit `Article` + `Person` + `BreadcrumbList` (Home › Work › title); `/work` emits `ItemList`; SEO checks panel covers work items like pages. Then the Work nav link is added in admin navbar settings.

---

## Phase 5 — World map (Epic F, stories F1–F4)

**User stories.** As Robert, I want an editable world map row, so I can show where the work has travelled without touching code. As a visitor, I want a delightful, accessible animation that respects my motion settings.

**Actions:**
- **F1 Row + editor + defaults** — new `src/features/widgets/world_map/` per ARCHITECTURE.md ("How to add a row type"): `world_map` in `ROW_TYPES`, zod/mini `looseObject` schema with every field defaulted (`eyebrow`, `title`, `body`, `groups[]` of `{key, label, colour token, countries[]}`, `markets[]`, `dots[]` of `{name, lon, lat}`, `counters[]` of `{value, label, optional proof_id}`, `motion: on|off`, `legend_note`), renderer, lazy editor, `registerWidget`, one import in `src/widgets/index.tsx`, one family in `blockFamilies.ts` (Numbers), a section-library entry. **Defaults hold no countries — Robert fills them** (search, paste, or click countries on the preview).
- **F2 Animation** — SVG paths, classes and keyframes taken from `artboards/Main.dc.html`; staggered fill by group when the row scrolls into view; Replay button restarts (class-swap method); main-market ring pulses 2.4s ease-out, 3 times then stops; `prefers-reduced-motion` or motion off shows the end state with final counter values.
- **F3 Hover/focus** — only worked countries respond: dark outline + tooltip with country name and group, keyboard reachable and announced; other countries get no hover. Small countries render as dots by lon/lat. Colours: other `#E4DBE8`, comms `--gold-decor`, comms+HR `--violet`, main markets `#3E164B`.
- **F4 Counters** — real text (crawlers and AI can read them), optional `proof_id` links; legend lists groups + optional note.
- Prerender writes the map description and country list as text.

**Tests:** group resolution (last group wins), counter maths (countries outside the first group never counted), code lookup, paste parsing, hover labels, small-country dot placement, schema defaults; visual baseline of the finished still map.

---

## Phase 6 — Visual suite

**User story.** As Robert, I want every row on every page screenshotted and compared on each change, so a design regression can't slip through.

**Actions:** add the pay-transparency and manager-enablement pages to `tests/visual/rows.visual.spec.ts`; add a frozen test page with fixed sample content for design checks (the suite runs against live data, so content edits otherwise turn it red); refresh darwin + linux baselines, stated in the commit.

---

## Phase 7 — Quality check and break test (before anything goes live)

**User story.** As Robert, I want the finished site stress-tested before publish, so visitors never meet a rough edge.

**Actions:**
- **Quality check:** `npm run check` (typecheck, lint ratchet, unit tests, build) plus the full visual suite at 1440 and 390; every public page reviewed side-by-side against its artboard; WCAG AA contrast test green; SEO checks panel clean on every page (titles, descriptions, one H1, plain answer, alt on every picture).
- **Break test:** try to break it like a visitor would — phone, tablet and desktop widths; slow network; empty states (no work items, teaser with zero items, missing cover image); long titles; reduced motion on; keyboard-only navigation through navbar, filters, map tooltip and accordions; every link and button on every page; the booking calendar block; draft vs. live (unpublished work items must never appear).
- **Final text diff:** the before/after text capture of every public page runs one last time and must be empty (except intentional chrome).
- Only after all three pass do we publish. Anything found goes back to its bundle and is re-checked.

---

## Conflicts and what I suggest

1. **`tokens/web.css` uses `vh` in font-size clamps** — our rules forbid `vh` in type sizes, and spec §2.2 agrees ("map onto the existing `--fs-*` tokens, never `vh`"). I follow §2.2 and ignore the web.css type clamps.
2. **Artboards show a contact form** — the site now uses the Google Calendar booking block, and email forms must never come back. The contact row keeps the calendar; it is restyled only.
3. **Spec asks for a stored `layout.look` with Glass** — project rules say a Look is derived, never stored. I'll add Glass as a fifth derivable/appliable preset in `rowLooks.ts` instead.
4. **Named title accents vs. existing content** — stored `title_lines` contain inline rgb and may not be rewritten. The renderer will support both: legacy inline rgb keeps working; new edits save named accents.
5. **Docs 01/02 want seeds and copy fixes** (six proof points, 21 work items, copy-deck edits) — spec §0 overrides: tables start empty, no copy changes. Ignored.
6. **Pillar keys** — existing code uses full slugs; artboards/new tables use short keys. One alias map in `pillarColors.ts` bridges them; it stays the only place pillar colours live.
7. **`run_scheduled_publishing` does not auto-discover tables** — work_items must be added explicitly in the migration.
8. **Blog extra rows publish instantly / old list editor** — noted as a known fault; I'll fix it in the Blog bundles only if you want it, since it touches publish behaviour.

## Proving no page text changed

- **Before Phase 2**, I take a database snapshot of all text-bearing fields (`cms_pages.page_rows`/`draft_page_rows`, `site_content`, `blog_posts`, FAQ/tiers/footer/navbar) and a rendered-text capture of every public page (via the prerendered HTML at 1440px).
- **After each phase and each page bundle**, I re-run both captures and diff: the DB diff must be empty (no content writes), and the rendered-text diff must be empty except where a bundle intentionally adds chrome (e.g. the Work nav link, map legend labels you later fill in).
- Each page bundle ships only with an empty diff for that page, and the diff report is included in the bundle note.

Every phase and bundle ends with `npm run check` passing and a short note of what changed in the admin and on the site.
