/**
 * MediaGallery — folder-based media library admin tab.
 *
 * Architecture
 * ────────────
 *   • Left rail : folder tree (root + 1 level of subfolders, enforced
 *     server-side by the `enforce_media_folder_depth` trigger).
 *   • Center    : list of assets in the currently-selected folder, with a
 *     thumbnail / PDF icon, file name, type, size, and date.
 *   • Right     : when an asset is selected, a side panel slides in with
 *     editable Title / Description / Alt-Text fields and a "Move to folder"
 *     dropdown. Edits commit on blur.
 *
 * Why a full rewrite?
 *   The previous implementation listed files directly out of the
 *   `editor-images` bucket. The lead-magnet flow needs metadata (title,
 *   alt-text, folder) that only lives in `media_assets`, so the gallery
 *   must be the canonical UI for that table.
 *
 * Caching
 *   We keep folders + assets in component state and re-fetch after every
 *   mutation. Volumes are small (admin-only), so this is plenty fast.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  Folder,
  FolderPlus,
  ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import UploadProgress, { type UploadStatus } from "@/components/ui/upload-progress";
import {
  deleteAssetCompletely,
  deleteFolder,
  fetchAllAssets,
  fetchAllFolders,
  getAssetPublicUrl,
  insertFolder,
  isImageMime,
  moveAssetToFolder,
  renameFolder,
  updateAssetMetadata,
  uploadAssetWithProgress,
  type MediaAsset,
  type MediaFolder,
} from "@/services/mediaLibrary";

interface Props {
  /** When provided the gallery is in "picker" mode — clicking an asset returns its public URL. */
  onSelect?: (url: string, asset: MediaAsset) => void;
  isModal?: boolean;
  onClose?: () => void;
  /** Optional filter — only show assets matching this mime predicate. */
  mimeFilter?: (mime: string | null) => boolean;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */

const formatBytes = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ROOT_KEY = "__root__";

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */

