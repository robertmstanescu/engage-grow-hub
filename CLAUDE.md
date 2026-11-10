# Working in this repo

Read `ARCHITECTURE.md` first. It describes the row pipeline, the widget
registry, how to add a row type or a field, and the gate.

Rules that are easy to get wrong:

- Run `npm run check` before calling anything done. It is typecheck +
  lint + unit tests + build, and it is what CI runs.
- Lint warnings are capped (`--max-warnings` in package.json). Do not
  raise the cap; lower it when you remove warnings.
- A new row type is one folder under `src/features/widgets/<type>/`
  plus one import in `src/widgets/index.tsx`. `rowRegistry.test.ts`
  fails if the renderer, editor, schema or `ROW_TYPES` entry is missing.
- Reuse the shared editor fields in
  `src/features/admin/site-editor/FieldComponents.tsx` and
  `CoverImageField.tsx` instead of copying label + input blocks.
- Public rendering is guarded by screenshots (`npm run test:visual`).
  Refresh the baseline only after an intentional design change, and say
  so in the PR.
- Type sizes come from the `--fs-*` tokens in `src/index.css`, sized
  by viewport width only. Never put `vh` in a font-size clamp, never
  shrink copy with JavaScript to make a row fit a screen, and never
  size prose with a `text-xs`/`text-sm` utility. Paragraph spacing is
  the single `--para-space` token; line length is `.measure`.
- The admin has ONE navigation list: `src/features/admin/navigation.ts`
  (nine destinations, sub-tabs via `?tab=`, and `LEGACY_REDIRECTS` for
  old URLs). Do not add sidebar entries elsewhere. Every page opens in
  the canvas builder; there is no second list-based row editor. List
  rows get their actions from `ui/ActionMenu.tsx`.
- A row's Style tab opens with a Look (Plain/Card/Band/Cover, derived by
  `editors/rowLooks.ts`, never stored) and the everyday controls; everything
  else lives under "Show all". Text colour is `layout.textTone`
  (Auto/Light/Dark/Accent, applied in RowSection); per-part colour
  pickers stay but every `ColorField` inside a row editor collects into
  the "Custom colours" group automatically (`site-editor/customColours`).
  Do not add colour pickers beside copy fields, and do not store a Look.
- Rows float on the page mesh. Decorative edge shapes, the per-row ink
  outline and the dark footer band were retired with the redesign:
  `site/retiredDesign.test.ts` fails if `shapeTop`, `SectionShape`,
  `outlineWidth` or `.footer-dark` come back. Rows saved with those
  settings ignore them. The only curve a row draws is Style ▸ Corners.
