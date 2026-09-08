/**
 * ════════════════════════════════════════════════════════════════════
 * WidgetRegistry — central registry for page-builder widgets/rows
 * ════════════════════════════════════════════════════════════════════
 *
 * WHY THIS EXISTS (Open–Closed Principle)
 * ────────────────────────────────────────
 * Before this module, `PageRows.tsx` carried a hardcoded `switch`
 * dispatching `row.type` → React component. Every new widget required
 * editing the core engine (`PageRows.tsx`, `RowsManager.tsx`, etc.).
 * That violates OCP: the engine should be CLOSED for modification but
 * OPEN for extension.
 *
 * The registry inverts the dependency. Widget modules now self-register
 * by calling `registerWidget(...)` once at module-load time. The engine
 * looks each widget up by `type` at render time. Adding a new widget is
 * a SELF-CONTAINED change: drop a new file, import it once at boot,
 * done — no engine edits required.
 *
 * Inspired by `wp.blocks.registerBlockType()` in WordPress Gutenberg.
 *
 * USAGE
 * ─────
 * ```ts
 * // src/widgets/MyBanner.ts
 * import { registerWidget } from "@/lib/WidgetRegistry";
 *
 * registerWidget({
 *   type: "my_banner",
 *   defaultData: { headline: "" },
 *   adminComponent: MyBannerAdmin,
 *   frontendComponent: MyBannerFrontend,
 *   render: (ctx) => <MyBannerFrontend row={ctx.row} />,
 * });
 * ```
 *
 * Then import the file once from `src/widgets/index.ts` so the
 * `registerWidget` call runs at boot and the registry is populated
 * before the first render.
 */

import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { PageRow } from "@/types/rows";

/**
 * The slice of a zod schema the engine needs — structural on purpose so
 * widget modules can use `zod/mini` (public bundle, small) or classic
 * `zod` without this file importing either.
 */
export interface ContentSchema<TData> {
  parse(input: unknown): TData;
  safeParse(input: unknown):
    | { success: true; data: TData }
    | { success: false; error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> } };
}

/**
 * Render context passed by the engine when it asks the registry for
 * the rendered output of a widget. Centralising this here means widget
 * authors only need to know one shape, not the heterogeneous prop
 * signatures of the legacy row components (some take `{ row }`, some
 * take `{ row, rowIndex, align, vAlign }`, etc.).
 *
 * Why a `render(ctx)` function instead of "just pass props":
 * legacy components have inconsistent prop names. A render function
 * lets each widget adapt freely without us forcing a one-size-fits-all
 * signature on every existing renderer.
 */
export interface WidgetRenderContext {
  row: PageRow;
  rowIndex: number;
  /** Computed horizontal alignment (resolved from auto/explicit). */
  align: "left" | "right" | "center";
  /** Vertical alignment within the row. */
  vAlign: "top" | "middle" | "bottom";
}

/**
 * Definition for a single registered widget.
 *
 * - `type`              — unique key matching `PageRow["type"]`.
 * - `defaultData`       — used by the admin "Add Widget" flow to seed
 *                         a fresh content blob with sensible defaults.
 * - `adminComponent`    — editor surface (Properties panel / inline).
 * - `frontendComponent` — public renderer (kept around for direct use
 *                         where call sites already have it; the engine
 *                         itself uses `render`).
 * - `render`            — engine-facing render fn. Returns the JSX to
 *                         display this widget given the standard ctx.
 *                         If omitted, the registry falls back to
 *                         `<frontendComponent row={ctx.row} />`.
 * - `label`             — display name for menus and the Elements Tray.
 * - `icon`              — Lucide icon shown in the Elements Tray card
 *                         (US 17.1). Optional — falls back to a generic
 *                         block glyph when omitted.
 * - `category`          — optional grouping for the tray ("Layout",
 *                         "Content", "Media", "Social", …).
 */
export interface WidgetDefinition<TData = Record<string, unknown>> {
  type: string;
  defaultData: TData;
  /**
   * Zod schema for this widget's `content` blob — the ONE description of
   * its fields that the renderer, the editor and `defaultData` all derive
   * from (see src/features/widgets/boxed/schema.ts). When present, the
   * engine validates stored content at the render boundary
   * (`parseWidgetContent`): bad JSON is reported in dev and rendered
   * with defaults merged in, never thrown. Widgets not yet migrated to
   * a schema simply omit it.
   */
  schema?: ContentSchema<TData>;
  adminComponent?: ComponentType<{
    content: TData;
    onChange: (field: string, value: unknown) => void;
  }>;
  frontendComponent?: ComponentType<{ row: PageRow }>;
  render?: (ctx: WidgetRenderContext) => ReactNode;
  label?: string;
  icon?: LucideIcon;
  category?: string;
}