const MediaGallery = ({ onSelect, isModal, onClose, mimeFilter }: Props) => {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadName, setUploadName] = useState<string | undefined>();
  const [uploadError, setUploadError] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Fetch all folders + all assets in parallel. */
  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: folderData }, { data: assetData }] = await Promise.all([
      fetchAllFolders(),
      fetchAllAssets(),
    ]);
    setFolders((folderData as MediaFolder[]) || []);
    setAssets((assetData as MediaAsset[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ── Folder tree: build root + 1-level children map ── */
  const { rootFolders, childMap } = useMemo(() => {
    const map = new Map<string, MediaFolder[]>();
    const roots: MediaFolder[] = [];
    folders.forEach((folder) => {
      if (folder.parent_id === null) {
        roots.push(folder);
      } else {
        const list = map.get(folder.parent_id) || [];
        list.push(folder);
        map.set(folder.parent_id, list);
      }
    });
    return { rootFolders: roots, childMap: map };
  }, [folders]);

  /* ── Filter assets by selected folder + optional mime predicate ── */
  const visibleAssets = useMemo(() => {
    const byFolder = assets.filter((asset) =>
      activeFolderId === null ? asset.folder_id === null : asset.folder_id === activeFolderId,
    );
    return mimeFilter ? byFolder.filter((asset) => mimeFilter(asset.mime_type)) : byFolder;
  }, [assets, activeFolderId, mimeFilter]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId],
  );

  /* ── Folder CRUD ── */
  const handleCreateFolder = async (parentId: string | null) => {
    const name = window.prompt(parentId ? "New subfolder name:" : "New folder name:");
    if (!name?.trim()) return;
    const { data, error } = await insertFolder(name.trim(), parentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Folder created");
    if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
    if (data) setActiveFolderId(data.id);
    refresh();
  };

  const handleRenameFolder = async (folder: MediaFolder) => {
    const next = renameValue.trim();
    setRenamingFolderId(null);
    if (!next || next === folder.name) return;
    const { error } = await renameFolder(folder.id, next);
    if (error) toast.error(error.message);
    else {
      toast.success("Renamed");
      refresh();
    }
  };

  const handleDeleteFolder = async (folder: MediaFolder) => {
    const childCount = (childMap.get(folder.id) || []).length;
    const assetCount = assets.filter((asset) => asset.folder_id === folder.id).length;
    if (childCount || assetCount) {
      toast.error(`Folder is not empty (${assetCount} files, ${childCount} subfolders).`);
      return;
    }
    if (!confirm(`Delete folder "${folder.name}"?`)) return;
    const { error } = await deleteFolder(folder.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Folder deleted");
      if (activeFolderId === folder.id) setActiveFolderId(null);
      refresh();
    }
  };

  /* ── Upload ── */
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB.");
      return;
    }
    setUploadStatus("uploading");
    setUploadPercent(0);
    setUploadName(file.name);
    setUploadError(undefined);

    const { asset, error } = await uploadAssetWithProgress({
      file,
      folderId: activeFolderId,
      onProgress: (event) => setUploadPercent(event.percent),
    });

    if (error || !asset) {
      setUploadStatus("error");
      setUploadError(error?.message || "Upload failed");
      toast.error(error?.message || "Upload failed");
      return;
    }
    setUploadStatus("success");
    setUploadPercent(100);
    toast.success("Uploaded");
    setSelectedAssetId(asset.id);
    refresh();

    // Reset the indicator after a moment so it doesn't linger.
    window.setTimeout(() => {
      setUploadStatus("idle");
      setUploadPercent(0);
    }, 2200);
  };

  /* ── Asset CRUD ── */
  const handleDeleteAsset = async (asset: MediaAsset) => {
    if (!confirm(`Delete "${asset.title || asset.storage_path}"?`)) return;
    const { error } = await deleteAssetCompletely(asset);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setSelectedAssetId(null);
      refresh();
    }
  };

  const commitAssetPatch = async (
    assetId: string,
    patch: Parameters<typeof updateAssetMetadata>[1],
  ) => {
    const { error } = await updateAssetMetadata(assetId, patch);
    if (error) toast.error(error.message);
    else refresh();
  };

  /* ── Render ── */
  const folderRow = (folder: MediaFolder, depth: number) => {
    const children = childMap.get(folder.id) || [];
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = activeFolderId === folder.id;
    const folderAssetCount = assets.filter((asset) => asset.folder_id === folder.id).length;

    return (
      <div key={folder.id}>
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors group"
          style={{
            backgroundColor: isActive ? "hsl(var(--primary) / 0.12)" : "transparent",
            paddingLeft: `${8 + depth * 14}px`,
          }}
          onClick={() => setActiveFolderId(folder.id)}
        >
          {depth === 0 && children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedFolders((prev) => {
                  const next = new Set(prev);
                  if (next.has(folder.id)) next.delete(folder.id);
                  else next.add(folder.id);
                  return next;
                });
              }}
              className="p-0.5 hover:opacity-70"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-[18px]" />
          )}
          <Folder size={13} style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
          {renamingFolderId === folder.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameFolder(folder)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameFolder(folder);
                if (e.key === "Escape") setRenamingFolderId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1.5 py-0.5 rounded font-body text-xs border min-w-0"
              style={{ borderColor: "hsl(var(--primary) / 0.5)", backgroundColor: "hsl(var(--background))" }}
            />
          ) : (
            <span
              className="flex-1 font-body text-xs truncate"
              style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
            >
              {folder.name}
            </span>
          )}
          <span className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            {folderAssetCount}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {depth === 0 && (
              <button
                title="Add subfolder"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateFolder(folder.id);
                }}
                className="p-1 hover:opacity-70"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <Plus size={11} />
              </button>
            )}
            <button
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                setRenamingFolderId(folder.id);
                setRenameValue(folder.name);
              }}
              className="p-1 hover:opacity-70"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <Edit2 size={11} />
            </button>
            <button
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder);
              }}
              className="p-1 hover:opacity-70"
              style={{ color: "hsl(var(--destructive))" }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {depth === 0 && isExpanded && children.map((child) => folderRow(child, 1))}
      </div>
    );
  };

  const folderOptionsForMove = (() => {
    const options: { id: string | null; label: string }[] = [{ id: null, label: "Root (no folder)" }];
    rootFolders.forEach((root) => {
      options.push({ id: root.id, label: root.name });
      (childMap.get(root.id) || []).forEach((child) => {
        options.push({ id: child.id, label: `${root.name} / ${child.name}` });
      });
    });
    return options;
  })();

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2
          className="font-display text-lg font-bold flex items-center gap-2"
          style={{ color: "hsl(var(--secondary))" }}
        >
          <ImageIcon size={18} /> Media Library
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreateFolder(null)}
            className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-80 transition-opacity"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
          >
            <FolderPlus size={12} /> New folder
          </button>
          <label
            className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              opacity: uploadStatus === "uploading" ? 0.6 : 1,
              pointerEvents: uploadStatus === "uploading" ? "none" : "auto",
            }}
          >
            <Upload size={12} /> Upload
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = "";
              }}
              disabled={uploadStatus === "uploading"}
            />
          </label>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:opacity-70"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Active upload feedback */}
      {uploadStatus !== "idle" && (
        <UploadProgress
          status={uploadStatus}
          percent={uploadPercent}
          fileName={uploadName}
          errorMessage={uploadError}
        />
      )}

      {/* Body grid: rail / list / detail */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "200px 1fr 280px" }}>
        {/* Folder rail */}
        <div
          className="rounded-lg border p-2 max-h-[60vh] overflow-y-auto"
          style={{ borderColor: "hsl(var(--border) / 0.4)", backgroundColor: "hsl(var(--muted) / 0.1)" }}
        >
          <div
            onClick={() => setActiveFolderId(null)}
            className="flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors"
            style={{
              backgroundColor: activeFolderId === null ? "hsl(var(--primary) / 0.12)" : "transparent",
            }}
          >
            <span className="w-[18px]" />
            <Folder size={13} style={{ color: activeFolderId === null ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
            <span
              className="flex-1 font-body text-xs"
              style={{ color: activeFolderId === null ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
            >
              Root
            </span>
            <span className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
              {assets.filter((a) => a.folder_id === null).length}
            </span>
          </div>
          {rootFolders.map((folder) => folderRow(folder, 0))}
        </div>

        {/* Asset list */}
        <div>
          {loading ? (
            <ListSkeleton rows={6} rowHeight="h-14" />
          ) : visibleAssets.length === 0 ? (
            <div
              className="rounded-lg border-2 border-dashed py-12 text-center font-body text-sm"
              style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
            >
              No files in this folder. Upload one to get started.
            </div>
          ) : (
            <div className="space-y-1">
              <div
                className="grid items-center gap-3 px-3 py-2 rounded-lg font-body text-[9px] uppercase tracking-wider"
                style={{
                  gridTemplateColumns: "44px 1fr 70px 70px",
                  color: "hsl(var(--muted-foreground))",
                  backgroundColor: "hsl(var(--muted) / 0.15)",
                }}
              >
                <span />
                <span>Title</span>
                <span>Size</span>
                <span>Date</span>
              </div>
              {visibleAssets.map((asset) => {
                const isImage = isImageMime(asset.mime_type);
                const url = getAssetPublicUrl(asset.storage_path);
                const isSelected = selectedAssetId === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      if (onSelect) {
                        onSelect(url, asset);
                        onClose?.();
                      }
                    }}
                    className="grid items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                    style={{
                      gridTemplateColumns: "44px 1fr 70px 70px",
                      backgroundColor: isSelected ? "hsl(var(--primary) / 0.08)" : "transparent",
                      borderBottom: "1px solid hsl(var(--border) / 0.15)",
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-md overflow-hidden flex items-center justify-center"
                      style={{
                        backgroundColor: "hsl(var(--muted) / 0.4)",
                        border: "1px solid hsl(var(--border) / 0.4)",
                      }}
                    >
                      {isImage ? (
                        <img src={url} alt={asset.alt_text || asset.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <FileText size={18} style={{ color: "hsl(var(--muted-foreground))" }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-xs truncate" style={{ color: "hsl(var(--foreground))" }}>
                        {asset.title || asset.storage_path.split("/").pop()}
                      </p>
                      <p className="font-body text-[10px] truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {asset.mime_type || "unknown"}
                      </p>
                    </div>
                    <span className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {formatBytes(asset.size_bytes)}
                    </span>
                    <span className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {formatDate(asset.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div
          className="rounded-lg border p-4 max-h-[60vh] overflow-y-auto space-y-3"
          style={{ borderColor: "hsl(var(--border) / 0.4)", backgroundColor: "hsl(var(--muted) / 0.1)" }}
        >
          {selectedAsset ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold" style={{ color: "hsl(var(--secondary))" }}>
                  Asset details
                </h3>
                <button
                  onClick={() => handleDeleteAsset(selectedAsset)}
                  className="p-1.5 hover:opacity-70"
                  style={{ color: "hsl(var(--destructive))" }}
                  title="Delete asset"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isImageMime(selectedAsset.mime_type) ? (
                <img
                  src={getAssetPublicUrl(selectedAsset.storage_path)}
                  alt={selectedAsset.alt_text || selectedAsset.title}
                  className="w-full rounded-md border"
                  style={{ borderColor: "hsl(var(--border) / 0.4)" }}
                />
              ) : (
                <div
                  className="w-full h-32 rounded-md border flex flex-col items-center justify-center gap-2"
                  style={{ borderColor: "hsl(var(--border) / 0.4)", backgroundColor: "hsl(var(--muted) / 0.4)" }}
                >
                  <FileText size={28} style={{ color: "hsl(var(--muted-foreground))" }} />
                  <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {selectedAsset.mime_type || "Document"}
                  </span>
                </div>
              )}

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Title
                </label>
                <input
                  defaultValue={selectedAsset.title}
                  onBlur={(e) => commitAssetPatch(selectedAsset.id, { title: e.target.value.trim() })}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                />
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Description
                </label>
                <textarea
                  defaultValue={selectedAsset.description}
                  rows={2}
                  onBlur={(e) => commitAssetPatch(selectedAsset.id, { description: e.target.value.trim() })}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border resize-none"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                />
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Alt text (max 100 chars)
                </label>
                <input
                  defaultValue={selectedAsset.alt_text}
                  maxLength={100}
                  onBlur={(e) => commitAssetPatch(selectedAsset.id, { alt_text: e.target.value.trim() })}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                />
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Move to folder
                </label>
                <select
                  value={selectedAsset.folder_id || ""}
                  onChange={async (e) => {
                    const next = e.target.value || null;
                    const { error } = await moveAssetToFolder(selectedAsset.id, next);
                    if (error) toast.error(error.message);
                    else {
                      toast.success("Moved");
                      refresh();
                    }
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                >
                  {folderOptionsForMove.map((opt) => (
                    <option key={opt.id || ROOT_KEY} value={opt.id || ""}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Public URL
                </label>
                <input
                  readOnly
                  value={getAssetPublicUrl(selectedAsset.storage_path)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-[10px] border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                />
              </div>
            </>
          ) : (
            <div className="text-center py-8 font-body text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Select an asset to view its details.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default MediaGallery;
