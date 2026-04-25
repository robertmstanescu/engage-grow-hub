import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useBuilder, type NodePath } from "./BuilderContext";
import type { PageRow, PageColumn, PageCell } from "@/types/rows";

/**
 * ════════════════════════════════════════════════════════════════════
 * CanvasBreadcrumb — DOM hierarchy navigator for the active selection
 * ════════════════════════════════════════════════════════════════════
 *
 * EPIC 1 / US 1.5 — Interactive Breadcrumb Navigation
 * ----------------------------------------------------
 * Renders a fixed bar at the bottom of the center canvas that shows
 * the parent chain of the currently selected node, e.g.:
 *
 *      Section > Grid > Column > Cell > Image
 *
 * Each crumb is a button: clicking it sets `activeNodePath` to the
 * corresponding prefix, allowing editors to "step up" the tree without
 * hunting for a parent in the DOM.
 *
 * LABELS
 * ------
 * Labels are derived from the selected path AND the live rows tree
 * (read from BuilderContext.pageRows). When the rows are unavailable
 * we fall back to generic kind labels so the bar still renders.
 *
 * EMPTY STATE
 * -----------
 * When nothing is selected, we render a faint "Click an element to see
 * its hierarchy" hint instead of disappearing — this keeps the canvas
 * layout stable (no jump in height when selection comes and goes).
 */

const FIELD_LABELS: Record<string, string> = {
  eyebrow: "Eyebrow",
  title: "Title",
  subtitle: "Subtitle",
  body: "Body",
  description: "Description",
  cta_label: "CTA Label",
  cta_url: "CTA URL",
  note: "Note",
  image: "Image",
  alt: "Alt Text",
  caption: "Caption",
  pillar_number: "Pillar #",
  label: "Label",
};

const ROW_TYPE_LABELS: Record<string, string> = {
  hero: "Hero",
  text: "Text",
  service: "Services",
  boxed: "Boxed",
  contact: "Contact",
  image_text: "Image + Text",
  image: "Image",
  profile: "Profile",
  grid: "Grid",
  lead_magnet: "Lead Magnet",
  testimonial: "Testimonial",
  logo_cloud: "Logo Cloud",
  faq: "FAQ",
};

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface Crumb {
  label: string;
  /** Path prefix this crumb selects on click. */
  path: NodePath;
  /** Visual hint — controls icon/colour. Optional. */
  kind?: "row" | "widget" | "column" | "cell" | "item" | "field";
}

/**
 * Walk the selected path and produce a breadcrumb trail. We resolve
 * meaningful labels by looking up the row, column, cell, and item that
 * each segment refers to.
 */
