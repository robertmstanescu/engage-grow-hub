import { useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Field, RichField, SectionBox, ColorField, CtaFields } from "./FieldComponents";
import TitleLinesEditor from "../editors/TitleLinesEditor";
import SubtitleEditor from "./SubtitleEditor";
import ImageAltInput from "../ImageAltInput";
import ImagePickerField from "../ImagePickerField";
import { supabase } from "@/integrations/supabase/client";
import { shrinkImage } from "@/services/imageShrink";
import { toast } from "sonner";
import { runDbAction } from "@/services/db-helpers";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  /** Live row background, forwarded to RichField for legible contrast. */
  bgColor?: string;
}

const HeroEditor = ({ content, onChange, bgColor }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bgType = content.bg_type || "none";
  const bgUrl = content.bg_url || "";

  const handleImageUpload = useCallback(async (file: File) => {
    // Hero accepts both video and image — we keep the raw upload here
    // (instead of mediaStorage.uploadEditorImage) because we need to
    // branch on the resulting MIME type to set bg_type correctly.
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please upload an image or video file"); return;
    }
    if (file.size > 50 * 1024 * 1024) { toast.error("File must be under 50MB"); return; }

    // Pictures are made web-sized before upload; video passes through.
    const upload = file.type.startsWith("image/") ? await shrinkImage(file) : file;
    const ext = upload.name.split(".").pop();
    const path = `hero/${Date.now()}.${ext}`;

    const result = await runDbAction({
      action: async () => {
        const res = await supabase.storage.from("editor-images").upload(path, upload);
        if (res.error) return { data: null, error: res.error };
        const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
        return { data: { publicUrl }, error: null };
      },
      successMessage: "Uploaded",
      errorMessage: "Upload failed",
    });

    if (result?.data?.publicUrl) {
      onChange("bg_type", file.type.startsWith("video/") ? "video" : "image");
      onChange("bg_url", result.data.publicUrl);
    }
  }, [onChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Text Alignment</label>
        <div className="flex gap-2 mt-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange("align", a)}
              className="font-body text-[10px] uppercase tracking-wider px-3 py-1 rounded-md transition-all"
              style={{
                backgroundColor: (content.align || "center") === a ? "hsl(var(--primary))" : "transparent",
                color: (content.align || "center") === a ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                border: (content.align || "center") === a ? "none" : "1px solid hsl(var(--border))",
              }}
            >
              {a === "center" ? "centre" : a}
            </button>
          ))}
        </div>
      </div>
      <Field label="Label (above title)" value={content.label || ""} onChange={(v) => onChange("label", v)} />
      <ColorField label="Label Color" description="Color of the small label text above the title" value={content.color_label || ""} fallback="" onChange={(v) => onChange("color_label", v)} />
      <Field label="Tagline (below title)" value={content.tagline || ""} onChange={(v) => onChange("tagline", v)} />
      <ColorField label="Tagline Color" description="Color of the tagline text below the title" value={content.color_tagline || ""} fallback="" onChange={(v) => onChange("color_tagline", v)} />

      <TitleLinesEditor titleLines={content.title_lines || []} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />

      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
        handwritten={!!content.subtitle_handwritten}
        onHandwrittenChange={(v) => onChange("subtitle_handwritten", v)}
      />

      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} bgColor={bgColor} />

      {/*
       * CALL TO ACTION block — Hero gets the same standardised CTA
       * group used by ImageText/Grid/Profile rows. Reads from the same
       * `cta_label` / `cta_url` / `note` keys. The public HeroSection
       * renderer should conditionally render the button when cta_label
       * is non-empty (consistency with the row renderers).
       */}
      <CtaFields content={content} onChange={onChange} />

      <SectionBox label="Background Media">
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["none", "image", "video"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { onChange("bg_type", t); if (t === "none") onChange("bg_url", ""); }} className="font-body text-[10px] uppercase tracking-wider px-3 py-1 rounded-md transition-all" style={{ backgroundColor: bgType === t ? "hsl(var(--primary))" : "transparent", color: bgType === t ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))", border: bgType === t ? "none" : "1px solid hsl(var(--border))" }}>
                {t}
              </button>
            ))}
          </div>
          {bgType !== "none" && (
            <>
              <div className="flex gap-2">
                <input value={bgUrl} onChange={(e) => onChange("bg_url", e.target.value)} placeholder={bgType === "video" ? "Paste video URL…" : "Paste image URL…"} className="flex-1 px-3 py-2 rounded-lg font-body text-sm border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-2 rounded-lg font-body text-[10px] uppercase tracking-wider hover:opacity-70" style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                  <Upload size={12} /> Upload
                </button>
              </div>
              {bgUrl && (
                <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
                  {bgType === "image" ? <img src={bgUrl} alt={content.bg_image_alt || ""} className="w-full h-32 object-cover" /> : <video src={bgUrl} className="w-full h-32 object-cover" muted />}
                  <button type="button" onClick={() => { onChange("bg_url", ""); onChange("bg_type", "none"); }} className="absolute top-2 right-2 p-1 rounded-md" style={{ backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                    <X size={12} />
                  </button>
                </div>
              )}
              {/* Alt-text only applies to images — videos don't need it (decorative loops).
                  We still render the input only when an image bg is selected, so admins
                  aren't presented with a useless field for video backgrounds. */}
              {bgType === "image" && bgUrl && (
                <ImageAltInput
                  value={content.bg_image_alt || ""}
                  onChange={(v) => onChange("bg_image_alt", v)}
                  label="Background picture description"
                  placeholder="Describe the hero background image"
                />
              )}
              {/* Poster image for video backgrounds — paints instantly while the
                  MP4 streams in, preventing a blank black hero on slow networks
                  and giving social-card scrapers a real LCP element. */}
              {bgType === "video" && bgUrl && (
                <Field
                  label="Video still picture"
                  value={content.bg_poster_url || ""}
                  onChange={(v) => onChange("bg_poster_url", v)}
                />
              )}
            </>
          )}
        </div>
      </SectionBox>

      {/* Separate from the full-bleed Background Media above — a small
          foreground photo card next to the text (HeroSection.tsx's
          `hasVisual` layout). Not mutually exclusive with bg_type in the
          data model; both fields are required together for publish. */}
      <SectionBox label="Foreground Visual (optional)">
        <ImagePickerField
          label="Visual Image"
          value={content.visual_image_url || ""}
          onChange={(v) => onChange("visual_image_url", v)}
          altValue={content.visual_image_alt || ""}
          onAltChange={(v) => onChange("visual_image_alt", v)}
        />
      </SectionBox>

      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; }} />
    </div>
  );
};

export default HeroEditor;
