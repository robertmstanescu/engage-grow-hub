import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Copy, Check, Image, X } from "lucide-react";

interface MediaFile {
  name: string;
  url: string;
  created_at: string;
}

interface Props {
  onSelect?: (url: string) => void;
  isModal?: boolean;
  onClose?: () => void;
}

const MediaGallery = ({ onSelect, isModal, onClose }: Props) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    const { data, error } = await supabase.storage.from("editor-images").list("", {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) { toast.error("Failed to load media"); return; }

    // Also list subfolders
    const allFiles: MediaFile[] = [];
    const folders = data?.filter((f) => !f.metadata) || [];
    const rootFiles = data?.filter((f) => f.metadata) || [];

    for (const f of rootFiles) {
      const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(f.name);
      allFiles.push({ name: f.name, url: publicUrl, created_at: f.created_at || "" });
    }

    for (const folder of folders) {
      const { data: subFiles } = await supabase.storage.from("editor-images").list(folder.name, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (subFiles) {
        for (const sf of subFiles) {
          if (!sf.metadata) continue;
          const path = `${folder.name}/${sf.name}`;
          const { data: { publicUrl } } = supabase.storage.from("editor-images").getPublicUrl(path);
          allFiles.push({ name: path, url: publicUrl, created_at: sf.created_at || "" });
        }
      }
    }

    allFiles.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    setFiles(allFiles);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10MB`); continue; }
      const ext = file.name.split(".").pop();
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("editor-images").upload(path, file);
      if (error) toast.error(`Failed: ${file.name}`);
    }
    toast.success("Upload complete");
    setUploading(false);
    fetchFiles();
  };

  const handleDelete = async (name: string) => {
    if (!confirm("Delete this image?")) return;
    const { error } = await supabase.storage.from("editor-images").remove([name]);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    setFiles((f) => f.filter((x) => x.name !== name));
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
    toast.success("URL copied");
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
          <Image size={18} className="inline mr-2" />Media Gallery
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            <Upload size={13} /> {uploading ? "Uploading…" : "Upload"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} disabled={uploading} />
          </label>
          {isModal && onClose && (
            <button onClick={onClose} className="p-2 rounded-full hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="font-body text-sm text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</p>
      ) : files.length === 0 ? (
        <div className="py-12 text-center">
          <Image size={32} className="mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
          <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No images yet. Upload your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file) => (
            <div
              key={file.name}
              className="group relative rounded-lg overflow-hidden border aspect-square"
              style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
              <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {onSelect ? (
                  <button
                    onClick={() => { onSelect(file.url); onClose?.(); }}
                    className="px-3 py-1.5 rounded-full font-body text-[10px] uppercase tracking-wider font-medium"
                    style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                    Select
                  </button>
                ) : (
                  <button onClick={() => handleCopy(file.url)} className="p-2 rounded-full" style={{ backgroundColor: "hsl(var(--card) / 0.9)" }}>
                    {copied === file.url ? <Check size={14} style={{ color: "hsl(var(--accent))" }} /> : <Copy size={14} style={{ color: "hsl(var(--foreground))" }} />}
                  </button>
                )}
                <button onClick={() => handleDelete(file.name)} className="p-2 rounded-full" style={{ backgroundColor: "hsl(var(--destructive) / 0.9)" }}>
                  <Trash2 size={14} style={{ color: "hsl(var(--destructive-foreground))" }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
        <div className="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl p-6 shadow-2xl" style={{ backgroundColor: "hsl(var(--card))" }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default MediaGallery;
