import { useState, useRef, useEffect } from "react";
import { Upload, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MediaGallery from "./MediaGallery";
import ImageAltInput from "./ImageAltInput";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /**
   * If provided, render the SEO Alt Text input directly under the picker.
   * Pass the current alt value and a setter — same pattern as `value`/`onChange`.
   * Omit both to opt out (e.g. for icons or purely decorative pickers).
   */
  altValue?: string;
  onAltChange?: (alt: string) => void;
}

/**
 * <ImagePickerField/> — admin-side image picker with optional SEO alt-text input.
 *
 * Lets the admin upload from disk, choose from the media gallery, or paste a URL.
 * When `altValue` + `onAltChange` are passed, also renders the standardised
 * <ImageAltInput/> below the picker so the alt text lives next to the image
 * URL it describes.
 */
const ImagePickerField = ({ label, value, onChange, altValue, onAltChange }: Props) => {
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
          <img src={value} alt={altValue || label} className="w-full h-28 object-cover" />
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
      <UrlInput value={value} onCommit={onChange} />
      {value && onAltChange && (
        <ImageAltInput value={altValue ?? ""} onChange={onAltChange} />
      )}
      {showGallery && <MediaGallery isModal onSelect={onChange} onClose={() => setShowGallery(false)} />}
    </div>
  );
};

/**
 * Local deferred URL input — keeps focus and lets the admin type a
 * full URL without firing `onChange` (and thus a save) per keystroke.
 * Commits on blur or Enter.
 */
const UrlInput = ({ value, onCommit }: { value: string; onCommit: (v: string) => void }) => {
  const [local, setLocal] = useState(value || "");
  useEffect(() => { setLocal(value || ""); }, [value]);
  const commit = () => { if (local !== value) onCommit(local); };
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
      placeholder="Or paste image URL…"
      className="w-full mt-1.5 px-3 py-1.5 rounded-lg font-body text-xs border"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
    />
  );
};

export default ImagePickerField;
