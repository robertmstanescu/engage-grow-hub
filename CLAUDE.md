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
- Supabase changes (schema, RLS, edge functions) go through Lovable.
- `bun.lock` is the lockfile. Use `bun add` / `bun remove` for
  dependency changes so CI's `--frozen-lockfile` install passes.
- `npm run build` rewrites `public/sitemap.xml`, `public/llms.txt` and
  `supabase/functions/mcp/index.ts`; do not commit those side effects
  unless the change is intentional.
