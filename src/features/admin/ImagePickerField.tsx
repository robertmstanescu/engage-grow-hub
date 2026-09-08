import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Image, X, Crop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MediaGallery from "./MediaGallery";
import ImageAltInput from "./ImageAltInput";
import ImageShapeControl from "./ImageShapeControl";
import { IMAGE_RATIO_OPTIONS, type ImageRatioPreset } from "@/lib/imageShape";

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
  /** Optional shape/focal controls. When provided, the picker shows the
   *  shape preset + focal point UI and calls onShapeChange. */
  ratio?: string;
  focalX?: number;
  focalY?: number;
  onShapeChange?: (patch: { ratio?: string; focalX?: number; focalY?: number }) => void;
}

/**
 * <ImagePickerField/> — admin-side image picker with optional SEO alt-text input,
 * shape preset / focal point, and a simple canvas cropper.
 *
 * Lets the admin upload from disk, choose from the media gallery, paste a URL,
 * pick a display shape, set a focal point, and crop the image before saving.
 */
const ImagePickerField = ({
  label,
  value,
  onChange,
  altValue,
  onAltChange,
  ratio,
  focalX,
  focalY,
  onShapeChange,
}: Props) => {
  const [showGallery, setShowGallery] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
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
            <button onClick={() => setShowGallery(true)} className="font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-sm" style={{ backgroundColor: "hsl(var(--card) / 0.9)", color: "hsl(var(--foreground))" }}>
              <Image size={11} className="inline mr-1" />Gallery
            </button>
            <button onClick={() => inputRef.current?.click()} className="font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-sm" style={{ backgroundColor: "hsl(var(--card) / 0.9)", color: "hsl(var(--foreground))" }}>
              Replace
            </button>
            <button onClick={() => setShowCrop(true)} className="font-body text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-sm" style={{ backgroundColor: "hsl(var(--card) / 0.9)", color: "hsl(var(--foreground))" }}>
              <Crop size={11} className="inline mr-1" />Crop
            </button>
            <button onClick={() => onChange("")} className="px-2 py-1 rounded-md backdrop-blur-sm" style={{ backgroundColor: "hsl(var(--destructive) / 0.9)", color: "hsl(var(--destructive-foreground))" }}>
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
      {value && onShapeChange && (
        <ImageShapeControl
          imageUrl={value}
          ratio={ratio}
          focalX={focalX}
          focalY={focalY}
          onRatioChange={(v) => onShapeChange({ ratio: v as ImageRatioPreset, focalX, focalY })}
          onFocalChange={(x, y) => onShapeChange({ ratio, focalX: x, focalY: y })}
        />
      )}
      {showGallery && <MediaGallery isModal onSelect={onChange} onClose={() => setShowGallery(false)} />}
      {showCrop && value && (
        <CropModal
          imageUrl={value}
          onClose={() => setShowCrop(false)}
          onCrop={(file) => handleUpload(file)}
        />
      )}
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
      className="w-full mt-1.5 px-3 py-1.5 rounded-lg font-body text-xs border text-foreground"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
    />
  );
};

/* ── Simple canvas crop modal ─────────────────────────────────────────── */

const CROP_RATIOS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "21:9", value: 21 / 9 },
];

function CropModal({
  imageUrl,
  onClose,
  onCrop,
}: {
  imageUrl: string;
  onClose: () => void;
  onCrop: (file: File) => void;
}) {
  const [cropRatio, setCropRatio] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(false);
  /* The crop canvas must not be tainted: fetch the picture ourselves and
     draw from a same-origin blob URL instead of the remote address. */
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(imageUrl, { mode: "cors" });
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLocalSrc(objectUrl);
      } catch {
        if (!cancelled) setLocalSrc(imageUrl); // fall back to crossOrigin attempt
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  const resetCrop = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const rect = container.getBoundingClientRect();
    const displayW = img.clientWidth;
    const displayH = img.clientHeight;
    let w = displayW;
    let h = displayH;
    if (cropRatio) {
      const r = cropRatio;
      if (displayW / displayH > r) {
        w = displayH * r;
        h = displayH;
      } else {
        w = displayW;
        h = displayW / r;
      }
    }
    setCrop({ x: (displayW - w) / 2, y: (displayH - h) / 2, w, h });
  }, [cropRatio]);

  useEffect(() => {
    resetCrop();
  }, [cropRatio, resetCrop]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...crop };
    const img = imgRef.current;
    if (!img) return;
    const maxX = img.clientWidth - crop.w;
    const maxY = img.clientHeight - crop.h;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setCrop((c) => ({
        ...c,
        x: Math.min(Math.max(startCrop.x + dx, 0), maxX),
        y: Math.min(Math.max(startCrop.y + dy, 0), maxY),
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const applyCrop = async () => {
    const img = imgRef.current;
    if (!img || crop.w <= 0 || crop.h <= 0) return;
    setLoading(true);
    try {
      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;
      const sx = Math.max(0, Math.round(crop.x * scaleX));
      const sy = Math.max(0, Math.round(crop.y * scaleY));
      const sW = Math.min(Math.round(crop.w * scaleX), img.naturalWidth - sx);
      const sH = Math.min(Math.round(crop.h * scaleY), img.naturalHeight - sy);
      const canvas = document.createElement("canvas");
      canvas.width = sW;
      canvas.height = sH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, sx, sy, sW, sH, 0, 0, sW, sH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Crop failed");
      const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCrop(file);
      onClose();
    } catch {
      toast.error("Could not crop this picture. Try re-uploading it and cropping again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div className="bg-background rounded-lg border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-body text-sm font-semibold">Crop image</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          <div className="flex flex-wrap gap-1 mb-3">
            {CROP_RATIOS.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => setCropRatio(value)}
                className={`px-2.5 py-1 rounded-lg border font-body text-[10px] ${
                  cropRatio === value
                    ? "bg-secondary/15 border-secondary/40 text-foreground"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-lg border border-border cursor-move"
            style={{ aspectRatio: imgSize.w && imgSize.h ? `${imgSize.w} / ${imgSize.h}` : undefined }}
          >
            <img
              ref={imgRef}
              src={localSrc || imageUrl}
              crossOrigin={localSrc && localSrc.startsWith("blob:") ? undefined : "anonymous"}
              alt="Crop preview"
              className="w-full h-full object-contain"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
                resetCrop();
              }}
            />
            <div
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.w,
                height: crop.h,
              }}
              onMouseDown={handleMouseDown}
            />
          </div>
          <p className="font-body text-[10px] text-muted-foreground mt-2">Drag the highlighted area to choose what to keep.</p>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border font-body text-xs hover:bg-muted">Cancel</button>
          <button
            onClick={applyCrop}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-body text-xs hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Cropping…" : "Crop & upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImagePickerField;
