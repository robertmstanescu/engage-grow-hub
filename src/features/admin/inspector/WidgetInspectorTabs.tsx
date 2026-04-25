/**
 * ════════════════════════════════════════════════════════════════════
 * WidgetInspectorTabs — User Story 2.5 (Neater Inspector Grouping)
 * ════════════════════════════════════════════════════════════════════
 *
 * Splits the per-widget inspector into three logical tabs so editors
 * aren't presented with 50 fields at once:
 *
 *   • Content   — the widget's own admin editor (text, images, etc.)
 *   • Design    — Box Model spacing (US 2.3) + colour + radius
 *   • Advanced  — responsive visibility flags + per-instance Custom CSS
 *
 * The tabs are CONTROLLED so the parent (`InspectorPanel`) can flip to
 * the matching tab whenever US 1.3's auto-focus hook needs a field that
 * lives in a non-active panel. We pin each known field key to a tab via
 * `pickTabForFocusKey` below — the parent reads `activeNodePath` and
 * tells us which tab to surface.
 *
 * NOTE: All three TabsContent panels are kept mounted (forceMount) so
 * the DOM nodes exist for the focus hook's `querySelector`. Inactive
 * panels get `hidden` from Radix; we override with `data-[state=inactive]:hidden`
 * on the wrapper so `scrollIntoView` only runs after we've activated
 * the right tab.
 */

import { type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Monitor } from "lucide-react";
import BoxModelControl, { type BoxField } from "./BoxModelControl";
import type { WidgetDesignSettings } from "@/types/rows";
import { ColorField } from "../site-editor/FieldComponents";

export type InspectorTab = "content" | "design" | "advanced";

/** Keys that live in the Design panel. Used by the parent to auto-switch
 *  the active tab when a focus event targets one of these inputs. */
const DESIGN_KEYS = new Set<string>([
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderRadius", "bgColor",
]);

/** Keys that live in the Advanced panel. */
const ADVANCED_KEYS = new Set<string>([
  "visibility", "visibility.mobile", "visibility.desktop",
  "customCss", "customClass",
]);

/**
 * Decide which tab a given inspector-focus-key belongs to. Anything
 * not explicitly tagged falls through to Content (the widget's own
 * admin editor — text fields, images, dropdowns, etc.).
 */
export const pickTabForFocusKey = (key: string | null): InspectorTab => {
  if (!key) return "content";
  // The focus key may be `item:<id>:<leaf>` — the actual leaf is the
  // last segment, so strip the prefix for the lookup.
  const leaf = key.includes(":") ? key.split(":").pop() || key : key;
  if (DESIGN_KEYS.has(leaf)) return "design";
  if (ADVANCED_KEYS.has(leaf)) return "advanced";
  return "content";
};

interface Props {
  /** Active tab (controlled). */
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;

  /** Body of the Content tab — the widget's own admin editor. */
  contentEditor: ReactNode;

  /** Design-tab data (spacing + chrome). */
  design: WidgetDesignSettings;
  onDesignFieldChange: (field: BoxField, value: number) => void;
  onDesignBgChange: (color: string) => void;
  onDesignRadiusChange: (px: number) => void;

  /** Advanced-tab data. */
  onVisibilityChange: (next: { mobile: boolean; desktop: boolean }) => void;
  onCustomCssChange: (css: string) => void;
}

const PANEL_LABEL =
  "font-body text-[10px] uppercase tracking-[0.18em] font-medium mb-2.5";
const PANEL_LABEL_STYLE = { color: "hsl(var(--muted-foreground))" };

const PanelHeading = ({ children }: { children: ReactNode }) => (
  <h4 className={PANEL_LABEL} style={PANEL_LABEL_STYLE}>{children}</h4>
);

