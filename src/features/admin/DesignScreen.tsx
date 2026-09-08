/**
 * Design — the whole site's look on one screen, with a sample page
 * beside the controls.
 *
 * Left: Brand settings (identity, palette, type, outline, logos) and
 * the site defaults (footer, social links, theme defaults), each with
 * its own Save / Publish as before. Right: three sample rows rendered
 * by the real row renderer, so a published change is visible without
 * leaving the admin. Publishing applies the brand CSS variables at
 * once; the sample re-renders from them.
 */
import { useMemo } from "react";
import BrandSettings from "./BrandSettings";
import GlobalSettings from "./GlobalSettings";
import { RowsRenderer } from "@/features/site/rows/PageRows";
import type { PageRow } from "@/types/rows";

const SAMPLE_ROWS: PageRow[] = [
  {
    id: "design-sample-hero",
    type: "hero",
    strip_title: "Sample hero",
    content: {
      eyebrow: "Sample · how a page will look",
      title_lines: ["Your organisation has vampires.", "We bring the coffin."],
      body: "Dead meetings. Blood-sucking cultures. Comms that say everything while meaning nothing.",
      cta_label: "Lift the lid",
      cta_url: "#",
    },
  } as unknown as PageRow,
  {
    id: "design-sample-cards",
    type: "boxed",
    strip_title: "Sample cards",
    bg_color: "#FFFFFF",
    layout: { surfaceRadius: "medium" } as PageRow["layout"],
    content: {
      eyebrow: "Cards",
      title_lines: ["Here's the problem, and here's the fix."],
      cards: [
        { title: "The problem", body: "<p>Messages get sent and lost.</p>" },
        { title: "Who this is for", body: "<p>Leaders at 50 to 2,000 people.</p>" },
        { title: "The fix", body: "<p>Numbers instead of adjectives.</p>" },
      ],
    },
  } as unknown as PageRow,
  {
    id: "design-sample-band",
    type: "cta_band",
    strip_title: "Sample band",
    bg_color: "#26142E",
    content: {
      eyebrow: "Banner",
      title: "Not sure where to start? Lift the lid.",
      body: "One call, no pitch.",
      cta_label: "Book a call",
      cta_url: "#",
    },
  } as unknown as PageRow,
];

const DesignScreen = () => {
  const rows = useMemo(() => SAMPLE_ROWS, []);
  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2 className="admin-h2">Design</h2>
          <p className="admin-sub">The site's look, in one place. Every page inherits this; a block only deviates when you tell it to.</p>
        </div>
      </div>
      <div className="admin-design">
        <div className="admin-design-controls">
          <BrandSettings />
          <GlobalSettings />
        </div>
        <aside className="admin-design-sample" aria-label="Sample page">
          <div className="admin-design-sample-label">Sample · published look</div>
          <div className="admin-design-sample-page public-fluid-type">
            <RowsRenderer rows={rows} promoteHeading={false} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DesignScreen;
