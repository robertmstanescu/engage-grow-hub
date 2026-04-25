/**
 * EmbedAdmin — admin editor for the HTML / Iframe Embed widget.
 *
 * Single textarea where marketers paste a YouTube / Typeform /
 * HubSpot / Calendly / etc. embed snippet. Below the textarea we show
 * a SANITISED live preview so the editor can see what the public site
 * will actually render after our XSS scrub.
 *
 * WHY a live sanitised preview (not a raw preview):
 * If we previewed the raw HTML, an editor could be lulled into a
 * false sense of "looks good" only to find their script tag stripped
 * on the published page. Showing the sanitised output makes the
 * security policy visible: if it doesn't show in the preview, it
 * won't show on the live site.
 */

import { useMemo } from "react";
import { sanitizeEmbedHtml } from "@/services/sanitize";

interface EmbedAdminProps {
  content: { html?: string; aspect_ratio?: string };
  onChange: (field: string, value: any) => void;
}

const EmbedAdmin = ({ content, onChange }: EmbedAdminProps) => {
  const raw = content.html ?? "";

  // Memoise the sanitisation pass so it doesn't run on every keystroke
  // re-render of the parent — only when the source actually changes.
  const sanitized = useMemo(() => sanitizeEmbedHtml(raw), [raw]);

  const wasModified = raw.length > 0 && raw !== sanitized;

  return (
    <div className="space-y-3">
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Embed HTML / Iframe Code
        </label>
        <textarea
          value={raw}
          onChange={(e) => onChange("html", e.target.value)}
          placeholder='<iframe src="https://www.youtube.com/embed/..." width="560" height="315" allowfullscreen></iframe>'
          rows={8}
          spellCheck={false}
          className="w-full px-3 py-2 rounded-lg font-mono text-xs border resize-y"
          style={{
            borderColor: "hsl(var(--border))",
            backgroundColor: "#FFFFFF",
            color: "#1a1a1a",
            minHeight: 160,
          }}
        />
        <p className="font-body text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
          Paste the full embed snippet from YouTube, Typeform, HubSpot,
          Calendly, Google Maps, etc. <strong>{"<script>"}</strong> tags,
          inline event handlers (onclick, onerror…) and unsafe URL schemes
          are stripped automatically before the HTML is ever rendered.
        </p>
        {wasModified && (
          <div
            className="mt-2 px-2.5 py-1.5 rounded-md font-body text-[10px]"
            style={{
              backgroundColor: "hsl(var(--primary) / 0.08)",
              color: "hsl(var(--primary))",
              border: "1px solid hsl(var(--primary) / 0.25)",
            }}
          >
            ⓘ Some markup was removed by the security filter. The preview
            below shows exactly what visitors will see.
          </div>
        )}
      </div>

      {/*
       * Live sanitised preview. We render inside an isolated container
       * with `overflow:auto` so an oversized embed doesn't blow out the
       * admin layout while editing.
       *
       * SECURITY: this uses the SAME `sanitizeEmbedHtml` as the public
       * frontend, so what you see here is byte-for-byte what ships.
       */}
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Live Preview (sanitised)
        </label>
        <div
          className="rounded-lg border p-3 overflow-auto"
          style={{
            borderColor: "hsl(var(--border))",
            backgroundColor: "hsl(var(--muted) / 0.2)",
            minHeight: 120,
            maxHeight: 480,
          }}
        >
          {sanitized ? (
            // eslint-disable-next-line react/no-danger
            <div dangerouslySetInnerHTML={{ __html: sanitized }} />
          ) : (
            <div className="font-body text-xs text-muted-foreground italic">
              Paste an embed snippet above to preview it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmbedAdmin;
