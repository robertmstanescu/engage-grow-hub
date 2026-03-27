import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Sun, Moon, Image } from "lucide-react";
import { SectionBox } from "./site-editor/FieldComponents";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const BrandingEditor = ({ content, onChange }: Props) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const emblemRef = useRef<HTMLInputElement>(null);
  const faviconLightRef = useRef<HTMLInputElement>(null);
  const faviconDarkRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, field: string) => {
    setUploading(field);
    const ext = file.name.split(".").pop();
    const path = `branding/${field}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("editor-images")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Upload failed");
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("editor-images")
      .getPublicUrl(path);

    onChange(field, urlData.publicUrl);
    setUploading(null);
    toast.success("Uploaded!");
  };

  const handleFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file, field);
  };

  const ImageUploadBox = ({
    label,
    field,
    inputRef,
    icon: Icon,
    hint,
  }: {
    label: string;
    field: string;
    inputRef: React.RefObject<HTMLInputElement>;
    icon: any;
    hint: string;
  }) => {
    const url = content[field] || "";
    return (
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 block">
          {label}
        </label>
        <p className="font-body text-[10px] text-muted-foreground mb-2">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange(field)}
        />
        {url ? (
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-lg border flex items-center justify-center overflow-hidden"
              style={{
                borderColor: "hsl(var(--border))",
                backgroundColor: field.includes("dark") ? "#1a1a1a" : "#f5f5f5",
              }}>
              <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading === field}
                className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity"
                style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
                <Upload size={10} /> Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(field, "")}
                className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity"
                style={{ color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.3)" }}>
                <Trash2 size={10} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading === field}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed hover:opacity-70 transition-opacity w-full justify-center"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            <Icon size={16} />
            <span className="font-body text-xs">
              {uploading === field ? "Uploading…" : `Upload ${label}`}
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <SectionBox label="Logo">
        <ImageUploadBox
          label="Full Logo (Mobile & Tablet)"
          field="logo_url"
          inputRef={logoRef}
          icon={Image}
          hint="Shown in the mobile/tablet navbar. Recommended: PNG or SVG with transparent background."
        />
        <div className="mt-3">
          <ImageUploadBox
            label="Emblem / Icon Logo (Desktop & Footer)"
            field="emblem_logo_url"
            inputRef={emblemRef}
            icon={Image}
            hint="Small icon-only logo for the desktop side nav and footer. If not set, the full logo is used."
          />
        </div>
      </SectionBox>

      <SectionBox label="Favicon">
        <ImageUploadBox
          label="Light Theme Favicon"
          field="favicon_light"
          inputRef={faviconLightRef}
          icon={Sun}
          hint="Shown when the browser uses a light theme. Recommended: 32×32 or 64×64 PNG."
        />
        <div className="mt-3">
          <ImageUploadBox
            label="Dark Theme Favicon"
            field="favicon_dark"
            inputRef={faviconDarkRef}
            icon={Moon}
            hint="Shown when the browser uses a dark theme. If not set, the light favicon is used."
          />
        </div>
      </SectionBox>
    </div>
  );
};

export default BrandingEditor;
