# Nested Page Builder — Production Data Migration

User Story 7.1. Converts every legacy `PageRow` stored in `site_content` and
`cms_pages` into the new nested `PageRowV2` shape (rows → columns → widgets).

## What gets touched

| Table          | Column(s)                                      |
|----------------|------------------------------------------------|
| `site_content` | `content.rows[]`, `draft_content.rows[]`       |
| `cms_pages`    | `page_rows[]`, `draft_page_rows[]`             |

No schema changes. The columns are `jsonb`; only the row objects inside the
arrays are rewritten. Anything that is already v2 (`schema_version === 2`)
is skipped — both forward and rollback are **idempotent**.

## How a row is transformed

A legacy row like:

```jsonc
{ "id": "abc", "type": "text", "strip_title": "Intro", "bg_color": "#fff",
  "content": { "body": "…" }, "columns_data": [{ "body": "second col" }] }
```

becomes:

```jsonc
{ "id": "abc", "schema_version": 2, "strip_title": "Intro", "bg_color": "#fff",
  "column_layout": "50-50",
  "columns": [
    { "id": "<uuid>", "widgets": [{ "id": "<uuid>", "type": "text", "data": { "body": "…" } }] },
    { "id": "<uuid>", "widgets": [{ "id": "<uuid>", "type": "text", "data": { "body": "second col" } }] }
  ] }
```

Logic mirrors `migrateRowToV2()` in `src/types/rows.ts`, so admin and
frontend renderers behave identically before and after the migration.

## Running

### TypeScript runner (recommended — uses the same code as the app)

```bash
# Required env (service role key required because we mutate every row):
export SUPABASE_URL=…
export SUPABASE_SERVICE_ROLE_KEY=…

# Dry-run (prints diff counts, writes nothing):
bun run scripts/migrations/2026_07_nested_rows_forward.ts --dry-run

# Real run:
bun run scripts/migrations/2026_07_nested_rows_forward.ts

# Rollback (only rows whose `schema_version === 2` AND that contain a single
# widget per column will be reverted; mixed-widget rows have no legacy
# representation and are intentionally left alone — see rollback notes).
bun run scripts/migrations/2026_07_nested_rows_rollback.ts --dry-run
bun run scripts/migrations/2026_07_nested_rows_rollback.ts
```

### Pure SQL alternative (for DBAs without Node)

```bash
psql "$DATABASE_URL" -f scripts/migrations/2026_07_nested_rows_forward.sql
psql "$DATABASE_URL" -f scripts/migrations/2026_07_nested_rows_rollback.sql
```

The SQL versions wrap everything in a transaction. If anything fails, the
migration aborts and nothing is committed.

## Pre-flight (mandatory)

1. **Snapshot first.** Take a logical dump of `site_content` and `cms_pages`:
   ```bash
   pg_dump --data-only -t site_content -t cms_pages "$DATABASE_URL" \
     > backups/pre_nested_rows_$(date +%F).sql
   ```
2. Restore that dump on a staging branch.
3. Run the migration on staging, then visually diff the staging site
   against production. The QA criteria for US 7.1 require pixel parity.
4. Only then run the migration in production.

## Rollback notes

- Rollback only inverts rows that originated from the migration: one widget
  per column, all of the same `type`. Such rows are reduced back to the
  legacy `{ type, content, columns_data }` shape.
- Mixed-widget rows (e.g. an image and a contact form in the same row)
  cannot be expressed in the legacy schema — they are left as v2 and the
  rollback report lists them. This is intentional: there is no way to
  flatten new content built after the migration without data loss.
- For full point-in-time recovery, restore from the snapshot taken in
  step 1 of the pre-flight.
