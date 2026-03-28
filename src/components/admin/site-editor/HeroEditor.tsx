import { useCallback, useRef } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Field, RichField, SectionBox, ColorField } from "./FieldComponents";
import TitleLineEditor from "./TitleLineEditor";
import SubtitleEditor from "./SubtitleEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const HeroEditor = ({ content, onChange }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawLines = content.title_lines || [];
  const titleLines: string[] = rawLines.map((line: any) =>
    typeof line === "string" ? line : (line.type === "accent"
      ? `<p><span style="color: #E5C54F">${line.text}</span></p>`
      : `<p>${line.text}</p>`)
  );

  const updateLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange("title_lines", next);
  };

  const addLine = () => onChange("title_lines", [...titleLines, "<p></p>"]);
  const removeLine = (idx: number) => onChange("title_lines", titleLines.filter((_, i) => i !== idx));

  const bgType = content.bg_type || "none";
  const bgUrl = content.bg_url || "";

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please upload an image or video file"); return;
    }
    if (file.size > 50 * 1024 * 1024) { toast.error("File must be under 50MB"); return; }

    const ext = file.name.split(".").pop();
    const path = `hero/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("editor-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
    onChange("bg_type", file.type.startsWith("video/") ? "video" : "image");
    onChange("bg_url", publicUrl);
    toast.success("Uploaded");
  }, [onChange]);

  return (
    <div className="space-y-4">
      <Field label="Label (above title)" value={content.label || ""} onChange={(v) => onChange("label", v)} />
      <Field label="Tagline (below title)" value={content.tagline || ""} onChange={(v) => onChange("tagline", v)} />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
          <button type="button" onClick={addLine} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Line
          </button>
        </div>
        <div className="space-y-2">
          {titleLines.map((line, i) => (
            <SectionBox key={i} label={`Line ${i + 1}`}>
              <div className="flex gap-2">
                <div className="flex-1"><TitleLineEditor value={line} onChange={(v) => updateLine(i, v)} /></div>
                <button type="button" onClick={() => removeLine(i)} className="self-end p-2 rounded hover:opacity-70 transition-opacity" style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </SectionBox>
          ))}
        </div>
      </div>

      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />

      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />

      <SectionBox label="Background Media">
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["none", "image", "video"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { onChange("bg_type", t); if (t === "none") onChange("bg_url", ""); }} className="font-body text-[10px] uppercase tracking-wider px-3 py-1 rounded-full transition-all" style={{ backgroundColor: bgType === t ? "hsl(var(--primary))" : "transparent", color: bgType === t ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))", border: bgType === t ? "none" : "1px solid hsl(var(--border))" }}>
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
                  {bgType === "image" ? <img src={bgUrl} alt="" className="w-full h-32 object-cover" /> : <video src={bgUrl} className="w-full h-32 object-cover" muted />}
                  <button type="button" onClick={() => { onChange("bg_url", ""); onChange("bg_type", "none"); }} className="absolute top-2 right-2 p-1 rounded-full" style={{ backgroundColor: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}>
                    <X size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </SectionBox>

      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; }} />
    </div>
  );
};

export default HeroEditor;
