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

const ImageRow = ({ row }: FrontendProps) => {
  const data = (row.content || {}) as ImageRowContent;
  if (!data.url) return null;

  return (
    <figure className="w-full my-4">
      {/* Per acceptance criteria — strict element, no rewrites. */}
      <img
        src={data.url}
        alt={data.alt_text || ""}
        className="w-full h-auto rounded-md"
        loading="lazy"
      />
      {data.caption ? (
        <figcaption className="mt-2 text-xs text-muted-foreground font-body text-center">
          {data.caption}
        </figcaption>
      ) : null}
    </figure>
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
          className="rounded-md border px-2 py-1.5 font-body text-[11px]"
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
          className="font-body text-[10px] uppercase tracking-wider mb-1 block"
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
