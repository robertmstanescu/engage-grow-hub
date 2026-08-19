/**
 * ImageRow — strict, accessibility-first image widget.
 *
 * EPIC 13 / US 13.1 — every published image must carry meaningful
 * alt text. This widget:
 *   • renders ONLY `<img src={data.url} alt={data.alt_text} />` (no
 *     decorative wrappers that obscure the alt requirement);
 *   • exposes an admin editor that requires both fields;
 *   • is paired with a publish-time validator (see
 *     `src/services/contentAccessibility.ts`) that blocks Publish when
 *     any image widget on the page is missing alt text.
 *
 * Asset-library coupling
 * ----------------------
 * The admin picker writes both the public URL (so the renderer stays
 * pure) AND the source `media_assets.id` into `content.asset_id` when
 * the image was chosen from the gallery. Storing the id lets future
 * features (auto-refresh on rename, usage tracking, batch alt-text
 * audits) join back to the canonical row without re-parsing URLs.
 */
import type { PageRow } from "@/types/rows";
import ImagePickerField from "@/features/admin/ImagePickerField";
import RowSection from "./typography/RowSection";

/* ---------- shared content shape -------------------------------- */
export interface ImageRowContent {
  url: string;
  alt_text: string;
  asset_id?: string | null;
  caption?: string;
}

export const IMAGE_ROW_DEFAULT: ImageRowContent = {
  url: "",
  alt_text: "",
  asset_id: null,
  caption: "",
};

/* ---------- public renderer ------------------------------------- */
interface FrontendProps {
  row: PageRow;
}

const FOCAL: Record<string, string> = {
  top: "center top",
  center: "center center",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
};

const ImageRow = ({ row }: FrontendProps) => {
  const data = (row.content || {}) as ImageRowContent;
  if (!data.url) return null;

  /* Image rows are page breakers by default: edge-to-edge, no padding. */
  const bleed = row.layout?.fullBleed !== false;
  /* With an admin-chosen height the picture fills the band and crops;
     on auto height it keeps its natural ratio. */
  const cropped = Boolean(row.layout?.heightMode && row.layout.heightMode !== "auto");
  const objectPosition = FOCAL[row.layout?.focalPoint || "center"];

  return (
    <RowSection row={row as any} bleed={bleed} maskShapes exactHeight={cropped}>
      <figure
        className={`relative z-10 w-full ${
          bleed ? "self-stretch flex-1 flex flex-col min-h-0" : "row-container mx-auto max-w-[1280px]"
        }`}
      >
        {/* Per acceptance criteria — strict element, no rewrites. */}
        <img
          src={data.url}
          alt={data.alt_text || ""}
          className={cropped ? "w-full h-full flex-1 min-h-0 object-cover" : "w-full h-auto"}
          style={cropped ? { objectPosition } : undefined}
          loading="lazy"
        />
        {data.caption ? (
          <figcaption
            className={
              cropped
                ? "absolute bottom-3 left-0 right-0 row-container mx-auto max-w-[1280px] text-xs font-body text-center text-white drop-shadow"
                : "mt-2 text-xs row-fg-muted font-body text-center"
            }
          >
            {data.caption}
          </figcaption>
        ) : null}
      </figure>
    </RowSection>
  );
};


/* ---------- admin editor ---------------------------------------- */
interface AdminProps {
  content: ImageRowContent;
  onChange: (field: string, value: any) => void;
}

export const ImageRowAdmin = ({ content, onChange }: AdminProps) => {
  const data = { ...IMAGE_ROW_DEFAULT, ...(content || {}) };
  const altMissing = !!data.url && !data.alt_text.trim();

  return (
    <div className="space-y-3">
      <ImagePickerField
        label="Image"
        value={data.url}
        onChange={(url) => onChange("url", url)}
        altValue={data.alt_text}
        onAltChange={(alt) => onChange("alt_text", alt)}
      />

      {altMissing && (
        <div
          role="alert"
          className="rounded-md border px-2 py-1.5 font-body text-micro"
          style={{
            borderColor: "hsl(var(--destructive) / 0.5)",
            color: "hsl(var(--destructive))",
            backgroundColor: "hsl(var(--destructive) / 0.05)",
          }}
        >
          Alt text is required. The page cannot be published until every image has descriptive accessibility text.
        </div>
      )}

      <div>
        <label
          className="font-body text-micro uppercase tracking-wider mb-1 block"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Caption (optional)
        </label>
        <input
          value={data.caption || ""}
          onChange={(e) => onChange("caption", e.target.value)}
          placeholder="Visible caption shown under the image"
          className="w-full px-2 py-1 rounded font-body text-xs border text-black"
        />
      </div>
    </div>
  );
};

export default ImageRow;
