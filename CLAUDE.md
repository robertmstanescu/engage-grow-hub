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
  `editors/rowLooks.ts`, never stored) and five controls; everything
  else lives under "Show all". Text colour is `layout.textTone`
  (Auto/Light/Dark/Accent, applied in RowSection); per-part colour
  pickers stay but every `ColorField` inside a row editor collects into
  the "Custom colours" group automatically (`site-editor/customColours`).
  Do not add colour pickers beside copy fields, and do not store a Look.
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
  page's colours show in both themes. The save bar is `AdminStickyBar`
  (small, centred, fixed).
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
  plain sentences under the headline that say what the page is, for
  whom and how the work happens. It renders visibly (never hidden text),
  and doubles as the search description and Service schema description
  when those are empty. Blog posts use their short summary the same way.
- The public bundle must stay free of admin code: widget editors are
  `lazy()`, dnd-kit lives only in `*Live.tsx` / `CellDropTargets.tsx`
  loaded inside a builder, icons load per name through
  `features/icons/Icon.tsx` (never import the `icons` map on a public
  path), and `vite.config.ts` groups vendor chunks by exact package
  names (a loose `/^react/` match created a chunk cycle once).
- Every picture upload goes through `services/imageShrink.ts`
  (`shrinkImage`: max 2400px long edge, WebP 0.82, in the browser) before
  it reaches Storage: Media, editor pictures, cover/picker fields, hero
  backgrounds. SVG, GIF, video and small files pass through. Serve with
  `transformImageUrl` (Supabase render/image) at the slot's width.
- Supabase changes (schema, RLS, edge functions) go through Lovable.
- `bun.lock` is the lockfile. Use `bun add` / `bun remove` for
  dependency changes so CI's `--frozen-lockfile` install passes.
- `npm run build` rewrites `public/sitemap.xml`, `public/llms.txt` and
  `supabase/functions/mcp/index.ts`; do not commit those side effects
  unless the change is intentional.
