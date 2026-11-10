# Redesign plan — The Magic Coffin (design only, copy stays)

Source: `docs/redesign/00-HANDOVER.md` (wins on conflict), artboards, `03-appendix`. The four rules in spec §0 govern everything: no content writes, schema-driven fields, ARCHITECTURE.md rules, one phase at a time ending with `npm run check`.

## Phase 1 — Wiring faults (A3)

Files: `src/features/site/rows/HeroRow.tsx`, `RowRenderer.tsx`, `src/features/admin/builder/*` (save/publish path), `scripts/prerender-seo.mjs`, `src/services/contentAccessibility.ts`, `CoverImageField.tsx`.

- Wrap `HeroRow` in `RowSection` so text tone, edge shapes, radius and outlines work on heroes (today it paints itself unless multi-widget).
- Save always writes draft; only Publish goes live (alt check + cache refresh). Preview opens the draft everywhere.
- Prerender falls back to the hero `answer` for the search description when meta description is empty.
- Cover images join the alt-text check; overlay uploads go through `imageShrink`.
- Fix the llms-txt function logging to a missing table.
- Tests: save/publish unit tests, prerender fallback test, alt-check coverage test. No visual change expected.

## Phase 2 — Token layer + six pillars (A1, A2)

Files: `src/index.css`, `tailwind.config.ts`, `src/hooks/useBrandSettings.ts` (`applyBrandCSSVars`), `src/lib/constants/pillarColors.ts`, new `src/lib/tokens.json` (W3C format, generated), `Footer.tsx`, `useTagColors.ts`.

- Add spec §2.1 colour tokens (`--paper`, `--ink`, `--heading`, `--body`, `--meta`, `--link`, `--gold-text`, `--gold`, `--deep`, `--deep-fg`, `--violet`, `--line-1..3`, `--tint`, `--glass`, `--glass-border`), §2.3 shape/shadow/space tokens, mapped in Tailwind. Type per spec §2.2 mapped onto existing `--fs-*` tokens.
- Rewire `applyBrandCSSVars` so Brand settings write the variables rows actually read.
- `pillarColors.ts`: add `pay-transparency #883500` and `manager-enablement #201A53`; keep existing full-slug keys, add a short-key alias map (`ic`, `ex`, `ops`, `hrbp`, `pay`, `mgr`) for the new tables/artboards.
- Footer pillar dots; blog tags read the pillar map instead of duplicating hexes.
- Tests: WCAG AA contrast test for every text/ground pair; pillar lookup tests. No page restyle yet.

## Phase 3 — Row variants (Epic C)

Files: `rowLooks.ts`, `RowSection.tsx`, hero schema/`HeroEditor.tsx`/`HeroView`, `boxed/schema.ts` + `BoxedRow.tsx`, `PillarEditor.tsx`/`ServiceCard.tsx`/`ServiceRow.tsx`, `TitleLinesEditor.tsx`, `sectionLibrary.ts`.

New schema fields (all defaulted so existing pages render unchanged):
- Hero: `visual_layout` (`centred`|`half_bleed`), `secondary_cta_label`, `secondary_cta_url`, `visual_badge_label/title/text`, `underline_word`.
- Boxed: `cards[].variant` (`glass`|`dark`|`pillar`), `cards[].pillar`, `layout_mode` (`grid`|`list`), `cards[].meta`, `cards[].price`.
- Service tiers: `services[].cta_url` (default `/#contact` — fixes the hard-wire), `done_looks_like`, `start_here`.
- `note` + `note_handwritten` on process_steps, image_text, service.
- Named title accents (`brand`|`gold`|pillar) stored in `title_lines`; renderer keeps supporting legacy inline rgb (existing content is never migrated).
- Glass look: added as a Look preset (glass bg + radius) in the existing derived-look system — not a stored `layout.look` field (see Conflicts).
- Gold underline via `hand-underline.svg` stroke.
- Tests: schema/editor/renderer agreement per touched row type; field-diet test stays green; section-library entries for each new variant.

## Phase 4 — Global chrome (Epic B)

Files: `Navbar.tsx`, `Footer.tsx`, `pageMesh.ts`/`PageMeshLiquid.tsx`.

