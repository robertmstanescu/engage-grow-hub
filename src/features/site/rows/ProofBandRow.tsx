/**
 * ─────────────────────────────────────────────────────────────────────────
 * ProofBandRow.tsx — `type: "proof_band"`
 * ─────────────────────────────────────────────────────────────────────────
 * The single biggest credibility lift on a consulting site: a compact
 * band of three to four outcome stats (or client logos) that sits right
 * under the hero.
 *
 * DATA CONTRACT
 * {
 *   "eyebrow": "Proof",                     // optional
 *   "title_lines": ["<p>Outcomes</p>"],     // optional
 *   "subtitle": "", "body": "",             // optional
 *   "items": [{ "value": "38%", "label": "lift in message recall" }]
 * }
 *
 * Items may carry a `logo` instead of a `value` — the logo renders in
 * place of the number so the same row doubles as a client logo strip.
 * ───────────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import type { PageRow, ProofItem } from "@/types/rows";
import { fetchProofPointsByIds, type ProofPointRecord } from "@/services/proofPoints";
import { DEFAULT_ROW_LAYOUT } from "@/lib/constants/rowDefaults";
import { sanitizeHtml } from "@/services/sanitize";
import { resolveImageAlt } from "@/services/imageAlt";
import { useScrollReveal, revealStyle } from "@/hooks/useScrollReveal";
import { RowEyebrow, RowTitle, RowSubtitle, RowBody, RowSection } from "./typography";
import RowNote from "./typography/RowNote";
import type { Alignment, VAlign } from "./PageRows";
import RowCoverCard from "@/features/site/RowCoverCard";

const ProofBandRow = ({
  row,
  align = "left",
}: {
  row: PageRow;
  rowIndex?: number;
  align?: Alignment;
  vAlign?: VAlign;
}) => {
  const c = row.content || {};
  const l = { ...DEFAULT_ROW_LAYOUT, ...row.layout };
  const rawItems: ProofItem[] = Array.isArray(c.items) ? c.items : [];

  /* Proof-linked items (redesign §6 E6): a linked item shows the proof
     point's value. RLS only returns APPROVED proofs to visitors, so an
     unapproved link resolves to nothing and the number hides — the
     typed label stays. Typed items (no link) render exactly as before. */
  const proofIds = rawItems.map((i) => i.proof_id).filter((v): v is string => Boolean(v));
  const [proofs, setProofs] = useState<Record<string, ProofPointRecord>>({});
  const proofKey = proofIds.slice().sort().join(",");
  useEffect(() => {
    const ids = proofKey ? proofKey.split(",") : [];
    if (!ids.length) { setProofs({}); return; }
    let cancelled = false;
    fetchProofPointsByIds(ids).then(({ data }) => {
      if (cancelled) return;
      const map: Record<string, ProofPointRecord> = {};
      for (const p of data ?? []) map[p.id] = p;
      setProofs(map);
    });
    return () => { cancelled = true; };
  }, [proofKey]);

  const items = rawItems
    .map((item) => {
      if (!item.proof_id) return item;
      const proof = proofs[item.proof_id];
      if (!proof) {
        /* Linked but not approved (or still loading): keep a typed
           label, drop the number. Nothing typed → the tile goes. */
        return { ...item, value: "", logo: "" };
      }
      return { ...item, value: proof.value, label: item.label || proof.label };
    })
    .filter((item) => item.value || item.logo || item.label);
  const titleLines: string[] = (c.title_lines || []).map((li: any) =>
    typeof li === "string" ? (li.startsWith("<") ? li : `<p>${li}</p>`) : `<p>${li}</p>`,
  );
  const maxW = l.fullWidth ? "max-w-none" : "max-w-[1280px]";
  const contentAlign = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const containerPos = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto";
  const { ref, isVisible } = useScrollReveal();

  if (items.length === 0) return null;

  // Three or four items read best; the grid adapts without stranding one
  // item alone on the last line.
  const cols = items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";
  const coverImage = c.cover_image?.trim() || undefined;

  const innerContent = (
    <>
        {c.eyebrow && (
          <RowEyebrow color={c.color_eyebrow || ""} style={revealStyle(isVisible, -0.5)}>
            {c.eyebrow}
          </RowEyebrow>
        )}
        {titleLines.length > 0 && (
          <RowTitle icon={c.icon} style={revealStyle(isVisible, 0)}>
            {titleLines.map((line, i) => (
              <span key={i} className="block" dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }} />
            ))}
          </RowTitle>
        )}
        {c.subtitle && (
          <RowSubtitle handwritten={!!c.subtitle_handwritten} color={c.subtitle_color || ""} style={revealStyle(isVisible, 0.3)}>
            {c.subtitle}
          </RowSubtitle>
        )}
        {c.body && <RowBody html={sanitizeHtml(c.body)} className="measure" style={revealStyle(isVisible, 0.35)} />}

        <dl className={`mt-8 grid grid-cols-1 ${cols} gap-px overflow-hidden rounded-[var(--radius)] border row-border`} style={{ background: "var(--row-border, hsl(var(--border)))" }}>
          {items.map((item, i) => (
            <div
              key={i}
              className="px-6 py-7 flex flex-col gap-2 items-start"
              style={{
                ...revealStyle(isVisible, 0.4 + i * 0.08),
                background: c.color_tile_bg || "var(--row-surface, hsl(var(--background) / 0.7))",
              }}
            >
              {item.logo ? (
                <img
                  src={item.logo}
                  alt={resolveImageAlt(item.logo_alt, item.label || "Client logo")}
                  loading="lazy"
                  className="h-8 w-auto object-contain opacity-80"
                />
              ) : (
                <dt
                  className="font-display font-bold leading-none row-fg"
                  style={{ fontSize: "var(--fs-stat)", ...(c.color_stat ? { color: c.color_stat } : {}) }}
                >
                  {item.value}
                </dt>
              )}
              <dd
                className="font-body text-sm leading-snug row-fg-muted measure"
                style={c.color_stat_label ? { color: c.color_stat_label } : undefined}
              >
                {item.label}
              </dd>

            </div>
          ))}
        </dl>

        {c.note && <RowNote color={c.color_note}>{c.note}</RowNote>}
    </>
  );

  return (
    <RowSection row={row} fullHeight={false}>
      {coverImage ? (
        <div className={`${maxW} w-full mx-auto`}>
          <RowCoverCard row={row}>
            <div ref={ref as any} className={contentAlign}>{innerContent}</div>
          </RowCoverCard>
        </div>
      ) : (
        <div ref={ref as any} className={`${maxW} ${containerPos} ${contentAlign} row-container`}>
          {innerContent}
        </div>
      )}
    </RowSection>
  );
};

export default ProofBandRow;
