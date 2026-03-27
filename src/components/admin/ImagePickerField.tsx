import { useState, useRef } from "react";
import { Upload, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MediaGallery from "./MediaGallery";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

const ImagePickerField = ({ label, value, onChange }: Props) => {
  const [showGallery, setShowGallery] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Not an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    const ext = file.name.split(".").pop();
    const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("editor-images").upload(path, file);
    if (error) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
    onChange(publicUrl);
    toast.success("Uploaded");
  };

  return (
    <div>
      <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
          <img src={value} alt="" className="w-full h-28 object-cover" />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button onClick={() => setShowGallery(true)} className="font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ backgroundColor: "hsl(var(--card) / 0.9)", color: "hsl(var(--foreground))" }}>
              <Image size={11} className="inline mr-1" />Gallery
            </button>
            <button onClick={() => inputRef.current?.click()} className="font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ backgroundColor: "hsl(var(--card) / 0.9)", color: "hsl(var(--foreground))" }}>
              Replace
            </button>
            <button onClick={() => onChange("")} className="px-2 py-1 rounded-full backdrop-blur-sm" style={{ backgroundColor: "hsl(var(--destructive) / 0.9)", color: "hsl(var(--destructive-foreground))" }}>
              <X size={11} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => inputRef.current?.click()} className="flex-1 py-5 rounded-lg border-2 border-dashed flex flex-col items-center gap-1 hover:opacity-70 transition-opacity" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            <Upload size={16} />
            <span className="font-body text-[10px]">Upload</span>
          </button>
          <button onClick={() => setShowGallery(true)} className="flex-1 py-5 rounded-lg border-2 border-dashed flex flex-col items-center gap-1 hover:opacity-70 transition-opacity" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            <Image size={16} />
            <span className="font-body text-[10px]">Gallery</span>
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Or paste image URL…" className="w-full mt-1.5 px-3 py-1.5 rounded-lg font-body text-xs border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }} />
      {showGallery && <MediaGallery isModal onSelect={onChange} onClose={() => setShowGallery(false)} />}
    </div>
  );
};

export default ImagePickerField;
