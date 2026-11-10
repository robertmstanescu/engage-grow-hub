# Redesign plan — The Magic Coffin (design only, copy stays)

Source: `docs/redesign/00-HANDOVER.md` (wins on conflict), artboards, `03-appendix`. The four rules in spec §0 govern everything: no content writes, schema-driven fields, ARCHITECTURE.md rules, one bundle at a time ending with `npm run check`.

**How we build:** after two groundwork phases, every page is its own bundle — everything that page needs (rows, variants, styling, schema fields, tests) lands together, and we finish one bundle before starting the next. Every visual option is a schema field the admin edits and the renderer reads, with a test proving schema, editor and renderer agree — so backend and frontend can never drift apart. The portfolio (Work) groundwork comes before the page bundles, so adding the portfolio page later is just placing rows, not building features.

## Phase 1 — Wiring faults (A3)

Files: `src/features/site/rows/HeroRow.tsx`, `RowRenderer.tsx`, `src/features/admin/builder/*` (save/publish path), `scripts/prerender-seo.mjs`, `src/services/contentAccessibility.ts`, `CoverImageField.tsx`.

- Wrap `HeroRow` in `RowSection` so text tone, edge shapes, radius and outlines work on heroes (today it paints itself unless multi-widget).
- Save always writes draft; only Publish goes live (alt check + cache refresh). Preview opens the draft everywhere.
- Prerender falls back to the hero `answer` for the search description when meta description is empty.
- Cover images join the alt-text check; overlay uploads go through `imageShrink`.
- Fix the llms-txt function logging to a missing table.
- Tests: save/publish unit tests, prerender fallback test, alt-check coverage test. No visual change expected.

## Phase 2 — Foundations: tokens, pillars, row variants, chrome (A1, A2, Epic C, Epic B)

Files: `src/index.css`, `tailwind.config.ts`, `src/hooks/useBrandSettings.ts` (`applyBrandCSSVars`), `src/lib/constants/pillarColors.ts`, new `src/lib/tokens.json` (W3C format, generated), `Footer.tsx`, `useTagColors.ts`, `rowLooks.ts`, `RowSection.tsx`, hero schema/`HeroEditor.tsx`/`HeroView`, `boxed/schema.ts` + `BoxedRow.tsx`, `PillarEditor.tsx`/`ServiceCard.tsx`/`ServiceRow.tsx`, `TitleLinesEditor.tsx`, `sectionLibrary.ts`, `Navbar.tsx`, `pageMesh.ts`/`PageMeshLiquid.tsx`.

- Token layer: spec §2.1 colours (`--paper`, `--ink`, `--heading`, `--body`, `--meta`, `--link`, `--gold-text`, `--gold`, `--deep`, `--deep-fg`, `--violet`, `--line-1..3`, `--tint`, `--glass`, `--glass-border`), §2.3 shape/shadow/space, mapped in Tailwind; type per §2.2 mapped onto existing `--fs-*` tokens. Rewire `applyBrandCSSVars` so Brand settings write the variables rows actually read.
- `pillarColors.ts`: add `pay-transparency #883500` and `manager-enablement #201A53`; keep full-slug keys, add a short-key alias map (`ic`, `ex`, `ops`, `hrbp`, `pay`, `mgr`).
- Row variants, all defaulted so existing pages render unchanged:
  - Hero: `visual_layout` (`centred`|`half_bleed`), `secondary_cta_label`, `secondary_cta_url`, `visual_badge_label/title/text`, `underline_word`.
  - Boxed: `cards[].variant` (`glass`|`dark`|`pillar`), `cards[].pillar`, `layout_mode` (`grid`|`list`), `cards[].meta`, `cards[].price`.
  - Service tiers: `services[].cta_url` (default `/#contact` — fixes the hard-wire), `done_looks_like`, `start_here`.
  - `note` + `note_handwritten` on process_steps, image_text, service.
  - Named title accents (`brand`|`gold`|pillar) in `title_lines`; renderer keeps supporting legacy inline rgb.
  - Glass look as a fifth derivable preset in `rowLooks.ts` (not a stored field — see Conflicts).
  - Gold underline via `hand-underline.svg`.
- Chrome: navbar restyle only (behaviour and breakpoints untouched; "Work" link added later via admin navbar settings, never hard-coded); footer three columns with pillar dots; mesh defaults per spec, reduced-motion safe, pauses off-screen.
- Section-library entries for every new variant, with neutral placeholder text.
- Tests: WCAG AA contrast for every text/ground pair; pillar lookups; schema/editor/renderer agreement per touched row type; field-diet stays green.