- Navbar restyle only (island radius 2.1rem, blur, `--line-2` border, `--shadow-soft`, link styles per `NavStates`); behaviour and breakpoints untouched. "Work" link added later via admin navbar settings, never hard-coded.
- Footer: three columns with pillar dots, existing content.
- Mesh: default colours/strength/grain per spec; `prefers-reduced-motion` static frame; pause off-screen.
- Tests: navbar behaviour tests unchanged; visual baseline refresh for chrome only.

## Phase 5 — Page restyles (Epic D), page by page

Files: page-level row components (`BoxedRow`, `ImageTextRow`, `FaqRow`, `Blog.tsx`, `BlogPost.tsx`, `MoreArticles.tsx`, `AllPostsButton.tsx`, profile/proof rows), `RowSection` spacing.

- Order: Homepage → Services index → six service pages → About → Blog index → Blog post → Privacy.
- Restyle existing rows to the artboards (grids, padding, radii, glass cards, dark problem card, pillar accents, wide first blog card, 760px reading column, glass privacy card). No rows added with artboard text; missing sections become section-library entries with neutral placeholders for Robert to place.
- Per page: text diff must be empty (see Proof below) before moving on; visual baselines refreshed for that page only, stated in the commit.

## Phase 6 — Work & proof (Epic E)

Migration (via Lovable): create `proof_points` and `work_items` exactly per spec §5.1 — **empty, no seeds**. RLS like `blog_posts`: public SELECT only `status='published'` / `approved=true`; writes need `is_admin()`; column privileges exclude `draft_case_rows` from anon; snapshot triggers like `trg_snapshot_blog_post`; both tables added to `run_scheduled_publishing`. Then regenerate types.

Files: `src/services/workItems.ts`, `proofPoints.ts` (mirror `blogPosts.ts`); `navigation.ts` new **Work** destination with sub-tabs Work items / Proof points; `WorkItemsManager`, `WorkItemEditor`, `ProofPointsManager`; a work adapter reusing `PageBuilderShell` for `case_rows` (like `BlogPostBuilder`); routes `/work`, `/work/:slug`; `WorkCard` (photo/number/dark/quote); new `work_teaser` widget (schema per §5.2, one block family, lazy editor); `proof_band` items gain optional `proof_id`; `prerender-seo.mjs` + sitemap + llms.txt + SEO checks.

- Acceptance: unpublished items never render; scheduled items appear at `publish_at`; alt required before publish; honesty label required for artefacts/playbooks; teaser hides when empty; linked numbers hide when unapproved; reorder changes `/work` order.
- Tests: teaser filtering/override fallback, proof-link hiding, RLS via existing patterns, schema agreement.

## Phase 7 — World map (Epic F)

Files: new `src/features/widgets/world_map/` (schema, `WorldMapRow.tsx`, lazy editor, index), `src/widgets/index.tsx`, `blockFamilies.ts` (Numbers family), `sectionLibrary.ts`, `public/` world-atlas 110m JSON, prerender script.

- Schema per §5.3; **defaults hold no countries** — Robert fills them. SVG paths/keyframes from `artboards/Main.dc.html`; d3-geo + topojson loaded dynamically only when the row mounts. Staggered fill on scroll into view, Replay button, reduced-motion end state, keyboard-reachable tooltip on worked countries only, counters as real text with optional `proof_id`.
- Tests: group resolution (last group wins), counter maths, code lookup, paste parsing, hover labels, schema defaults; visual baseline of the finished map.

## Phase 8 — Visual suite

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
8. **Blog extra rows publish instantly / old list editor** — noted as a known fault; I'll fix it in Phase 5 (Blog) only if you want it, since it touches publish behaviour.

## Proving no page text changed

- **Before Phase 3**, I take a database snapshot of all text-bearing fields (`cms_pages.page_rows`/`draft_page_rows`, `site_content`, `blog_posts`, FAQ/tiers/footer/navbar) and a rendered-text capture of every public page (via the prerendered HTML at 1440px).
- **After each phase**, I re-run both captures and diff: the DB diff must be empty (no content writes), and the rendered-text diff must be empty except where a phase intentionally adds chrome (e.g. the Work nav link, map legend labels you later fill in).
- Each Phase 5 page ships only with an empty diff for that page, and the diff report is included in the phase note.

Every phase ends with `npm run check` passing and a short note of what changed in the admin and on the site.
