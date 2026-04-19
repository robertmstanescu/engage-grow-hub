/**
 * MediaGallery — folder-based media library admin tab.
 *
 * Architecture
 * ────────────
 *   • Left rail : folder tree (root + 1 level of subfolders).
 *   • Center    : list of assets in the currently-selected folder.
 *   • Right     : when an asset is selected, a detail panel with editable
 *                 Title / Filename / Description / Alt-Text fields, a
 *                 "Move to folder" dropdown, AND a "Used in" list showing
 *                 every page/post that references the asset.
 *
 * What changed in this revision (for the junior)
 * ──────────────────────────────────────────────
 * 1. Pencil/rename buttons on folders are now ALWAYS visible (not hidden
 *    behind hover) so it's discoverable that you can rename them.
 * 2. The detail panel exposes a NEW "Filename" input — committing it on
 *    blur calls `renameAssetFile`, which atomically moves the file in
 *    Storage and updates `media_assets.storage_path`. The public URL
 *    therefore changes too, which is why we re-fetch usages afterward.
 * 3. We call `findAssetUsages(asset)` whenever the selection changes, so
 *    the admin sees a "Used in" list with clickable links to every blog
 *    post / CMS page / site section that mentions the asset. This is the
 *    safety net before they hit Delete.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  ExternalLink,
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
  findAssetUsages,
  getAssetPublicUrl,
  insertFolder,
  isImageMime,
  moveAssetToFolder,
  renameAssetFile,
  renameFolder,
  updateAssetMetadata,
  uploadAssetWithProgress,
  type AssetUsage,
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

/** Strip the extension off a storage_path for use in the rename input. */
const filenameWithoutExt = (path: string) => path.replace(/\.[^.]+$/, "");

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
  // ── NEW: usage discovery for the currently-selected asset.
  // Resets to [] whenever the selection changes; we then kick off a fetch.
  const [usages, setUsages] = useState<AssetUsage[]>([]);
  const [usagesLoading, setUsagesLoading] = useState(false);

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

  /* ── Usage discovery: re-runs whenever the user picks a different asset.
   * Why a separate effect? Because the scan touches three tables and we
   * don't want to block the main `refresh()` waterfall. The selection
   * change is the only signal that should trigger a usage lookup. */
  useEffect(() => {
    if (!selectedAsset) {
      setUsages([]);
      return;
    }
    let cancelled = false;
    setUsagesLoading(true);
    findAssetUsages(selectedAsset)
      .then((found) => {
        if (!cancelled) setUsages(found);
      })
      .finally(() => {
        if (!cancelled) setUsagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAsset?.id, selectedAsset?.storage_path]);

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

  /**
   * Handler for the new "Filename" input in the detail panel.
   * Junior dev note: this is intentionally NOT debounced — the rename
   * touches Storage which is expensive, so we only fire once on blur and
   * only when the value actually changed.
   */
  const commitFilenameRename = async (asset: MediaAsset, newName: string) => {
    const current = filenameWithoutExt(asset.storage_path);
    if (newName.trim() === current) return;
    const { error } = await renameAssetFile(asset, newName);
    if (error) toast.error(error.message);
    else {
      toast.success("File renamed");
      refresh();
    }
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
          className="flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors"
          // Background + indent are dynamic per-folder, so they stay inline.
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
          <Folder size={13} className={isActive ? "text-primary" : "text-muted-foreground"} />
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
              className="flex-1 px-1.5 py-0.5 rounded font-body text-xs border border-primary/50 bg-background min-w-0"
            />
          ) : (
            <span
              className={[
                "flex-1 font-body text-xs truncate",
                isActive ? "text-primary" : "text-foreground",
              ].join(" ")}
            >
              {folder.name}
            </span>
          )}
          <span className="font-body text-[10px] text-muted-foreground">{folderAssetCount}</span>
          {/*
            Action cluster — ALWAYS visible (was hover-only before, which
            made it hard for users to discover that folders are renameable).
            We dim them with text-muted-foreground/70 + hover bumps to full.
          */}
          <div className="flex items-center gap-0.5">
            {depth === 0 && (
              <button
                title="Add subfolder"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateFolder(folder.id);
                }}
                className="p-1 text-muted-foreground/70 hover:text-foreground"
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
              className="p-1 text-muted-foreground/70 hover:text-foreground"
            >
              <Edit2 size={11} />
            </button>
            <button
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder);
              }}
              className="p-1 text-destructive/70 hover:text-destructive"
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
        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-secondary">
          <ImageIcon size={18} /> Media Library
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreateFolder(null)}
            className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-border text-foreground hover:opacity-80 transition-opacity"
          >
            <FolderPlus size={12} /> New folder
          </button>
          <label
            className="flex items-center gap-1.5 font-body text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full cursor-pointer bg-primary text-primary-foreground hover:opacity-80 transition-opacity"
            // Dim + disable while uploading — runtime flag, kept inline.
            style={{
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
              className="p-2 rounded-full text-muted-foreground hover:opacity-70"
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
      <div className="grid gap-4" style={{ gridTemplateColumns: "200px 1fr 320px" }}>
        {/* Folder rail */}
        <div className="rounded-lg border border-border/40 bg-muted/10 p-2 max-h-[60vh] overflow-y-auto">
          {/*
            "Root" is a VIRTUAL entry — it represents every asset whose
            `folder_id` is NULL, not an actual row in `media_folders`.
            That means it can't be renamed or deleted (there's nothing in
            the DB to update). The `title` tooltip explains this so admins
            know why no pencil/trash icons appear next to it. To organise
            files, create a real folder via "New folder" in the header.
          */}
          <div
            onClick={() => setActiveFolderId(null)}
            title="Root is a built-in view of files that aren't inside any folder. To organise them, create a folder using 'New folder' above — your custom folders below can be renamed."
            className="flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors"
            style={{
              backgroundColor: activeFolderId === null ? "hsl(var(--primary) / 0.12)" : "transparent",
            }}
          >
            <span className="w-[18px]" />
            <Folder size={13} className={activeFolderId === null ? "text-primary" : "text-muted-foreground"} />
            <span
              className={[
                "flex-1 font-body text-xs flex items-center gap-1.5",
                activeFolderId === null ? "text-primary" : "text-foreground",
              ].join(" ")}
            >
              Root
              <span className="font-body text-[8px] uppercase tracking-wider text-muted-foreground/70 px-1 py-px rounded bg-muted/40 border border-border/30">
                built-in
              </span>
            </span>
            <span className="font-body text-[10px] text-muted-foreground">
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
            <div className="rounded-lg border-2 border-dashed border-border py-12 text-center font-body text-sm text-muted-foreground">
              No files in this folder. Upload one to get started.
            </div>
          ) : (
            <div className="space-y-1">
              <div
                className="grid items-center gap-3 px-3 py-2 rounded-lg font-body text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/15"
                style={{ gridTemplateColumns: "44px 1fr 70px 70px" }}
              >
                <span />
                <span>Title</span>
                <span>Size</span>
                <span>Date</span>
              </div>
              {visibleAssets.map((asset) => {
                const isImage = isImageMime(asset.mime_type);
                // Pass `asset.bucket` so backfilled `editor-images` files
                // resolve to the correct CDN URL (default is media-library).
                const url = getAssetPublicUrl(asset.storage_path, asset.bucket);
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
                    className="grid items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border-b border-border/15"
                    style={{
                      gridTemplateColumns: "44px 1fr 70px 70px",
                      backgroundColor: isSelected ? "hsl(var(--primary) / 0.08)" : "transparent",
                    }}
                  >
                    <div className="w-11 h-11 rounded-md overflow-hidden flex items-center justify-center bg-muted/40 border border-border/40">
                      {isImage ? (
                        <img src={url} alt={asset.alt_text || asset.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <FileText size={18} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-xs truncate text-foreground">
                        {asset.title || asset.storage_path.split("/").pop()}
                      </p>
                      <p className="font-body text-[10px] truncate text-muted-foreground">
                        {asset.mime_type || "unknown"}
                      </p>
                    </div>
                    <span className="font-body text-[10px] text-muted-foreground">
                      {formatBytes(asset.size_bytes)}
                    </span>
                    <span className="font-body text-[10px] text-muted-foreground">
                      {formatDate(asset.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="rounded-lg border border-border/40 bg-muted/10 p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {selectedAsset ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-secondary">
                  Asset details
                </h3>
                <button
                  onClick={() => handleDeleteAsset(selectedAsset)}
                  className="p-1.5 text-destructive hover:opacity-70"
                  title="Delete asset"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isImageMime(selectedAsset.mime_type) ? (
                <img
                  src={getAssetPublicUrl(selectedAsset.storage_path, selectedAsset.bucket)}
                  alt={selectedAsset.alt_text || selectedAsset.title}
                  className="w-full rounded-md border border-border/40"
                />
              ) : (
                <div className="w-full h-32 rounded-md border border-border/40 bg-muted/40 flex flex-col items-center justify-center gap-2">
                  <FileText size={28} className="text-muted-foreground" />
                  <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                    {selectedAsset.mime_type || "Document"}
                  </span>
                </div>
              )}

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Title
                </label>
                <input
                  // `key` forces React to remount this input when the user
                  // picks a different asset, otherwise `defaultValue` would
                  // stay stuck on the first asset's title.
                  key={`title-${selectedAsset.id}`}
                  defaultValue={selectedAsset.title}
                  onBlur={(e) => commitAssetPatch(selectedAsset.id, { title: e.target.value.trim() })}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border border-border bg-background text-foreground"
                />
              </div>

              {/*
                NEW — Filename rename. Junior dev note:
                This actually MOVES the file in Supabase Storage and updates
                the DB row's `storage_path` in a single atomic helper. We
                show the extension separately because we never let users
                change it (mime types must stay valid).
              */}
              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Filename
                </label>
                <div className="flex items-center gap-1">
                  <input
                    key={`filename-${selectedAsset.id}-${selectedAsset.storage_path}`}
                    defaultValue={filenameWithoutExt(selectedAsset.storage_path)}
                    onBlur={(e) => commitFilenameRename(selectedAsset, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-md font-body text-xs border border-border bg-background text-foreground"
                  />
                  {selectedAsset.storage_path.includes(".") && (
                    <span className="font-body text-[11px] text-muted-foreground whitespace-nowrap">
                      .{selectedAsset.storage_path.split(".").pop()}
                    </span>
                  )}
                </div>
                <p className="font-body text-[9px] text-muted-foreground mt-1">
                  Renaming changes the file's public URL.
                </p>
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Description
                </label>
                <textarea
                  key={`desc-${selectedAsset.id}`}
                  defaultValue={selectedAsset.description}
                  rows={2}
                  onBlur={(e) => commitAssetPatch(selectedAsset.id, { description: e.target.value.trim() })}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border border-border bg-background text-foreground resize-none"
                />
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Alt text (max 100 chars)
                </label>
                <input
                  key={`alt-${selectedAsset.id}`}
                  defaultValue={selectedAsset.alt_text}
                  maxLength={100}
                  onBlur={(e) => commitAssetPatch(selectedAsset.id, { alt_text: e.target.value.trim() })}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
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
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-xs border border-border bg-background text-foreground"
                >
                  {folderOptionsForMove.map((opt) => (
                    <option key={opt.id || ROOT_KEY} value={opt.id || ""}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Public URL
                </label>
                <input
                  readOnly
                  value={getAssetPublicUrl(selectedAsset.storage_path, selectedAsset.bucket)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full px-2.5 py-1.5 rounded-md font-body text-[10px] border border-border bg-background text-foreground"
                />
              </div>

              {/*
                NEW — "Used in" usage list. This is the safety net before
                deleting/renaming. The list comes from `findAssetUsages`
                which scans every blog post, CMS page and site_content
                section for the asset's path / URL / id.
              */}
              <div>
                <label className="font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground">
                  Used in
                </label>
                {usagesLoading ? (
                  <p className="font-body text-[11px] text-muted-foreground italic">Scanning…</p>
                ) : usages.length === 0 ? (
                  <p className="font-body text-[11px] text-muted-foreground italic">
                    Not referenced anywhere yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {usages.map((u, i) => (
                      <li key={i} className="flex items-center gap-1.5 font-body text-[11px] text-foreground">
                        <span className="text-muted-foreground">
                          {u.source === "blog" ? "📰" : u.source === "cms" ? "📄" : "🏠"}
                        </span>
                        {u.href ? (
                          <a
                            href={u.href}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:underline truncate"
                          >
                            <span className="truncate">{u.label}</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="truncate">{u.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 font-body text-xs text-muted-foreground">
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
        <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl bg-card">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default MediaGallery;