## Phase 3 — Portfolio groundwork (Epic E) — so a portfolio page is added easily

Migration (via Lovable): create `proof_points` and `work_items` exactly per spec §5.1 — **empty, no seeds**. RLS like `blog_posts`: public SELECT only `status='published'` / `approved=true`; writes need `is_admin()`; column privileges exclude `draft_case_rows` from anon; snapshot triggers like `trg_snapshot_blog_post`; both tables added to `run_scheduled_publishing`. Then regenerate types.

Files: `src/services/workItems.ts`, `proofPoints.ts` (mirror `blogPosts.ts`); `navigation.ts` new **Work** destination with sub-tabs Work items / Proof points; `WorkItemsManager`, `WorkItemEditor`, `ProofPointsManager`; a work adapter reusing `PageBuilderShell` for `case_rows` (like `BlogPostBuilder`); `WorkCard` (photo/number/dark/quote); new `work_teaser` widget (schema per §5.2, one block family, lazy editor); `proof_band` items gain optional `proof_id`.

- After this phase, the portfolio page is just a route with rows: the Homepage bundle can place the teaser, and the `/work` + `/work/:slug` routes land in the Work bundle as pure presentation.
- Acceptance: unpublished items never render; scheduled items appear at `publish_at`; alt required before publish; honesty label required for artefacts/playbooks; teaser hides when empty; linked numbers hide when unapproved.
- Tests: teaser filtering/override fallback, proof-link hiding, RLS via existing patterns, schema agreement.

## Phase 4 — Page bundles, one at a time (Epic D)

Each bundle = everything for that page: restyle its existing rows to the artboard (grids, padding, radii, glass cards, pillar accents), place any new rows the design needs, refresh that page's visual baselines, and prove its text diff is empty before starting the next bundle. No rows added with artboard text; sections the live page lacks become section-library entries for Robert to place.

1. **Homepage** — half-bleed hero, deep proof strip, six pillar service cards, picture + text, work teaser (featured), dark problem card, vows, FAQ, contact. World map row is built in Phase 5 and placed here once you confirm.
2. **Services index** — hero, boxed row in List layout (number, pillar dot, tier line, starting price), FAQ, contact.
3. **Six service pages** (one template, six passes) — pillar title accent + photo badge, steps with handwritten note, pillar-background image+text, dark problem card, restyled tiers, work teaser (`mode: auto`, page's pillar, hides when empty), FAQ, From the blog, contact; pillar-tinted mesh per page.
4. **About** — profile hero, story, three cards, proof band, fit cards, contact.
5. **Blog index** — wide first card, category chips as pills, glass cards.
6. **Blog post** — 760px reading column, author block once under the article, restyled extras.
7. **Privacy** — glass card, 820px column.
8. **Work index + case study** — routes `/work` and `/work/:slug`: filter pills from the data, card grid, sticky "On this page" column, "At a glance" strip from `case_proof_ids`, case body through the row renderer, closing CTA. Prerender + sitemap + llms.txt + SEO checks; `Article` + `Person` + `BreadcrumbList` for case studies, `ItemList` for `/work`. Empty state: "New work is on its way." (editable UI string). Then the Work nav link is added in admin navbar settings.

## Phase 5 — World map (Epic F)

Files: new `src/features/widgets/world_map/` (schema, `WorldMapRow.tsx`, lazy editor, index), `src/widgets/index.tsx`, `blockFamilies.ts` (Numbers family), `sectionLibrary.ts`, `public/` world-atlas 110m JSON, prerender script.

- Schema per §5.3; **defaults hold no countries** — Robert fills them. SVG paths/keyframes from `artboards/Main.dc.html`; d3-geo + topojson loaded dynamically only when the row mounts. Staggered fill on scroll into view, Replay button, reduced-motion end state, keyboard-reachable tooltip on worked countries only, counters as real text with optional `proof_id`.
- Tests: group resolution (last group wins), counter maths, code lookup, paste parsing, hover labels, schema defaults; visual baseline of the finished map.

## Phase 6 — Visual suite

Files: `tests/visual/rows.visual.spec.ts`, baselines, a frozen test page with fixed sample content.

- Add pay-transparency and manager-enablement pages; frozen test page for design checks (the suite runs on live data, so content edits otherwise turn it red); refresh darwin + linux baselines, stated in the commit.

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