const buildCrumbs = (path: NodePath, rows: PageRow[] | undefined): Crumb[] => {
  if (!path || path.length === 0) return [];
  const crumbs: Crumb[] = [];

  // Segment iterator: walk pairs of [kind, id|index].
  let i = 0;
  let currentRow: PageRow | undefined;
  let currentColumn: PageColumn | undefined;
  let currentCell: PageCell | undefined;

  while (i < path.length) {
    const seg = path[i];

    // ─── Row ──────────────────────────────────────────────────────
    if (seg === "row" && i + 1 < path.length) {
      const rowId = path[i + 1];
      currentRow = rows?.find((r) => r.id === rowId);
      const label = currentRow
        ? ROW_TYPE_LABELS[currentRow.type] || titleCase(currentRow.type)
        : "Section";
      crumbs.push({
        label: `Section · ${label}`,
        path: ["row", rowId],
        kind: "row",
      });
      i += 2;
      continue;
    }

    // ─── Widget (legacy shorthand: row contains a single widget) ──
    if (seg === "widget" && i + 1 < path.length) {
      // For most rows the widget id == row id, so this is a no-op
      // semantically. Skip rendering a redundant crumb in that case.
      const widgetId = path[i + 1];
      if (currentRow && widgetId === currentRow.id) {
        i += 2;
        continue;
      }
      crumbs.push({
        label: "Widget",
        path: path.slice(0, i + 2),
        kind: "widget",
      });
      i += 2;
      continue;
    }

    // ─── Column (v3 schema with explicit columns) ─────────────────
    if (seg === "col" && i + 1 < path.length) {
      const colKey = path[i + 1];
      // Try v3 column array first.
      const cols = (currentRow as any)?.columns as PageColumn[] | undefined;
      if (cols) {
        currentColumn = cols.find((c) => c.id === colKey);
      } else {
        currentColumn = undefined;
      }
      // Numeric column index → "Column N+1"
      const numeric = Number(colKey);
      const colLabel = !Number.isNaN(numeric)
        ? `Column ${numeric + 1}`
        : currentColumn
          ? `Column`
          : "Column";
      crumbs.push({
        label: colLabel,
        path: path.slice(0, i + 2),
        kind: "column",
      });
      i += 2;
      continue;
    }

    // ─── Cell ──────────────────────────────────────────────────────
    if (seg === "cell" && i + 1 < path.length) {
      const cellId = path[i + 1];
      currentCell = currentColumn?.cells?.find((c) => c.id === cellId);
      crumbs.push({
        label: "Cell",
        path: path.slice(0, i + 2),
        kind: "cell",
      });
      i += 2;
      continue;
    }

    // ─── Item (service / pillar / card inside a collection) ───────
    if (seg === "item" && i + 1 < path.length) {
      const itemId = path[i + 1];
      let itemLabel = "Item";
      // Dig through known collections on the row content.
      const content = currentRow?.content || {};
      for (const k of ["services", "items", "features", "pillars", "cards", "logos"]) {
        const list = (content as any)[k];
        if (Array.isArray(list)) {
          const it = list.find((x: any) => x && x.id === itemId);
          if (it) {
            itemLabel = it.title || it.name || it.label || it.alt || titleCase(k.slice(0, -1));
            break;
          }
        }
      }
      crumbs.push({
        label: itemLabel,
        path: path.slice(0, i + 2),
        kind: "item",
      });
      i += 2;
      continue;
    }

    // ─── Trailing leaf (a field name like `eyebrow`, `title`) ─────
    // Anything that isn't a recognized prefix pair is treated as the
    // atomic field this path targets.
    crumbs.push({
      label: FIELD_LABELS[seg] || titleCase(seg),
      path: path.slice(0, i + 1),
      kind: "field",
    });
    i += 1;
  }

  return crumbs;
};

const CanvasBreadcrumb = () => {
  const { enabled, activeNodePath, setActiveNodePath, pageRows } = useBuilder();

  const crumbs = useMemo(
    () => (activeNodePath ? buildCrumbs(activeNodePath, pageRows) : []),
    [activeNodePath, pageRows],
  );

  if (!enabled) return null;

  const hasSelection = crumbs.length > 0;

  return (
    <div
      className="sticky bottom-0 z-30 flex items-center gap-1 px-3 py-2 backdrop-blur border-t text-[11px] font-body overflow-x-auto"
      style={{
        backgroundColor: "hsl(var(--card) / 0.92)",
        borderColor: "hsl(var(--border) / 0.6)",
      }}
      aria-label="Selection breadcrumb"
    >
      <span
        className="uppercase tracking-[0.18em] font-medium pr-2 mr-1 border-r whitespace-nowrap"
        style={{
          color: "hsl(var(--muted-foreground))",
          borderColor: "hsl(var(--border) / 0.5)",
        }}
      >
        Path
      </span>

      {!hasSelection && (
        <span style={{ color: "hsl(var(--muted-foreground) / 0.7)" }}>
          Click an element to see its hierarchy
        </span>
      )}

      {hasSelection &&
        crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <span key={`${idx}-${c.path.join("/")}`} className="flex items-center gap-1 whitespace-nowrap">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNodePath(c.path);
                }}
                className="px-2 py-0.5 rounded transition-colors"
                style={{
                  backgroundColor: isLast ? "hsl(var(--primary) / 0.15)" : "transparent",
                  color: isLast ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                  fontWeight: isLast ? 600 : 400,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!isLast) e.currentTarget.style.backgroundColor = "hsl(var(--muted) / 0.6)";
                }}
                onMouseLeave={(e) => {
                  if (!isLast) e.currentTarget.style.backgroundColor = "transparent";
                }}
                title={c.path.join(" / ")}
              >
                {c.label}
              </button>
              {!isLast && (
                <ChevronRight
                  className="w-3 h-3 opacity-50 shrink-0"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                />
              )}
            </span>
          );
        })}
    </div>
  );
};

export default CanvasBreadcrumb;
