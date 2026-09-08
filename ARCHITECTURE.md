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
  features/admin/        Admin app (lazy Admin chunk). site-editor/ and
                         editors/ hold one editor per row type; inspector/
                         and builder/ are the canvas UI; FieldComponents.tsx
                         and CoverImageField.tsx are the shared field groups.
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