- The world map's countries are the owner's list, kept in
  `widgets/world_map/ownerList.ts`. Never add or remove a country
  without his word; a market that is in neither worked list (Romania)
  is shaded and names itself on hover but stays out of the counters. The
  map zooms by narrowing its `viewBox` (`world_map/zoom.ts`); a plain
  wheel must keep scrolling the page. Main markets
  are drawn in Cobalt Blue (`--map-main`, #0047AB), his choice. The map art
  is generated (`scripts/world-map/build-map-data.mjs`, amCharts
  Mercator, no Antarctica); the "Map: amCharts" credit by the legend is
  the licence's condition and must stay. Small labels and eyebrows on
  light are pure black (`--gold-text`, `--hero-label`) and the named
  "gold" title accent is Revolver; a boxed card with a service colour is glass in that
  colour at a quarter strength (`.tint-card`, `--card-tint`). His choices of 10 Nov 2026.
- The tray shows eight block families (`builder/blockFamilies.ts`); a
  new row type must be added to exactly one family (the test fails
  otherwise) and the section library (`builder/sectionLibrary.ts`) is
  where pre-designed rows live, in code, not in the snippets table. A
  block's Content tab shows at most eight primary fields
  (`fieldDiet.test.tsx`): put the rest in `<MoreFields>` and mark list
  editors with `<SectionBox group>`.
- Builder ergonomics: every row change goes through the shell's
  `useRowHistory` (undo/redo, ⌘Z / ⇧⌘Z) and adapters offer a quiet
  `onAutosave` (draft only, no toast). Text on the canvas is edited
  in place through `EditableText` → `CanvasEditable` (double-click);
  `writeRowsAtPath` resolves v3 widgets by id and index-based list
  paths. Labels name the outcome (`glossary.test.ts` lists retired
  jargon); never reintroduce "Eyebrow", "Meta Title", "Publish All".
- Titles are ONE box (`site-editor/TitleEditor.tsx`, wrapped by
  `editors/TitleLinesEditor.tsx`): one line per row, formatting only on
  selection, stored unchanged as `title_lines: string[]`. Never add a
  per-line editor. The body editor shows eight controls and a More menu.
  Media is a grid of square tiles with alt text asked for on upload.
- Square boxes: the admin sets `--radius` to 6px, so `rounded-lg`/`-md`
  are the shell's corners. `rounded-full` and `rounded-xl+` are for
  swatches, dots, toggles and avatars only (`squareCorners.test.ts`).
- A post page follows the BlogPost artboard: a 920px header, the cover,
  then the article in a centred 720px column (`.article-column`).
  `ArticleRow` is deliberately not a RowSection: no card or background
  of its own. The author appears ONCE, in the line under the excerpt
  (picture, name, date, reading time); there is no author block under
  the article and no sidebar. The name, photo and LinkedIn all come from
  the admin's Profile screen (site content `author_profile`, publicly
  readable; `profiles` is not), resolved by `site/authorProfile.ts` with
  the post's own `author_name`/`author_image` columns as the fallback
  for anything written before that move, and the company page in
  `social_links` as the fallback for LinkedIn. The blog form does NOT
  ask for an author; never add those fields back to it.
  `scripts/prerender-seo.mjs` resolves the same way for the BlogPosting
  schema. A post that was never arranged in the builder ends with two
  default rows (`article/postRows.ts`, `defaultPostExtras`): the dark
  call-to-action band (`cta_band` with `band_style: "room"`, its words
  read from the site's `contact` content) and three more posts
  (`from_the_blog`, which leaves out the post being read). They are
  ordinary rows; a post with saved rows shows exactly what was saved.
  Dates on cards and posts go through `lib/shortDate.ts`.
- Recent posts are a row, not a page fixture: the `from_the_blog` row
  type (`src/features/widgets/from_the_blog/`) is placed on a page like
  any other block and edited there (heading, categories, how many,
  button text). Never hard-code a posts section into a page component.
  Every link to the blog index is the pill in
  `site/AllPostsButton.tsx` ("All blogs & insights"). With nothing to
  show the row paints nothing publicly but a note in the builder: a row
  that renders nothing is unclickable, so its settings could never be
  opened.
- A blog post IS its article. The `article` row type
  (`src/features/widgets/article/`) renders the post's `content` from
  `ArticleContext`; `ensureArticleRow` keeps exactly one in a post's rows
  (public page and builder). Never copy post HTML into a text row; rows
  are extras placed around the article.
- Admin colours come from tokens only (`hsl(var(--foreground))`,
  `--muted-foreground`, `--admin-accent`, `--admin-ok/warn/bad`);
  `adminTokens.test.ts` fails on any raw `hsl(…)` literal in
  `src/features/admin` or `src/pages/Admin*`. Editing surfaces
  (`RichTextEditor`, `TitleEditor`) render on `.admin-canvas` so the
  page's colours show in both themes. `RichTextEditor`'s toolbar is
  `sticky top-0`, so nothing in its box may clip: an `overflow-hidden`
  ancestor becomes the sticky scroll container and the bar rides off
  the top with the article. Round the bottom corners on the content,
  not the wrapper. The save bar is `AdminStickyBar` (small, centred,
  fixed).
- Analytics: the beacon (`hooks/useAnalyticsBeacon.ts`) fires only on
  the production hosts (`services/analyticsGuards.ts`), never for a
  device flagged "Exclude this device", and sends a `viewId` plus
  browser signals; `services/engagement.ts` reports foreground seconds,
  scroll depth and interaction on hide/pagehide/route change. In
  `track-visitor` a view starts as "No engagement" (is_bot = true) and
  becomes Human only when its engagement beacon arrives; previews are
  dropped; a fleet (>5 fresh visitor ids from one address + browser
  string in a day) is a bot. Do not count raw page views as humans.
- Every hero carries a "plain answer" (`content.answer`, edited on the
  hero block and under Insights → SEO checks, Home included): one or two
  plain sentences that say what the page is, for whom and how the work
  happens. The hero does NOT render it; the page passes it to `Footer`
  (`pageAnswer`), which shows it as small print under "In plain words"
  beside the Connect column. Visible text, never hidden; it doubles as
  the search description and Service schema description when those are
  empty. Blog pages pass nothing (owner's choice). A hero can also print
  it as an "In short" strip under the headline (`content.answer_strip`,
  on by default on service pages after the restyle).
- The public bundle must stay free of admin code: widget editors are
  `lazy()`, dnd-kit lives only in `*Live.tsx` / `CellDropTargets.tsx`
  loaded inside a builder, icons load per name through
  `features/icons/Icon.tsx` (never import the `icons` map on a public
  path), and `vite.config.ts` groups vendor chunks by exact package
  names (a loose `/^react/` match created a chunk cycle once).
- Every picture upload goes through `services/imageShrink.ts`
  (`shrinkImage`: max 2400px long edge, WebP 0.82, in the browser) before
  it reaches Storage: Media, editor pictures, cover/picker fields, hero
  backgrounds and branding (logo/emblem). SVG, GIF, video and small
  files pass through. Never add an upload path that skips it: a
  32767x6407 logo reached Storage that way and Supabase's transform
  answered 400 ("source image resolution is too large to process") for
  every sized URL, so the logo was broken on phones while the raw file
  still loaded; `Navbar`'s logo falls back to the untransformed file. Serve with
  `transformImageUrl` (Supabase render/image) at the slot's width, and
  pass `aspectRatio` whenever the box is known: Supabase keeps the
  SOURCE's pixel height when only a width is asked for (a 3457×2296
  photo at width=960 came back 960×2296), which showed as zoomed-in
  blog covers. Without a ratio the helper asks for `resize=contain`.
- Settings → Search engines is a guided setup: numbered steps, a button
  that opens the exact outside page, ticks the owner sets (remembered
  in `localStorage`) and ticks that set themselves (a key that reads
  correctly, `admin/serviceAccountKey.ts`). Keep the steps in words a
  non-developer can follow; never ask for anything but the key file.
- Search engines: `Settings → Search engines` connects Google Search
  Console (service-account JSON), Bing Webmaster (API key) and shows
  IndexNow. Keys live only in `integration_settings` (RLS, no policies;
  service role only) through the `search-console`, `bing-webmaster` and
  `indexnow` functions, all behind `_shared/adminGuard.ts`. Publishing
  a page or post pings IndexNow (`notifyIndexNow`). Never read that
  table from the client.
- Supabase changes (schema, RLS, edge functions) go through Lovable.
- `bun.lock` is the lockfile. Use `bun add` / `bun remove` for
  dependency changes so CI's `--frozen-lockfile` install passes.
- `npm run build` rewrites `public/sitemap.xml`, `public/llms.txt` and
  `supabase/functions/mcp/index.ts`; do not commit those side effects
  unless the change is intentional.
- The site sends no visitor email: contact is the Google Calendar booking
  block (`ContactRow`: embedded calendar, no inner scroll, plus a
  booking-page button), downloads are direct links, and there are no
  newsletter/sign-up boxes, contacts or campaigns. Never add an email
  form back. Admin login emails (auth-email-hook + process-email-queue)
  stay.
- Content is never trusted on its way to the page. A link that comes
  from a CMS field goes through `services/safeHref.ts`, custom CSS
  through `services/safeCss.ts`, stored HTML through `sanitizeHtml`, and
  a widget row reads its content with `lib/parseContent.ts` (it cannot
  throw on null or malformed data). `services/publicLinks.test.ts` fails
  on a raw content link, an unguarded `<style>` or a new-tab link without
  `noopener`/`noreferrer`. Only `calendar.google.com` may be embedded.
- Redesign data lives in `src/lib/redesign/`: `restyle.ts` changes
  layout and variants only and proves the text is unchanged;
  `gapContent.ts` holds new copy for sections the design added. Both are
  run by `scripts/redesign/build-restyle.ts` into SQL for DRAFT columns,
  which Lovable runs. Never write restyle data to a live column.
- Work (`/work`, `/work/:slug`) follows the Work and CaseStudy artboards:
  one glass card per piece (`site/WorkCard.tsx`, four styles), a type
  chip that is the honesty label (`site/work/WorkTypeChip.tsx`; names in
  `work/workLabels.ts`, never a second list), and a case study whose
  body is the item's rows inside `.case-body` (760px column,
  `RowsRenderer forceAlign="left"`, "On this page" sticky from 1024px
  and a closed `<details>` below). Only published items and APPROVED
  proof points reach the page. The Work link is navbar data: never
  hard-code it into the navigation.
- Cards in a line share their rows: the grid carries `.align-cards` and
  each card `.align-card` with `--slots` (CSS subgrid, `src/index.css`),
  so prices, text and buttons sit level whatever the title length. Every
  part must render (an empty one as `.align-empty`). On a tier card
  "What's inside" is a closed `<details>` and the note prints under the
  card, outside it. Q&A answers start closed (`start_open` turns that
  round) but stay in the HTML (`forceMount`). The booking calendar sits
  beside the copy (the block can say "Under the text"); on a phone the
  copy is centred. Headings are Funnel Display and the
  handwritten face is Playwrite Cuba (`'Playwrite CU'`); saved text and
  brand settings that still name Bricolage Grotesque or Architects
  Daughter are read as the new faces (`lib/typefaces.ts`).
- A page with no hero is a document page (Privacy): `CmsPage` lifts the
  first text block's small heading, title and date line above one glass
  card (`site/documentHeader.ts`, render-time only) and prints the body
  inside it on an 820px column.
