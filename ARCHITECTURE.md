# Architecture — engage-grow-hub (The Magic Coffin)

One page on how this codebase is organised, how to extend it, and what
gate every change must pass. Written for whoever edits the code next,
human or agent (Lovable, Claude). If you change the structure, change
this file in the same PR.

## Stack and layout

Vite + React 18 + TypeScript, Tailwind + a handful of shadcn wrappers,
Supabase (Postgres, auth, storage, edge functions), zod/mini for content
schemas. Lovable's agent pushes straight to `main`; `.github/workflows/`
is the only gate.

```
src/
  pages/                 Route components (Index, CmsPage, Blog, Admin…)
  features/site/         Public site. rows/ holds one renderer per row type
                         (BoxedRow.tsx, HeroRow.tsx, …) plus PageRows →
                         RowRenderer → CellRenderer → WidgetNode, the
                         engine that paints a page from stored JSON.
  features/admin/        Admin app (lazy Admin chunk). AdminDashboard.tsx is
                         the shell (icon rail + topbar); navigation.ts is the
                         one list of destinations, sub-tabs and legacy URL
                         redirects. site-editor/ and editors/ hold one editor
                         per row type; inspector/ and builder/ are the canvas
                         UI (every page, Home included, opens there);
                         FieldComponents.tsx and CoverImageField.tsx are the
                         shared field groups; ui/ActionMenu.tsx is the row
                         quick-actions menu used by Pages and Blog.
                         editors/RowStyleTab.tsx opens with a derived Look
                         (editors/rowLooks.ts) and five controls; row editors
                         collect their ColorFields into one "Custom colours"
                         group (site-editor/customColours.tsx). DesignScreen
                         is Brand + Site defaults beside a live sample page.
                         builder/blockFamilies.ts groups the widget types
                         into the eight tray families; builder/sectionLibrary.ts
                         holds the pre-designed rows; MoreFields keeps a block
                         editor to eight primary fields. builder/useRowHistory
                         (undo/redo) and builder/useAutosave wrap the shell's
                         row setter and the adapters' quiet draft save;
                         EditableText + CanvasEditable edit text on the canvas.
  features/widgets/      Self-registering widget modules — one folder per
                         type (boxed/, contact/, cta-button/, subscribe/).
                         The target shape for every row type.
  widgets/index.tsx      Boot-time registration: imports the modules above
                         and registers the not-yet-migrated types inline.
  lib/WidgetRegistry.tsx The registry: type → { schema, defaultData, render,
                         adminComponent, label, icon }. renderWidget() is the
                         render boundary; parseWidgetContent() validates.
  lib/mcp/               Source the @lovable.dev/mcp-js Vite plugin bundles
                         into supabase/functions/mcp/index.ts. Keep.
  types/rows.ts          ROW_TYPES (the one list of row types) and the
                         row/column/cell/widget shapes.
  services/, hooks/      Supabase access and shared hooks.
supabase/functions/      Edge functions. Change through Lovable, not here.
scripts/prerender-seo.mjs  postbuild only — rewrites dist/index.html per page.
tests/visual/            Playwright screenshot suite + per-OS baselines.
```

## The row pipeline

A page is stored as JSON rows (`cms_pages.page_rows`, or the homepage's
`site_content` row). Rows have been stored in three shapes over time
(v1 flat, v2 columns/widgets, v3 columns/cells/widgets); renderers only
ever see v3 because everything goes through `normalizeRowsToV3` first.
A widget's `type` selects a registry entry; its `data` is the `content`
the renderer and editor read.

```
stored JSON → normalizeRowsToV3 → RowRenderer → CellRenderer → WidgetNode
            → renderWidget(type)  ──→ parseWidgetContent (schema) → <Row/>
Admin: RowTypeEditor(type) → registry adminComponent, else ROW_TYPE_EDITORS
```

`parseWidgetContent` never throws: valid content comes back with
defaults filled; invalid content renders with `defaultData` merged in
and, in development, a console warning naming the row and the bad path.

## How to add a row type

Copy `src/features/widgets/boxed/` — it is the reference implementation.

1. `src/types/rows.ts`: add the type name to `ROW_TYPES`.
2. `src/features/widgets/<type>/schema.ts`: a `zod/mini` `looseObject`
   with every field defaulted. Export the inferred `…Content` type and
   `…_DEFAULTS = schema.parse({})`. Use zod/mini, not zod: the schema
   ships in the public bundle.
3. The renderer (`src/features/site/rows/<Type>Row.tsx`) and the editor
   (`src/features/admin/site-editor/<Type>Editor.tsx`), both typed from
   the schema. Reuse the shared field groups (`EyebrowField`,
   `NoteField`, `CtaFields`, `CoverImageField`, `ColorField`…).
4. `src/features/widgets/<type>/index.tsx`: one `registerWidget({ type,
   label, icon, category, schema, defaultData, render, adminComponent })`.
   Load the editor with `lazy()` so it stays out of the public bundle.
5. `src/widgets/index.tsx`: one `import "@/features/widgets/<type>"`.

Then `npm run check`. `rowRegistry.test.ts` fails with a message naming
the missing piece if any of the above is skipped, and fails if a type
has two editors (registry and the fallback map).

