/**
 * User Story 7.1 — Rollback for the nested-rows migration.
 *
 * Reverts a `PageRowV2` back to the legacy `PageRow` shape WHEN AND ONLY
 * WHEN the v2 row was clearly produced by the forward migration:
 *   • every column contains exactly one widget, AND
 *   • all widgets share the same `type` (so a single legacy `type` field
 *     can represent the row).
 *
 * WHY the strict guard: rows authored after the migration may mix widget
 * types (e.g. an `image_text` widget next to a `contact` widget). The
 * legacy schema cannot express that without data loss, so we leave such
 * rows untouched and report them. For total recovery, restore the
 * pre-migration snapshot listed in scripts/migrations/README.md.
 *
 * Run:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun run scripts/migrations/2026_07_nested_rows_rollback.ts [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import {
  isPageRowV2,
  type PageRow,
  type PageRowV2,
} from "../../src/types/rows";

const DRY = process.argv.includes("--dry-run");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✖ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

interface Outcome {
  reverted: number;
  preserved: number; // v2 rows we intentionally left alone
  alreadyLegacy: number;
}

const isReducible = (row: PageRowV2): boolean => {
  if (row.columns.length === 0) return false;
  const firstType = row.columns[0]?.widgets[0]?.type;
  if (!firstType) return false;
  return row.columns.every(
    (c) => c.widgets.length === 1 && c.widgets[0]?.type === firstType,
  );
};

const v2ToLegacy = (row: PageRowV2): PageRow => {
  const datas = row.columns.map((c) => c.widgets[0]?.data ?? {});
  const [first, ...rest] = datas;
  return {
    id: row.id,
    type: row.columns[0].widgets[0].type,
    strip_title: row.strip_title,
    bg_color: row.bg_color,
    scope: row.scope,
    layout: row.layout,
    content: first ?? {},
    columns_data: rest.length ? rest : undefined,
  };
};

const rollbackArray = (
  rows: unknown,
  ctx: string,
  outcome: Outcome,
): { next: any[]; changed: boolean } => {
  if (!Array.isArray(rows)) return { next: [], changed: false };
  let changed = false;
  const next = rows.map((r) => {
    if (!isPageRowV2(r)) {
      outcome.alreadyLegacy++;
      return r;
    }
    if (!isReducible(r as PageRowV2)) {
      outcome.preserved++;
      console.log(`  ! ${ctx} row ${r.id} kept as v2 (mixed widgets — no legacy equivalent)`);
      return r;
    }
    outcome.reverted++;
    changed = true;
    return v2ToLegacy(r as PageRowV2);
  });
  return { next, changed };
};

(async () => {
  console.log(`\n=== Rollback ${DRY ? "(DRY RUN)" : ""} ===\n`);
  const outcome: Outcome = { reverted: 0, preserved: 0, alreadyLegacy: 0 };

  const { data: site, error: e1 } = await supabase
    .from("site_content")
    .select("id, section_key, content, draft_content");
  if (e1) throw e1;

  for (const row of site ?? []) {
    const c = (row.content ?? {}) as { rows?: unknown };
    const d = (row.draft_content ?? null) as { rows?: unknown } | null;
    const cRes = c.rows ? rollbackArray(c.rows, `site_content[${row.section_key}].content`, outcome) : { next: [], changed: false };
    const dRes = d?.rows ? rollbackArray(d.rows, `site_content[${row.section_key}].draft`, outcome) : { next: [], changed: false };
    if (!cRes.changed && !dRes.changed) continue;
    const update: Record<string, unknown> = {};
    if (cRes.changed) update.content = { ...c, rows: cRes.next };
    if (dRes.changed && d) update.draft_content = { ...d, rows: dRes.next };
    if (DRY) continue;
    const { error } = await supabase.from("site_content").update(update).eq("id", row.id);
    if (error) throw error;
  }

  const { data: pages, error: e2 } = await supabase
    .from("cms_pages")
    .select("id, slug, page_rows, draft_page_rows");
  if (e2) throw e2;

  for (const row of pages ?? []) {
    const pRes = rollbackArray(row.page_rows, `cms_pages[${row.slug}].page_rows`, outcome);
    const dRes = row.draft_page_rows ? rollbackArray(row.draft_page_rows, `cms_pages[${row.slug}].draft`, outcome) : { next: [], changed: false };
    if (!pRes.changed && !dRes.changed) continue;
    const update: Record<string, unknown> = {};
    if (pRes.changed) update.page_rows = pRes.next;
    if (dRes.changed) update.draft_page_rows = dRes.next;
    if (DRY) continue;
    const { error } = await supabase.from("cms_pages").update(update).eq("id", row.id);
    if (error) throw error;
  }

  console.log("\n--- Summary ---");
  console.log(`  reverted v2 → legacy : ${outcome.reverted}`);
  console.log(`  preserved (mixed)    : ${outcome.preserved}`);
  console.log(`  already legacy       : ${outcome.alreadyLegacy}`);
  console.log(DRY ? "\n(no writes performed)\n" : "\n✓ done\n");
})().catch((e) => {
  console.error("✖ rollback failed:", e);
  process.exit(1);
});
