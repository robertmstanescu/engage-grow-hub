/**
 * User Story 7.1 — Forward migration: legacy PageRow → PageRowV2.
 *
 * WHY a standalone script (not a SQL schema migration):
 * The data is stored as `jsonb` blobs, so this is purely a data
 * transform — no DDL changes. By reusing `migrateRowToV2()` from
 * `src/types/rows.ts` we guarantee the runtime renderer and the
 * batch transform produce byte-identical output, eliminating the
 * "looks fine in dev, breaks in prod" risk called out in US 7.1.
 *
 * IDEMPOTENCY: every row is checked with `isPageRowV2()` first; rows
 * that already carry `schema_version === 2` are skipped. Re-running
 * the script is safe.
 *
 * Run:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun run scripts/migrations/2026_07_nested_rows_forward.ts [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import {
  isPageRowV2,
  migrateRowToV2,
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

interface Stats {
  table: string;
  scanned: number;
  rowsConverted: number;
  recordsTouched: number;
  recordsSkipped: number;
}

const migrateArray = (rows: unknown): {
  next: PageRowV2[];
  converted: number;
  changed: boolean;
} => {
  if (!Array.isArray(rows)) return { next: [], converted: 0, changed: false };
  let converted = 0;
  const next = rows.map((r) => {
    if (isPageRowV2(r)) return r as PageRowV2;
    converted++;
    return migrateRowToV2(r as PageRow);
  });
  return { next, converted, changed: converted > 0 };
};

async function migrateSiteContent(): Promise<Stats> {
  const stats: Stats = {
    table: "site_content",
    scanned: 0,
    rowsConverted: 0,
    recordsTouched: 0,
    recordsSkipped: 0,
  };

  // We only ever store rows under section_key = 'page_rows', but scan
  // every section defensively in case future code expands the surface.
  const { data, error } = await supabase
    .from("site_content")
    .select("id, section_key, content, draft_content");
  if (error) throw error;

  for (const row of data ?? []) {
    stats.scanned++;
    const c = (row.content ?? {}) as { rows?: unknown };
    const d = (row.draft_content ?? null) as { rows?: unknown } | null;

    const cRes = c.rows ? migrateArray(c.rows) : { next: [], converted: 0, changed: false };
    const dRes = d?.rows ? migrateArray(d.rows) : { next: [], converted: 0, changed: false };

    if (!cRes.changed && !dRes.changed) {
      stats.recordsSkipped++;
      continue;
    }
    stats.rowsConverted += cRes.converted + dRes.converted;
    stats.recordsTouched++;

    const update: Record<string, unknown> = {};
    if (cRes.changed) update.content = { ...c, rows: cRes.next };
    if (dRes.changed && d) update.draft_content = { ...d, rows: dRes.next };

    console.log(
      `  • site_content[${row.section_key}] → ${cRes.converted} live + ${dRes.converted} draft rows converted`,
    );
    if (DRY) continue;

    const { error: upErr } = await supabase
      .from("site_content")
      .update(update)
      .eq("id", row.id);
    if (upErr) throw upErr;
  }
  return stats;
}

async function migrateCmsPages(): Promise<Stats> {
  const stats: Stats = {
    table: "cms_pages",
    scanned: 0,
    rowsConverted: 0,
    recordsTouched: 0,
    recordsSkipped: 0,
  };

  const { data, error } = await supabase
    .from("cms_pages")
    .select("id, slug, page_rows, draft_page_rows");
  if (error) throw error;

  for (const row of data ?? []) {
    stats.scanned++;
    const pRes = migrateArray(row.page_rows);
    const dRes = row.draft_page_rows ? migrateArray(row.draft_page_rows) : { next: [], converted: 0, changed: false };

    if (!pRes.changed && !dRes.changed) {
      stats.recordsSkipped++;
      continue;
    }
    stats.rowsConverted += pRes.converted + dRes.converted;
    stats.recordsTouched++;

    const update: Record<string, unknown> = {};
    if (pRes.changed) update.page_rows = pRes.next;
    if (dRes.changed) update.draft_page_rows = dRes.next;

    console.log(
      `  • cms_pages[${row.slug}] → ${pRes.converted} published + ${dRes.converted} draft rows converted`,
    );
    if (DRY) continue;

    const { error: upErr } = await supabase
      .from("cms_pages")
      .update(update)
      .eq("id", row.id);
    if (upErr) throw upErr;
  }
  return stats;
}

(async () => {
  console.log(`\n=== Forward migration ${DRY ? "(DRY RUN)" : ""} ===\n`);
  const s1 = await migrateSiteContent();
  const s2 = await migrateCmsPages();

  const print = (s: Stats) =>
    console.log(
      `  ${s.table.padEnd(14)} scanned=${s.scanned} touched=${s.recordsTouched} skipped=${s.recordsSkipped} rowsConverted=${s.rowsConverted}`,
    );
  console.log("\n--- Summary ---");
  print(s1);
  print(s2);
  console.log(DRY ? "\n(no writes performed — re-run without --dry-run to apply)\n" : "\n✓ done\n");
})().catch((e) => {
  console.error("✖ migration failed:", e);
  process.exit(1);
});