Migrating an existing type is the same list, minus steps 1 and 3, plus
deleting its inline `registerWidget` in `src/widgets/index.tsx` and its
entry in `ROW_TYPE_EDITORS` (RowTypeEditor.tsx).

## How to add a field to a row type

1. Add it to the type's `schema.ts` with a default.
2. Read it in the renderer; edit it in the editor. Both are typed from
   the schema, so a typo is a compile error.
3. For a type not yet migrated (no schema), add the key in the renderer,
   the editor and the inline `defaultData` in `src/widgets/index.tsx`.

Field naming: `color_<thing>` for colours (`color_title`, `color_note`);
`cta_label` / `cta_url` / `note` for the standard call-to-action group;
`cover_image` / `cover_image_alt` for the row cover. Do not invent a
second spelling for an existing concept.

## The gate

`npm run check` = typecheck + lint + unit tests + production build.
CI (`.github/workflows/check.yml`) runs it on every push to `main` and
every PR, then runs the visual suite.

- **Lint is a ratchet.** `eslint . --max-warnings N` in package.json; N
  is the current count and may only go down. Lower it in the PR that
  removes warnings. `no-explicit-any` is the bulk; typing content from
  a schema removes it.
- **Visual suite** (`npm run test:visual`, `tests/visual/`) screenshots
  every row on every public page against a committed baseline.
  Baselines are per OS: `darwin` for local runs, `linux` for CI. After
  an intentional design change run `npm run test:visual:update`
  locally for `darwin`, and the `visual-baseline` workflow (Actions →
  Run workflow on your branch) for `linux`; it commits the new PNGs to
  the branch. It also runs by itself on PRs that touch `tests/visual/`.
  Never refresh a baseline to make an unexpected red job green.
- **strictNullChecks** is on. `noImplicitAny` is not yet.

## Conventions and things not to touch

- Lockfile is `bun.lock` (Lovable builds with bun); `package-lock.json`
  is git-ignored. Locally `npm install` or `bun install` both work.
- `.env` is tracked on purpose: it holds only the public Supabase URL,
  project id and publishable key.
- Supabase schema, RLS and edge-function changes go through Lovable.
- `src/lib/mcp/` looks unused but is compiled into the MCP edge
  function by the Vite plugin.
- `scripts/prerender-seo.mjs` runs `postbuild` only. Do not wire it to
  `predev`/`prebuild`; it needs `dist/` and hits the database.
- `playwright.config.ts` belongs to Lovable's test runner; the visual
  suite has its own `playwright.visual.config.ts`.
- Brand colours for the four service pillars live in
  `src/lib/constants/pillarColors.ts` and nowhere else.

## Admin editing surfaces (Phase 4b)

- **Title**: `site-editor/TitleEditor.tsx` is one TipTap box for the whole
  title; `titleHtml.ts` joins/splits `title_lines: string[]` so storage
  and renderers are untouched. `editors/TitleLinesEditor.tsx` is the entry
  point every row editor uses (Hero, Text, Boxed, Grid, Image + Text,
  Profile, Contact, legacy RowsManager).
- **Body**: `RichTextEditor.tsx` shows Bold, Italic, Link, Heading, List,
  Quote, Colour, Picture; everything else sits in the More menu.
- **Media**: `MediaGallery.tsx` is a tile grid with folder chips, a filter
  box and a details panel that opens on selection. Upload asks for alt
  text before the file is sent (`pending` state); tiles without alt text
  carry a flag.
- **Corners**: `.admin-light/.admin-dark` set `--radius: 6px`;
  `.admin-canvas` restores the site's 1.5rem. `squareCorners.test.ts`
  blocks new pills outside swatches, dots, toggles and avatars.

## Blog posts: article first

`blog_posts.content` is the article and the only copy of its words. The
`article` row type (`src/features/widgets/article/`) renders that HTML
as a centred reading column, reading it from `ArticleContext`, which
`BlogPost.tsx` (public) and `BlogPostBuilder.tsx` (canvas) provide.
`postRows.ts` keeps exactly one article row in a post: a post with no
rows renders `[article]`; the builder seeds `[article]` and puts the
block back if a change removes it. The tray offers the Article block
only inside a post (`BlockVariant.postsOnly`). Rows are extras placed
above or below the article.

## Analytics

`unified_analytics_logs` is written only by the edge function
`track-visitor`. The client (`hooks/useAnalyticsBeacon.ts`) beacons from
production hosts only (`services/analyticsGuards.ts`), never for an
excluded device or a logged-in admin, and sends a `viewId` plus browser
signals; `services/engagement.ts` reports foreground seconds, scroll
depth and interaction when the tab hides, on pagehide and on route
change. The function drops previews, inserts a view as "No engagement"
(a bot until it engages), flips it to Human on the engagement beacon,
flags automation signals, Lighthouse strings and fleets, and derives
the country from the browser time zone (`tzCountry.ts`). The dashboard
(`src/pages/AdminInsights.tsx`) reads through `services/engagementStats.ts`
(median time, read depth) and `services/channels.ts` (Search / Social /
Referral / Direct, counted in people).

