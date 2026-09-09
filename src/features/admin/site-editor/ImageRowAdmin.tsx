import ImagePickerField from "@/features/admin/ImagePickerField";
import ImageShapeControl from "@/features/admin/ImageShapeControl";
import { IMAGE_ROW_DEFAULT, type ImageRowContent } from "@/features/site/rows/ImageRow";

/* ---------- admin editor ---------------------------------------- */
interface AdminProps {
  content: ImageRowContent;
  onChange: (field: string, value: any) => void;
}

const ImageRowAdmin = ({ content, onChange }: AdminProps) => {
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

      <ImageShapeControl
        imageUrl={data.url}
        ratio={data.ratio}
        focalX={data.focal_x}
        focalY={data.focal_y}
        onRatioChange={(v) => onChange("ratio", v)}
        onFocalChange={(x, y) => { onChange("focal_x", x); onChange("focal_y", y); }}
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


export default ImageRowAdmin;
