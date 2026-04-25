/**
 * EmbedFrontend — public renderer for the HTML / Iframe Embed widget.
 *
 * The widget's job is to safely surface a third-party embed (YouTube,
 * Typeform, HubSpot etc.) inside the page. All trust boundaries are
 * crossed in `sanitizeEmbedHtml` — by the time we hit
 * `dangerouslySetInnerHTML` here, the HTML is already scrubbed of
 * scripts, event handlers and unsafe URL schemes.
 *
 * Alignment-aware: we honour the row's resolved horizontal alignment
 * by translating it to flexbox justify-content, so an embed dropped
 * into a wider row sits where the editor expects.
 */

import { useMemo } from "react";
import type { PageRow } from "@/types/rows";
import { sanitizeEmbedHtml } from "@/services/sanitize";

interface EmbedFrontendProps {
  row: PageRow;
  align?: "left" | "right" | "center";
  vAlign?: "top" | "middle" | "bottom";
}

const justifyFor = (align?: "left" | "right" | "center") => {
  switch (align) {
    case "left":
      return "flex-start";
    case "right":
      return "flex-end";
    case "center":
    default:
      return "center";
  }
};

const EmbedFrontend = ({ row, align = "center" }: EmbedFrontendProps) => {
  const raw = (row.content?.html as string | undefined) ?? "";

  // WHY useMemo: sanitisation walks the DOM. We only want to redo it
  // when the source HTML actually changes, not on every parent render.
  const safeHtml = useMemo(() => sanitizeEmbedHtml(raw), [raw]);

  if (!safeHtml) {
    // Render nothing on the public site if the editor hasn't supplied
    // an embed yet — silently degrade rather than show an empty box.
    return null;
  }

  return (
    <div
      className="w-full"
      style={{
        display: "flex",
        justifyContent: justifyFor(align),
      }}
    >
      <div
        className="max-w-full"
        // SECURITY: `safeHtml` has been through `sanitizeEmbedHtml`,
        // which uses DOMPurify with a strict allow-list, blocks
        // <script>, on* handlers, and rejects javascript:/data:
        // URLs in iframe `src`. This is the ONLY place in the
        // codebase where embed HTML is injected — keep it that way.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </div>
  );
};

export default EmbedFrontend;