const WidgetInspectorTabs = ({
  activeTab,
  onTabChange,
  contentEditor,
  design,
  onDesignFieldChange,
  onDesignBgChange,
  onDesignRadiusChange,
  onVisibilityChange,
  onCustomCssChange,
}: Props) => {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as InspectorTab)}
      className="w-full"
    >
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="design">Design</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      {/* ── CONTENT tab ─────────────────────────────────────────── */}
      <TabsContent value="content" forceMount className="data-[state=inactive]:hidden mt-4">
        {contentEditor}
      </TabsContent>

      {/* ── DESIGN tab ──────────────────────────────────────────── */}
      <TabsContent value="design" forceMount className="data-[state=inactive]:hidden mt-4">
        <div className="mb-5">
          <PanelHeading>Spacing (Box Model)</PanelHeading>
          <BoxModelControl
            marginTop={design.marginTop}
            marginRight={design.marginRight}
            marginBottom={design.marginBottom}
            marginLeft={design.marginLeft}
            paddingTop={design.paddingTop}
            paddingRight={design.paddingRight}
            paddingBottom={design.paddingBottom}
            paddingLeft={design.paddingLeft}
            onChange={onDesignFieldChange}
          />
        </div>

        <div className="mb-5">
          <PanelHeading>Background</PanelHeading>
          <div data-inspector-field="bgColor">
            <ColorField
              label="Background Colour"
              value={design.bgColor || ""}
              onChange={onDesignBgChange}
            />
          </div>
        </div>

        <div className="mb-5">
          <PanelHeading>Border Radius</PanelHeading>
          <div data-inspector-field="borderRadius">
            <label
              className="font-body text-[10px] uppercase tracking-wider mb-1 block"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Radius (px)
            </label>
            <input
              type="number"
              min={0}
              max={400}
              value={Number.isFinite(design.borderRadius) ? design.borderRadius : 0}
              onChange={(e) => {
                const n = Number(e.target.value);
                onDesignRadiusChange(
                  Number.isFinite(n) ? Math.max(0, Math.min(400, n)) : 0,
                );
              }}
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={{
                borderColor: "hsl(var(--border))",
                backgroundColor: "#FFFFFF",
                color: "#1a1a1a",
              }}
            />
          </div>
        </div>
      </TabsContent>

      {/* ── ADVANCED tab ────────────────────────────────────────── */}
      <TabsContent value="advanced" forceMount className="data-[state=inactive]:hidden mt-4">
        <div className="mb-5">
          <PanelHeading>Visibility</PanelHeading>
          <div className="space-y-3">
            <div
              data-inspector-field="visibility"
              className="flex items-center justify-between gap-3 p-3 rounded-md border"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <div className="flex items-center gap-2">
                <Smartphone size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                <span className="font-body text-xs">Show on mobile</span>
              </div>
              <Switch
                checked={design.visibility.mobile}
                onCheckedChange={(checked) =>
                  onVisibilityChange({ ...design.visibility, mobile: checked })
                }
              />
            </div>
            <div
              className="flex items-center justify-between gap-3 p-3 rounded-md border"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <div className="flex items-center gap-2">
                <Monitor size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
                <span className="font-body text-xs">Show on desktop</span>
              </div>
              <Switch
                checked={design.visibility.desktop}
                onCheckedChange={(checked) =>
                  onVisibilityChange({ ...design.visibility, desktop: checked })
                }
              />
            </div>
            {!design.visibility.mobile && !design.visibility.desktop && (
              <p
                className="font-body text-[11px] leading-snug"
                style={{ color: "hsl(var(--destructive))" }}
              >
                This widget is hidden on every breakpoint and won't render on the live site.
              </p>
            )}
          </div>
        </div>

        <div className="mb-5">
          <PanelHeading>Custom CSS</PanelHeading>
          <p
            className="font-body text-[10px] mb-2 leading-snug"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Use <code>&amp;</code> as the per-instance selector.<br />
            Example: <code>&amp; h1 {`{ font-size: 50px; }`}</code>
          </p>
          <div data-inspector-field="customCss">
            <textarea
              value={design.customCss || ""}
              onChange={(e) => onCustomCssChange(e.target.value)}
              rows={6}
              spellCheck={false}
              className="w-full px-3 py-2 rounded-lg font-mono text-xs border"
              style={{
                borderColor: "hsl(var(--border))",
                backgroundColor: "#FFFFFF",
                color: "#1a1a1a",
              }}
              placeholder="& { background: red; }"
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default WidgetInspectorTabs;
