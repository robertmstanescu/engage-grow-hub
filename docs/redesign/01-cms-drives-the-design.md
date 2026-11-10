# The Magic Coffin website: how the CMS drives the design

2026-10-12 · Robert-Marian Stănescu

## In short

Your CMS already works the right way for this redesign: every page is a list of rows saved as data, and the site paints each row with a matching component. So connecting the new design is mostly a matter of adding fields to rows that exist, adding three new row types, and putting colours, cards and type in one shared place. Nothing about the design needs a rebuild of the platform.

- **What already carries over:** the moving background, page content, service tiers, FAQ, blog, contact form, footer answer, drafts, publishing and version history.
- **What needs adding:** a Work collection with its own tables for work items and proof points, a work teaser row, a world map row, a half-bleed photo option on heroes, accent and dark options on cards and six pillar colours instead of four.
- **What needs fixing first:** seven wiring faults the code review found. The biggest: the hero ignores most of the Style tab, the brand colour and type settings in the admin change nothing on the site, and "Save" on a live page publishes without the alt-text check.
- **How we keep it honest:** each new field is defined once (a schema), read by both the admin form and the page, and covered by a test and a screenshot, so the admin and the site cannot drift apart.

The rest of this doc walks through how it works today, what good CMSs do, every design element from admin control to screen, and the order to build it in.

## How the CMS works today

I had the whole codebase read for this (the Lovable project plus the GitHub copy), so everything below is how it actually behaves, with file names for whoever builds it.

*[Embedded diagram: how an edit travels today · 7 steps]*

Every page is stored as a list of rows. The admin and the public site share one renderer, so what you see on the admin canvas is the real component, not a mock-up.

| Part | Where it lives | What it does |
|---|---|---|
| Pages | cms_pages (page_rows, draft_page_rows, status); homepage in site_content (page_rows) | Each page's rows, a live copy and a draft copy |
| Global settings | site_content: navbar, footer, branding, brand_settings, tags_config, blog_page | Menu, footer columns, logos, colours, category colours, blog header |
| Row shape | src/types/rows.ts | Row → columns → cells → widgets; each row has a layout (background, text tone, corners, edge shapes, height, cover image, page mesh) |
| Registry | src/widgets/index.tsx, src/features/widgets/<type>/ | Maps each row type to its renderer, editor, defaults and (for three types so far) a schema |
| Tray | builder/blockFamilies.ts | Groups the 19 types into eight families editors pick from |
| Style tab | editors/RowStyleTab.tsx, rowLooks.ts | Look (Plain, Card, Band, Cover), background, text tone, rounded top, edge shape, height |
| Page background | pageMesh.ts, meshLiquid.ts, PageMeshLiquid.tsx | The hero row's four colours drive the moving mesh behind the whole page |
| History | page_revisions, filled by database triggers on publish | Every published version kept; restore puts it back as a draft |
| Search | scripts/prerender-seo.mjs | Writes titles, descriptions, structured data, sitemap and llms.txt at build time |
| Guard rails | rowRegistry.test.ts, blockFamilies.test.ts, fieldDiet.test.tsx, the visual suite | Fail the build when a row type is half-wired, a form has too many fields, or a page looks different |

**Who can edit:** anyone listed in admin_users. Visitors can only read published rows; drafts never leave the database for them.

## What good block-based CMSs do, and what to borrow

I looked at how three well-regarded approaches connect editing to the page. Your CMS already follows the same pattern; the gaps are in how consistently it is applied.

