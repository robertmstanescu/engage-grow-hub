/**
 * LeadMagnetRow — page-builder wrapper around <ResourceWidget>.
 *
 * Editor stores `resource_asset_id`, optional `cover_asset_id`, and
 * optional `title` / `description` overrides on `row.content`.
 */

import type { PageRow } from "@/types/rows";
import { DEFAULT_ROW_LAYOUT } from "@/types/rows";
import ResourceWidget from "@/features/site/ResourceWidget";
import SubscribeWidget from "@/features/site/SubscribeWidget";
import { parseSpacing } from "@/lib/spacing";
import type { Alignment, VAlign } from "./PageRows";

interface Props {
  row: PageRow;
  rowIndex?: number;
  align?: Alignment;
  vAlign?: VAlign;
}

const LeadMagnetRow = ({ row, align = "center" }: Props) => {
  const layout = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const c = row.content || {};
  const resourceAssetId: string | undefined = c.resource_asset_id;

  if (!resourceAssetId) {
    return (
      <section
        className="py-16 px-6"
        style={{ backgroundColor: row.bg_color || "transparent" }}
      >
        <div
          className="max-w-[800px] mx-auto rounded-2xl p-8 text-center font-body text-sm"
          style={{
            backgroundColor: "hsl(var(--muted) / 0.3)",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          Lead magnet not configured. Pick a resource in the row editor.
        </div>
      </section>
    );
  }

  return (
    <section
      // US 2.4 — strip hardcoded Tailwind padding utilities from
      // user-editable wrappers; the horizontal gutter is now driven by
      // an explicit `px` inline style alongside the user-defined
      // top/bottom spacing.
      style={{
        backgroundColor: row.bg_color || "transparent",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingTop: parseSpacing(layout.paddingTop),
        paddingBottom: parseSpacing(layout.paddingBottom),
        marginTop: parseSpacing(layout.marginTop),
        marginBottom: parseSpacing(layout.marginBottom),
      }}
    >
      <div className="max-w-[1100px] mx-auto">
        <ResourceWidget
          resourceAssetId={resourceAssetId}
          coverAssetId={c.cover_asset_id || null}
          title={c.title}
          description={c.description}
        />

        {/* Universal subscribe widget — see SubscribeToggle.tsx. */}
        {c.show_subscribe && (
          <div className="mt-rhythm-loose">
            <SubscribeWidget align={align} />
          </div>
        )}
      </div>
    </section>
  );
};

export default LeadMagnetRow;
