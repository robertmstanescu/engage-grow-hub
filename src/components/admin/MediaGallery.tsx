import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Copy, Check, Image, X, Eye, Pencil } from "lucide-react";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchFiles = useCallback(async () => {
    const { data, error } = await supabase.storage.from("editor-images").list("", {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) { toast.error("Failed to load media"); return; }

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
    setTimeout(() => setCopied(null), 2500);
    toast.success("Link copied to clipboard");
  };

  const handleRename = async (oldName: string, idx: number) => {
    const newName = renameValue.trim();
    if (!newName || newName === getFileName(oldName)) {
      setRenamingIdx(null);
      return;
    }

    const dir = oldName.includes("/") ? oldName.substring(0, oldName.lastIndexOf("/") + 1) : "";
    const ext = oldName.split(".").pop();
    const newPath = `${dir}${newName}.${ext}`;

    // Supabase storage doesn't have rename — copy then delete
    const { data: blob } = await supabase.storage.from("editor-images").download(oldName);
    if (!blob) { toast.error("Failed to read file"); setRenamingIdx(null); return; }

    const { error: uploadErr } = await supabase.storage.from("editor-images").upload(newPath, blob);
    if (uploadErr) { toast.error("Rename failed"); setRenamingIdx(null); return; }

    await supabase.storage.from("editor-images").remove([oldName]);
    toast.success("Renamed");
    setRenamingIdx(null);
    fetchFiles();
  };

  const getFileName = (path: string) => {
    const base = path.includes("/") ? path.split("/").pop()! : path;
    return base.replace(/\.[^.]+$/, "");
  };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
          <Image size={18} className="inline mr-2" />Media Gallery
        </h2>
        <div className="flex items-center gap-2">
          <label
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
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

      {/* File list */}
      {loading ? (
        <p className="font-body text-sm text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>Loading…</p>
      ) : files.length === 0 ? (
        <div className="py-12 text-center">
          <Image size={32} className="mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
          <p className="font-body text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No images yet. Upload your first one!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Column headers */}
          <div
            className="grid items-center gap-3 px-3 py-2 rounded-lg font-body text-[9px] uppercase tracking-wider"
            style={{
              gridTemplateColumns: "48px 1fr 90px auto",
              color: "hsl(var(--muted-foreground))",
              backgroundColor: "hsl(var(--muted) / 0.15)",
            }}
          >
            <span />
            <span>File Name</span>
            <span>Date</span>
            <span className="text-right">Actions</span>
          </div>

          {files.map((file, idx) => (
            <div
              key={file.name}
              className="grid items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[hsl(var(--muted)/0.1)]"
              style={{
                gridTemplateColumns: "48px 1fr 90px auto",
                borderBottom: "1px solid hsl(var(--border) / 0.15)",
              }}
            >
              {/* Thumbnail */}
              <div
                className="w-12 h-12 rounded-md overflow-hidden border flex-shrink-0 cursor-pointer"
                style={{ borderColor: "hsl(var(--border) / 0.4)" }}
                onClick={() => {
                  if (onSelect) { onSelect(file.url); onClose?.(); }
                }}
              >
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
              </div>

              {/* File name (editable) */}
              <div className="min-w-0">
                {renamingIdx === idx ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(file.name, idx); if (e.key === "Escape") setRenamingIdx(null); }}
                      onBlur={() => handleRename(file.name, idx)}
                      className="flex-1 px-2 py-1 rounded font-body text-xs border min-w-0"
                      style={{ borderColor: "hsl(var(--primary) / 0.5)", backgroundColor: "hsl(var(--background))" }}
                    />
                    <span className="font-body text-[10px] text-muted-foreground">.{file.name.split(".").pop()}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setRenamingIdx(idx); setRenameValue(getFileName(file.name)); }}
                    className="flex items-center gap-1.5 text-left group min-w-0 w-full"
                  >
                    <span className="font-body text-xs truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {file.name.split("/").pop()}
                    </span>
                    <Pencil size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "hsl(var(--muted-foreground))" }} />
                  </button>
                )}
              </div>

              {/* Date */}
              <span className="font-body text-[10px] whitespace-nowrap" style={{ color: "hsl(var(--muted-foreground))" }}>
                {formatDate(file.created_at)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 justify-end">
                {onSelect && (
                  <button
                    onClick={() => { onSelect(file.url); onClose?.(); }}
                    className="font-body text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-full transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                  >
                    Select
                  </button>
                )}
                <button
                  onClick={() => setPreviewUrl(file.url)}
                  className="p-1.5 rounded-md transition-colors hover:bg-[hsl(var(--muted)/0.3)]"
                  title="Full Preview"
                  style={{ color: "hsl(var(--foreground) / 0.6)" }}
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleCopy(file.url)}
                  className="p-1.5 rounded-md transition-all"
                  title="Copy Link"
                  style={{
                    color: copied === file.url ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.6)",
                    backgroundColor: copied === file.url ? "hsl(var(--accent) / 0.15)" : "transparent",
                  }}
                >
                  {copied === file.url ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(file.name)}
                  className="p-1.5 rounded-md transition-colors hover:bg-[hsl(var(--destructive)/0.1)]"
                  title="Delete"
                  style={{ color: "hsl(var(--destructive))" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
            >
              <X size={16} />
            </button>
          </div>
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