| Practice | How others do it | Your CMS today | What to borrow |
|---|---|---|---|
| One schema per block | Payload defines every block as a slug plus a list of fields; the saved block carries its type, which decides how it renders ([Payload](https://payloadcms.com/docs/fields/blocks)) | Only 3 of 19 row types have a schema; the rest rely on hand-written defaults | Every new or touched row type gets a zod schema, so the form and the page read the same field list |
| Click to edit on the real page | Storyblok marks each block in the preview with an id, so clicking it opens the matching form, and edits show as you type ([Storyblok](https://www.storyblok.com/docs/concepts/visual-editor.md)) | Already there: the admin canvas is the real renderer, with inline text editing | Keep it; make sure new rows (map, work teaser) are editable on the canvas too |
| Drafts kept apart from live | Preview reads draft content with a token; visitors only ever get the published version (Storyblok, same page) | Draft and live columns on every table, but "Save" on a live page publishes, and the CMS preview link opens the live version | Make Save always mean draft; one Publish button; fix the preview link |
| Design tokens as one source | The W3C Design Tokens format (stable since October 2025) keeps colours, type and spacing in one file that design tools and code both read ([W3C](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)) | Colours live in index.css, Tailwind, brand_settings and inline colour spans in titles; the brand settings screen writes variables nothing reads | One token layer the admin edits and every row reads (section below) |
| Guard rails in the editor | Validation runs in the admin and on save; blocks that no longer fit are refused (Payload) | Alt text checked only on Publish; row cover images skipped | Check alt text on every save path, including cover images |
| Choices, not free styling | Editors pick from named variants rather than raw CSS | Looks (Plain, Card, Band, Cover) and an eight-field limit per form, enforced by a test | Add named variants (Dark card, Half-bleed hero, Pillar colour) instead of colour pickers |

## Every design element, from admin control to screen

Read each row left to right: what you touch in the admin, where it is saved, how the page uses it. **Exists** = works today, set it in the admin. **Change** = a field or option added to an existing row. **New** = a new row type or table. **Fix** = a wiring fault to repair first.

### Site-wide

| Design element | In the admin | Saved as | On the page | Status |
|---|---|---|---|---|
| Moving background | Page background panel on the hero row: four colours, strength, motion, grain | hero row layout.mesh | PageRows writes --mesh-c0…c3 on the page; the WebGL shader draws them | Exists; set the pillar tints per service page |
| Paper ground and glass cards | Look = Card on any row | one --surface-glass token | RowSection --row-surface | Change |
| Navigation with Work | Navigation settings | site_content.navbar links | Navbar.tsx as live: small emblem on desktop from 1024px, full logo on the compact mobile island below 1024px, tightens on scroll | Exists; keep the behaviour, restyle only (colours and type follow the new tokens); add the Work link in the admin |
| Footer with pillar dots | Footer settings | site_content.footer columns | Footer.tsx; dot colour from the pillar map | Change |
| Plain answer in the footer | Hero → Answer | hero data.answer | Footer "In plain words" and the page description | Exists; Fix: the build-time SEO script ignores it for CMS pages |
| Six pillar colours | One pillar picker wherever a colour belongs to a service | pillarColors.ts (6 entries) | Cards, service heroes, panels, footer dots, blog tags | Change: today 4 entries and only boxed cards read them |
| Fonts and type sizes | Design → Brand typography | brand_settings.typography | Nothing reads it today; Tailwind hard-codes the fonts | Fix: wire it to the --fs tokens or remove the control |
| Accent words in titles | Title editor → Accent | today an inline rgb colour inside title_lines | Prints that exact colour | Change: save a named accent (brand, gold, pillar) so a palette change flows everywhere |
| Handwritten notes | Note field + Handwritten switch | note, note_handwritten on each row | Architects Daughter line | Change: hero has it; add to steps, image + text, services |
| Gold underline | Underline word | data.underline_word | Hand-drawn stroke under one word | New field on hero and text rows |
| Images | Media library, alt text required | storage URL + alt fields | transformImageUrl with size and crop | Exists; Fix: row cover images skip the alt check, overlay uploads skip shrinkImage |

### Homepage

| Design element | In the admin | Saved as | On the page | Status |
|---|---|---|---|---|
| Hero with half-bleed photo and two links | Hero → Layout: Half-bleed; Second link | visual_layout, secondary_cta_label, secondary_cta_url | HeroView splits text and photo | New fields; Fix first: the hero ignores the Style tab |
| Before the coffin proof strip | Proof band row; Look = Band, deep plum | proof_band items, each typed or linked to proof_points | ProofBandRow | Exists; Change: optional proof_id per item |
| World map | World map row | world_map: groups, pins, motion, counters, view | WorldMapRow (SVG, CSS animation) | New row type (full spec in the redesign doc) |
| Six service cards | Boxed row; each card's accent colour or pillar | cards[].accent_color (+ pillar) | Top border, icon and title in the pillar colour | Exists; Change: pillar picker and dot |
| Clarity & order | Picture + text row | image_text, floating_caption | ImageTextRow | Exists |
| The work, with the lid off | Work teaser row: featured, by pillar, or all | work_teaser settings and per-card overrides; entries from work_items | WorkTeaserRow | New row type and two tables |
| Problem and fix | Boxed row; card variant Dark | cards[].variant | Deep plum card | Change |
| Vows, FAQ, contact | Boxed, FAQ and Contact rows | as today | as today | Exists |

### Service pages (one template, six pages)

| Design element | In the admin | Saved as | On the page | Status |
|---|---|---|---|---|
| Start-with badge on the photo | Hero → Badge label, title, text | visual_badge_label, visual_badge_title, visual_badge_text | Glass chip over the photo | New fields |
| Second title line in the pillar colour | Title editor → Accent: Pillar | named accent in title_lines | Pillar colour from the map | Change |
| Who this is for + first-call note | How we work row; Note, handwritten | steps[], note, note_handwritten | ProcessStepsRow | Change (note) |
| What good looks like panel | Picture + text; Background = Pillar colour; Text = Light | layout.bg_color, layout.textTone | RowSection paints it | Exists once the pillar colour is in the palette |
| Engagement tiers | Services row: per tier name, subtitle, time, description, note, tag, deliverables, plus Done looks like and Start here | services[] + done_looks_like, start_here | ServiceCard | Change; Fix: the tier button is hard-wired to /#contact, and dark backgrounds are guessed from the colour string |
| Work in this area | Work teaser row, Pillar = this page | work_teaser.pillar = page | Hides itself when empty | New |
| FAQ and From the blog | FAQ row; From the blog with categories | as today | as today | Exists |

### Other pages

| Design element | In the admin | Saved as | On the page | Status |
|---|---|---|---|---|
| Services index list | Boxed row → Layout: List; per card tier line and starting price | boxed layout, cards[].meta, cards[].price | Numbered list rows | Change |
| About: profile, proof, cards | Profile, Proof band, Boxed rows | as today; proof band items can link to proof_points | as today | Exists; Change: optional proof_id per item |
| Blog index: chips and lead card | Blog page settings; Category colours | blog_page, tags_config | Blog.tsx | Change: wide first card; Fix: the blog's extra rows use the old list editor and publish instantly |
| Blog post: CTA and Keep reading | Rows below the article | blog_posts.page_rows | CTA band and From the blog rows | Exists |
| Work index and case studies | New Work destination: Work items, Proof points | work_items (default cards); numbers typed or linked to proof_points | /work and /work/:slug | New (database change through Lovable) |
| Privacy | Text row | as today | as today | Exists |

## The design tokens layer: one place for the look

Today the look is spread over four places that do not talk to each other: CSS variables in src/index.css, colours and fonts in tailwind.config.ts, the brand_settings row the admin edits, and colours typed straight into titles. The fix is one token layer that the admin writes and every row reads.

| Token group | Examples | Edited in | Read by |
|---|---|---|---|
| Ground and ink | --paper #FAF8F5, --ink #26142E, --heading #481C5F, --body #5C4965 | Design → Brand (admin) | Every row via RowSection and Tailwind |
| Emphasis | --deep #2A0E33 (deep plum bands), --gold-text #815E18, --gold-decor #E5C54F | Design → Brand | Bands, eyebrows, underline, pins |
| Pillar colours | --pillar-ic … --pillar-mgr (six) | Design → Pillars | Cards, panels, heroes, footer dots, blog tags, the world map |
| Surfaces | --surface-glass, --surface-line, --radius-card 24px, --radius-pill | Code (rarely changes) | Card look on every row |
| Type | --fs-* sizes, the three families | Code, with the admin choosing between named scales | Headings, body, handwritten notes |
| Page mesh defaults | four default colours, strength, grain | Design → Page background | Pages whose hero sets none |

- **How it flows:** the admin saves brand_settings; applyBrandCSSVars (already in the code) writes the variables on the page; Tailwind and RowSection read those variables instead of fixed hex codes. That last step is what is missing today.
- **Accent words:** titles store a name (brand, gold, pillar) instead of a colour, and the name maps to a token. Change a colour once and every heading follows.
- **Format:** keep a tokens.json in the repo in the W3C Design Tokens format, generated from the same values. It lets the design system, the canvas and the code share one list.
- **Contrast stays safe:** each token pair (text on ground) is checked in a unit test against WCAG AA, so nobody can pick gold text on paper by accident.

## The editing experience

The aim: you change anything on the site from the admin, see it exactly as visitors will, and can't break the look by accident.

- **What you see is the page.** The admin canvas already uses the public renderer. Every new row (world map, work teaser) and every new option (half-bleed hero, dark card, pillar accent) renders on the canvas too, animation included, with a "play animation" button where motion matters.
- **Pick, don't paint.** New options arrive as named choices: Layout (Card or Half-bleed), Card style (Glass or Dark), Accent (Brand, Gold or a pillar). Raw colour pickers stay in "Custom colours", as the code's rules already require.
- **Eight fields up front.** Each row's form keeps its eight most-used fields visible and tucks the rest under More, which a test already enforces.
- **Sensible defaults.** A new row arrives filled with the redesign's look and copy placeholders, so an empty page never looks broken. Pre-designed rows (the homepage proof strip, the map, the problem and fix block) go into the section library for one-click reuse.
- **Save means draft, Publish means live.** One rule everywhere: autosave and Save write the draft; only Publish changes the live site, runs the alt-text check and refreshes the cache. Preview always opens the draft.
- **Undo and history.** Undo and redo stay on the canvas; every publish keeps a revision you can restore as a draft.
- **The Work tab.** Works like the Blog tab: a list, a form per entry with the fields from the portfolio template sheet, draft and publish, cover image with required alt text. Entries appear on /work, on the homepage teaser and under "Work in this area" automatically by pillar.
- **The world map editor.** Country groups with colour, legend and counter; search, paste or click countries on the preview; pins by city search; motion settings. Full spec in the redesign doc's World map section.

## Wiring faults to fix first, and how we keep the admin and site in sync

### Found in the code today

| Fault | What goes wrong for you | Fix |
|---|---|---|
| The hero skips the row wrapper (RowSection) | Text tone, edge shapes, rounded corners and outlines on a single hero do nothing; the homepage hero stores a rounded bottom edge nobody sees | Wrap HeroRow in RowSection like every other row |
| Brand colours and type are written but never read | Changing them in Design → Brand changes nothing on the site | Point Tailwind and RowSection at the brand variables (tokens section) |
| "Save" on a live page publishes | Edits go live without the alt-text check and, on the homepage, without refreshing the cache | Save always writes the draft; only Publish goes live |
| Preview link opens the live page | On CMS pages the Preview button shows the published version, not your draft | Use the same preview parameter everywhere |
| Search description ignores the plain answer | Google sees an empty description on pages without a meta description | Prerender falls back to the hero answer, as the page already does |
| Four of six pillars known | Pay Transparency and Manager Enablement get no colour and no screenshot test | Six entries in pillarColors.ts; add both pages to the visual suite |
| Gaps in the image rules | Row cover images skip the alt check; overlay uploads skip shrinkImage | Add both to the checks |

Smaller ones for later: the blog's extra rows use the old list editor and publish instantly; the service tier button is hard-wired to /#contact; dark backgrounds on the services row are guessed from the colour text; the llms-txt function logs to a table that does not exist.

### Keeping them in sync from now on

- **One schema per row.** The schema is the single list of fields: the form, the renderer and the defaults all come from it, so a renamed field is a build error, not a blank card.
- **Unit tests** for the new logic: map groups and counters, pillar lookups, token contrast, work teaser filtering.
- **Screenshots of every row on every page,** all six service pages included, compared on each change. The suite runs against live data, so content edits also show up as differences: keep a fixed test page with frozen sample content for the design checks.
- **A check that every field the page reads can be edited in the admin,** and the other way round. The code review found several orphans (hero image crop, row paddings, carousel theme), which this catches.
- **One build, one gate:** npm run check plus the visual suite on every change, as now.

## Work items and proof points

Work cases and proof numbers get their own home in the database and their own place in the admin, the same way blog posts work today. Each work item holds a default card. Every page that shows it can pick a different card style and rewrite any field on the card for that page only, so the homepage, a service page and the Work page can each show the same case their own way. Numbers can be typed straight onto a card or linked from a proof library, card by card. The admin screens are drawn on the design canvas, in the third row.

### How it fits together

| Layer | Work items | Proof points |
|---|---|---|
| Database | New table `work_items`, one row per case, artefact or playbook | New table `proof_points`, one row per number |
| Admin | New "Work" destination in the sidebar, sub-tab "Work items": a list you can drag to reorder, plus an editor for the default card with a live preview. On any page, the Work teaser row's panel picks the items and restyles or rewrites each card for that page | Same destination, sub-tab "Proof points": an optional library with an Approved switch and a "Used in" column |
| Public site | Work page, case study pages, a new "Work teaser" widget for the homepage and service pages | The existing `proof_band` row, work card numbers, case study "At a glance" strip, the world map counter |

### The data

`work_items` follows the shape of `blog_posts`, so it reuses the same publishing, scheduling and version history:

| Field | What it holds | Notes |
|---|---|---|
| `slug` | The address, e.g. `town-halls` → /work/town-halls | Unique; locked once published (a redirect is added if it changes) |
| `type` | `case`, `artefact` or `playbook` | Drives the tag on the card and the Work page filter |
| `pillar` | `ic`, `ex`, `ops`, `hrbp`, `pay` or `mgr` | Drives the pillar dot, the filter and which service page shows it |
| `title`, `summary` | Card heading (72 characters max) and one sentence (140 max) | The title is also the case study H1 |
| `metric`, `metric_label`, `proof_point_id` | The headline number on the default card | Type `metric` for this card, or set `proof_point_id` to link a library number instead; `metric_label` is always free text |
| `card_style` | The default card style: `photo`, `number`, `dark` or `pull` | Used on the Work page; any page can choose another |
| `pull_line` | One short line for the pull-line style | Optional |
| `honesty_label` | E.g. "Illustrative example, not client work" | Required for artefacts and playbooks |
| `cover_image`, `cover_image_alt` | From the media library | Alt text required before publishing |
| `link_out` | For live artefacts | The card opens the original instead of a case study |
| `has_case_study`, `case_rows`, `draft_case_rows` | The case study body, built from page rows | Same row model as service pages, so it opens in the page builder |
| `case_proof_ids` | Proof points for the "At a glance" strip | An ordered list |
| `featured_home`, `sort_order` | Homepage teaser switch and the order on the Work page | Up to three featured |
| `status`, `published_at`, `publish_at`, `expiry_at` | Draft, published, scheduled | Uses the existing `run_scheduled_publishing` job |
| `meta_title`, `meta_description`, `og_image` | Search fields | Checked by the SEO panel like any page |

`proof_points` is small on purpose:

| Field | What it holds |
|---|---|
| `value` | The number as shown: "~60%", "36", "300K+" |
| `label` | What it measures: "average live Town Hall attendance" |
| `source_note` | Where it comes from, for you only: "In-house record, Town Hall analytics" |
| `approved` | Only approved numbers can be linked; switching it off hides the number from the spots that link to it. Typed numbers are never touched |
| `pillars`, `sort_order` | Optional tagging and order in pickers |

Both tables get the same security rules as `blog_posts`: anyone can read published or approved rows, and only admins (the existing `is_admin()` check) can write. Both get a snapshot trigger, so the admin's Version history covers them.

### Where each field lands on the site

| Place on the site | Reads from | Rule |
|---|---|---|
| Work page (/work) | `work_items` where published | Each item's default card in its `card_style`, ordered by `sort_order`; pillar and type filters built from the data |
| Homepage "The work" | A Work teaser row | The row lists the items and holds this page's style and wording for each card |
| Service page "Work in this area" | A Work teaser row | Either the newest items of that pillar in their default cards, or items picked by hand with per-card changes |
| Case study page (/work/:slug) | `work_items.case_rows` | Rendered by the normal row renderer; the "At a glance" strip reads `case_proof_ids` |
| Card number | The card's typed number, or `proof_points` when linked | A linked number hides if its proof point is unapproved |
| Homepage strip, About proof band | Each strip item: typed, or linked to `proof_points` | `proof_band` items gain an optional `proof_id`; items without one work exactly as today |
| World map counter | The "36" proof point | Optional; the country list itself stays in the map row |

### The Work teaser widget

A new block family next to `from_the_blog`. The row stores your choices for that page, and anything you leave alone comes from the item's default card when the page renders, so fixing a typo on the item fixes every page that did not rewrite that field.

| Setting | What it does |
|---|---|
| `eyebrow`, `title`, `link_label` | The row's own heading and link ("The work", "Work in this area", "All work") |
| `mode` | `auto`: the newest items of a pillar or the featured items, in their default cards. `picked`: you choose the items and their order |
| `pillar`, `types`, `limit` | For `auto` mode; the pillar fills in on a service page |
| `default_style` | The card style for every card in the row unless a card says otherwise |
| `items[]` | For `picked` mode, one entry per card: `work_item_id`, `style`, and `overrides` with any of `title`, `summary`, `metric`, `metric_label`, `proof_point_id`, `pull_line`, `image`, `image_alt`, `link_text`, `hide_image` |

A "Reset to the item's default" button clears one card's overrides. The panel marks edited cards, so you can see at a glance which ones differ from the default.

### Card styles

| Style | Looks like | Good for |
|---|---|---|
| Photo | Image on top, tags, title, summary, number at the foot (today's card) | Most cases |
| Number | No image; one big number in the pillar colour, the label, then the title | Proof-led cases |
| Dark | Revolver background, small image, gold number | One standout card in a row |
| Pull line | Gold-tinted card with one short line in large type, then the title | Playbooks and artefacts |

A wide style (image left, text right, two columns) can follow later as a fifth.

### Checks the admin runs before publishing

- Alt text on the cover image.
- A typed number is flagged for a quick check (it is fine, it just is not in the library); a linked number must be approved.
- An honesty label on every artefact and playbook.
- No client names and no redundancy or restructuring wording: a simple word list (clients, redundancy, restructuring round) that warns, never blocks.
- The voice word list (actually, quietly, exactly, Oxford comma before "and") as a warning, the same list the copy deck used.
- Title and summary lengths, meta title 50 to 60 characters, meta description 150 to 160.

### Search and AI search

- /work and every /work/:slug go into the prerender, the sitemap and llms.txt.
- Case studies emit `Article` structured data with you as author (`Person`) and `BreadcrumbList` (Home › Work › title).
- The Work page emits an `ItemList` of the published items.
- Proof points render as real text, never images, so crawlers and AI engines can read the numbers.

### Moving today's content in

- Seed `proof_points` with the six approved numbers: 36 countries, ~500 people supported, ~300 hires, ~60% Town Hall attendance, 300K+ page views, 70%+ eNPS participation.
- Seed `work_items` with the 21 entries from the portfolio template sheet, as drafts, with their numbers typed in. Each goes live when you finish its answers in the sheet and press Publish.
- Leave the homepage strip and the About proof band as typed numbers; link any of them to the library whenever you want.

### Where it sits in the build order

This is steps 5 and 6, after the world map row and before the visual suite: step 5 adds the two tables, and step 6 the admin, the Work page, the case study pages and the teaser, which all depend on them. It needs one database migration, which Lovable or Claude Code can run.

### Prompt for Claude Code (to send once the copy is final)

```markdown
Add work items and proof points to the CMS for themagiccoffin.com.

1. Migration: create `proof_points` (id uuid pk, value text, label text, source_note text, approved bool default false, pillars text[], sort_order int, timestamps) and `work_items` (id uuid pk, slug text unique, type text check in ('case','artefact','playbook'), pillar text check in ('ic','ex','ops','hrbp','pay','mgr'), title text, summary text, metric text, metric_label text, proof_point_id uuid references proof_points (optional), card_style text default 'photo', pull_line text, honesty_label text, cover_image text, cover_image_alt text, link_out text, has_case_study bool, case_rows jsonb, draft_case_rows jsonb, case_proof_ids uuid[], featured_home bool, sort_order int, status text, published_at, publish_at, expiry_at, meta_title, meta_description, og_image, timestamps). RLS like blog_posts: public select where status = 'published' (work_items) or approved (proof_points); all writes require is_admin(). Add snapshot triggers like trg_snapshot_blog_post and include both tables in run_scheduled_publishing.
2. Services: src/services/workItems.ts and src/services/proofPoints.ts, mirroring src/services/blogPosts.ts.
3. Admin: add a "Work" destination to src/features/admin/navigation.ts with sub-tabs "Work items" and "Proof points". Build WorkItemsManager (drag-to-reorder list, filters, featured toggle) and WorkItemEditor (default card fields, card style, number typed or linked, ImagePickerField + ImageAltInput, live card preview, SchedulePublishPanel, pre-publish checks). "Edit case study" opens PageBuilderShell on case_rows, the way BlogPostBuilder does for posts. ProofPointsManager shows a computed "Used in" list per number.
4. Public: routes /work and /work/:slug. Work page with pillar and type filters. Case study page renders case_rows through the row renderer, with an "At a glance" strip from case_proof_ids. New widget family `work_teaser` (schema in zod/mini like from_the_blog) with mode auto/picked, default_style and items[] with per-card style and overrides that fall back to the item's default card field by field; its inspector panel lists the cards, marks edited ones and has a reset per card. A WorkCard component renders the four styles (photo, number, dark, pull). Extend `proof_band` items with an optional proof_id.
5. SEO: add both routes to scripts/prerender-seo.mjs, the sitemap and llms.txt; Article + Person + BreadcrumbList for case studies, ItemList for /work.
6. Seed the six approved proof points and the 21 work items (as drafts) from the attached data file.
Match the design artboards AdminWork, AdminWorkEdit, AdminProof and AdminTeaser on the canvas. Fully comment the code and add error handling and tests next to the existing ones.
```

## Build order

Each step is one pull request, checked against the canvas with side-by-side screenshots before it merges. Copy lands last, once the master copy deck is approved.

| # | Step | Who | Depends on |
|---|---|---|---|
| 1 | Fix the wiring faults: hero in RowSection, Save means draft, preview link, prerender answer, image checks | Claude Code | Nothing |
| 2 | Token layer: brand variables read by Tailwind and RowSection, six pillar colours, glass surface, named accents in titles | Claude Code | 1 |
| 3 | Card and hero options: half-bleed hero, badge, second link, underline word, dark card, pillar picker, list layout, handwritten notes, tier fields | Claude Code | 2 |
| 4 | World map row | Claude Code | 2 |
| 5 | Work items and proof points: two tables (work_items, proof_points), access rules and snapshot triggers (see the section above) | Lovable (database rule) | Nothing |
| 6 | Work destination in the admin (Work items, Proof points), /work, /work/:slug, the Work teaser widget with per-page card styles and overrides, plus an optional proof_id on proof_band items | Claude Code | 5 |
| 7 | Visual suite: all six service pages, frozen test page, new baselines | Claude Code | 3, 4, 6 |
| 8 | Copy: apply the approved master copy deck in the admin | You, or me through the browser | Deck approved |

When you have the copy, I'll write the Claude Code prompts for steps 1 to 4, 6 and 7, each with the exact schema, files to touch and tests, and the short Lovable prompt for step 5.

## Sources

- Your codebase: Lovable project engage-grow-hub and its GitHub copy (robertmstanescu/engage-grow-hub), read 12 Oct 2026; files named in each section.
- [Payload CMS: Blocks field](https://payloadcms.com/docs/fields/blocks)
- [Storyblok: Visual editor](https://www.storyblok.com/docs/concepts/visual-editor.md)
- [W3C Design Tokens Community Group: first stable version, 28 Oct 2025](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