/* ──────────────────────────────────────────────────────────────────────
 * Internal store
 * ──────────────────────────────────────────────────────────────────────
 * Plain Map keyed by `type`. We hold the most general form of the
 * definition (`unknown` data) because the registry does not know each
 * widget's bespoke data shape at lookup time. Callers that need the
 * specific shape parameterize at the widget boundary themselves.
 */
type AnyWidgetDefinition = WidgetDefinition<unknown>;
const widgets = new Map<string, AnyWidgetDefinition>();

/**
 * Register a widget with the engine.
 *
 * Idempotent re-registration is allowed — this matters for Vite HMR,
 * where a widget module may re-evaluate during development. Re-registering
 * REPLACES the previous entry (last write wins).
 *
 * Defensive defaulting: if `defaultData` is `null`/`undefined` we log a
 * warning and refuse to register the widget. Coercing to `{}` would
 * have lied to the type system about widgets whose `TData` is not
 * structurally compatible with an empty object, so we fail loudly
 * instead. Authors get an actionable console message and a missing
 * widget in the tray rather than silent runtime corruption.
 */
export const registerWidget = <TData,>(def: WidgetDefinition<TData>): void => {
  if (!def?.type) {
    console.error("[WidgetRegistry] registerWidget called without a type", def);
    return;
  }
  if (def.defaultData == null) {
    console.error(
      `[WidgetRegistry] Widget "${def.type}" registered without defaultData; refusing to register.`,
    );
    return;
  }
  widgets.set(def.type, def as AnyWidgetDefinition);
};

/** Look up a widget definition by type. Returns `undefined` if missing. */
export const getWidget = (type: string): AnyWidgetDefinition | undefined =>
  widgets.get(type);

/** Snapshot of all registered widgets (e.g. for admin "Add Widget" menu). */
export const listWidgets = (): AnyWidgetDefinition[] => Array.from(widgets.values());

/** True when a widget for `type` has been registered. */
export const hasWidget = (type: string): boolean => widgets.has(type);

/**
 * Render a widget through the registry. The engine calls this from
 * `PageRows.tsx` instead of hardcoding a `switch(row.type)`.
 *
 * Resolution order:
 *   1. `render(ctx)` if the widget provided one.
 *   2. `<frontendComponent row={ctx.row} />` as a sensible default.
 *   3. `null` if neither is available — the row is silently skipped
 *      so a single missing widget can never crash the whole page.
 */
export const renderWidget = (ctx: WidgetRenderContext): ReactNode => {
  const def = widgets.get(ctx.row.type);
  if (!def) {
    if (typeof window !== "undefined") {
      // Visible-but-non-fatal warning during development. In production
      // this just no-ops, so unknown widgets degrade gracefully.
        console.warn(`[WidgetRegistry] No widget registered for type "${ctx.row.type}"`);
    }
    return null;
  }
  const row = def.schema
    ? { ...ctx.row, content: parseWidgetContent(def, ctx.row.content, ctx.row.id) }
    : ctx.row;
  if (def.render) return def.render({ ...ctx, row });
  if (def.frontendComponent) {
    const C = def.frontendComponent;
    return <C row={row} />;
  }
  return null;
};

/**
 * Validate a stored `content` blob against the widget's schema at the
 * render boundary. Stored JSON was written by many admin versions and
 * by hand, so the public site must never crash on it:
 *   - valid    → the parsed value (schema defaults filled in).
 *   - invalid  → `defaultData` merged under the raw content, so every
 *                field the renderer reads exists; plus, in development
 *                only, a console warning naming the widget, the row and
 *                the offending paths so the bad data gets fixed at the
 *                source rather than papered over.
 * Meta keys the engine adds (`__design`, `__slug`, `__global_ref`) pass
 * through because schemas are declared `.loose()`.
 */
export const parseWidgetContent = (
  def: AnyWidgetDefinition,
  content: Record<string, unknown> | undefined,
  rowId?: string,
): Record<string, unknown> => {
  const raw = content ?? {};
  if (!def.schema) return raw;
  const result = def.schema.safeParse(raw);
  if (result.success) return result.data as Record<string, unknown>;
  if (import.meta.env?.DEV && typeof window !== "undefined") {
    const paths = result.error.issues
      .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
      .slice(0, 8)
      .join("; ");
    console.warn(`[WidgetRegistry] "${def.type}" row ${rowId ?? "?"} has invalid content — ${paths}`);
  }
  return { ...(def.defaultData as Record<string, unknown>), ...raw };
};

/**
 * Test-only helper: wipe the registry. Exposed so unit tests and
 * Vite HMR teardown can start from a clean slate. Not part of the
 * public widget-author API.
 */
export const clearWidgets = (): void => {
  widgets.clear();
};
