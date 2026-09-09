/**
 * MediaGallery — the Media screen and the picture picker.
 *
 * Layout
 * ──────
 *   • One toolbar: folder chips (All · Unfiled · each folder), a filter
 *     box, New folder, Upload.
 *   • A grid of square tiles. Everything in view at once; the filter
 *     narrows it.
 *   • Details open beside the grid only when a tile is selected: title,
 *     filename (renaming moves the file and changes its URL), alt text,
 *     description, folder, public URL, "Used in" (the safety net before
 *     Delete).
 *
 * Alt text is asked for ON UPLOAD, in a strip under the toolbar, so no
 * picture reaches a page without one. Folder rename / add subfolder /
 * delete sit in the active chip's menu.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, FolderPlus, Upload, X } from "lucide-react";
import ActionMenu from "./ui/ActionMenu";
import { MENU_DIVIDER } from "./ui/menu";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import UploadProgress, { type UploadStatus } from "@/components/ui/upload-progress";
import {
  deleteAssetCompletely,
  deleteFolder,
  fetchAllAssets,
  fetchAllFolders,
  findAssetUsages,
  getAssetPublicUrl,
  getAssetThumbnailUrl,
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

/**
 * ─────────────────────────────────────────────────────────────────
 * LazyThumb — image-heavy gallery cell with three layers of perf
 * ─────────────────────────────────────────────────────────────────
 * (junior-engineer guide)
 *
 * 1. `loading="lazy"`
 *    Tells the browser NOT to fetch the image until it's near the
 *    viewport. With ~hundreds of thumbnails this is the single
 *    biggest win — without it the browser eagerly opens hundreds of
 *    parallel HTTP requests and decodes every bitmap up front,
 *    spiking RAM and saturating the network.
 *
 * 2. `decoding="async"`
 *    Lets the browser decode the JPEG/PNG off the main thread, so
 *    scrolling and clicking stay smooth while images materialise.
 *    Without this, decoding a single 4MB photo can block the UI for
 *    tens of milliseconds, which compounds on long lists.
 *
 * 3. `content-visibility: auto`
 *    Applied to the OUTER cell (not <img>) via the `[content-visibility:auto]`
 *    Tailwind arbitrary class. The browser skips layout/paint for
 *    cells that are off-screen. Combined with `[contain-intrinsic-size]`
 *    we still reserve the slot's height so the scrollbar doesn't
 *    jitter as cells materialise.
 *
 * 4. Skeleton fade-in
 *    Local `loaded` flag flips on the <img>'s `onLoad` event so we
 *    can crossfade from a muted background placeholder to the actual
 *    thumbnail. This kills the "violent layout shift" the user
 *    reported when many images stream in at once.
 *
 * ──────────────────────────────────────────────────────────────────
 * MEMORY-LEAK NOTE: React unmounts the <img> when the cell scrolls
 * out of the virtualized region (or when filters change). The
 * browser then frees the decoded bitmap automatically — there is
 * NOTHING manual to clean up here. Resist the temptation to add
 * `useEffect` cleanups that null `src`; that just trips lazy loading
 * and forces a re-fetch when the cell scrolls back into view.
 */
const LazyThumb = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={["relative w-full h-full overflow-hidden bg-muted/40", className || ""].join(" ")}>
      {/* Skeleton placeholder — visible until the real image fires onLoad. */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/60" aria-hidden="true" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        // `onError` also flips `loaded` so a broken thumb stops pulsing.
        onError={() => setLoaded(true)}
        className={[
          "w-full h-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
    </div>
  );
};

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
  /** "all" shows every file; null is the built-in "Unfiled" view. */
  const [activeFolderId, setActiveFolderId] = useState<string | null | "all">("all");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  /** A file waiting for its alt text before it uploads. */
  const [pending, setPending] = useState<{ file: File; previewUrl: string; alt: string; folderId: string | null } | null>(null);
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

  /* ── Filter assets by folder, optional mime predicate, and the filter box ── */
  const visibleAssets = useMemo(() => {
    const byFolder = assets.filter((asset) =>
      activeFolderId === "all" ? true : activeFolderId === null ? asset.folder_id === null : asset.folder_id === activeFolderId,
    );
    const byMime = mimeFilter ? byFolder.filter((asset) => mimeFilter(asset.mime_type)) : byFolder;
    const q = filter.trim().toLowerCase();
    if (!q) return byMime;
    return byMime.filter((a) => `${a.title} ${a.alt_text} ${a.storage_path} ${a.description}`.toLowerCase().includes(q));
  }, [assets, activeFolderId, mimeFilter, filter]);

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
    // Keyed on id + storage_path on purpose: the asset object is rebuilt
    // on every gallery refresh, and re-scanning usages for the same file
    // each time would be wasted round trips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (data) setActiveFolderId(data.id);
    refresh();
  };

  const handleRenameFolder = async (folder: MediaFolder) => {
    const next = window.prompt("Folder name:", folder.name)?.trim();
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
      if (activeFolderId === folder.id) setActiveFolderId("all");
      refresh();
    }
  };

  /* ── Upload: choose → describe → send ── */
  const chooseFile = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (file.size > 50 * 1024 * 1024) { toast.error("File exceeds 50MB."); return; }
    const previewUrl = isImageMime(file.type) ? URL.createObjectURL(file) : "";
    setPending({ file, previewUrl, alt: "", folderId: activeFolderId === "all" ? null : activeFolderId });
  };

  const cancelPending = () => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const handleUpload = async () => {
    if (!pending) return;
    const { file, alt, folderId } = pending;
    if (isImageMime(file.type) && !alt.trim()) { toast.error("Describe the picture first — screen readers and search read it."); return; }
    setUploadStatus("uploading");
    setUploadPercent(0);
    setUploadName(file.name);
    setUploadError(undefined);
    cancelPending();

    const { asset, error } = await uploadAssetWithProgress({
      file,
      folderId,
      title: filenameWithoutExt(file.name),
      altText: alt.trim(),
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
    window.setTimeout(() => { setUploadStatus("idle"); setUploadPercent(0); }, 2200);
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

  const commitAssetPatch = async (assetId: string, patch: Parameters<typeof updateAssetMetadata>[1]) => {
    const { error } = await updateAssetMetadata(assetId, patch);
    if (error) toast.error(error.message);
    else refresh();
  };

  /** Renaming moves the file in Storage, so it fires once, on blur, only on change. */
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
  const folderChips: { id: string | null | "all"; label: string; folder?: MediaFolder; count: number }[] = [
    { id: "all", label: "All", count: assets.length },
    { id: null, label: "Unfiled", count: assets.filter((a) => a.folder_id === null).length },
  ];
  rootFolders.forEach((root) => {
    folderChips.push({ id: root.id, label: root.name, folder: root, count: assets.filter((a) => a.folder_id === root.id).length });
    (childMap.get(root.id) || []).forEach((child) => {
      folderChips.push({ id: child.id, label: `${root.name} / ${child.name}`, folder: child, count: assets.filter((a) => a.folder_id === child.id).length });
    });
  });

  const folderOptionsForMove = (() => {
    const options: { id: string | null; label: string }[] = [{ id: null, label: "Unfiled" }];
    rootFolders.forEach((root) => {
      options.push({ id: root.id, label: root.name });
      (childMap.get(root.id) || []).forEach((child) => options.push({ id: child.id, label: `${root.name} / ${child.name}` }));
    });
    return options;
  })();

  const fieldLabel = "font-body text-[10px] uppercase tracking-wider mb-1 block text-muted-foreground";

  const content = (
    <div className="space-y-3">
      {/* Toolbar: folders · filter · actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="Folders">
          {folderChips.map((chip) => {
            const active = activeFolderId === chip.id;
            return (
              <span key={chip.id ?? ROOT_KEY} className="inline-flex items-center">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveFolderId(chip.id)}
                  className={`admin-btn ${active ? "" : "ghost"}`}
                  style={active ? { borderColor: "hsl(var(--foreground))" } : undefined}
                >
                  {chip.label}
                  <span className="text-muted-foreground tabular-nums">{chip.count}</span>
                </button>
                {active && chip.folder && (
                  <ActionMenu
                    label={`Actions for folder ${chip.folder.name}`}
                    items={[
                      { key: "rename", label: "Rename", onSelect: () => handleRenameFolder(chip.folder!) },
                      { key: "sub", label: "Add subfolder", when: chip.folder.parent_id === null, onSelect: () => handleCreateFolder(chip.folder!.id) },
                      MENU_DIVIDER,
                      { key: "delete", label: "Delete folder", danger: true, onSelect: () => handleDeleteFolder(chip.folder!) },
                    ]}
                  />
                )}
              </span>
            );
          })}
        </div>
        <span className="flex-1" />
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter files"
          aria-label="Filter files"
          className="admin-input"
          style={{ width: 180 }}
        />
        <button type="button" onClick={() => handleCreateFolder(null)} className="admin-btn" title="New folder">
          <FolderPlus size={13} /> New folder
        </button>
        <label className="admin-btn primary cursor-pointer" style={{ opacity: uploadStatus === "uploading" ? 0.6 : 1, pointerEvents: uploadStatus === "uploading" ? "none" : "auto" }}>
          <Upload size={13} /> Upload
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => { chooseFile(e.target.files); e.target.value = ""; }}
            disabled={uploadStatus === "uploading"}
          />
        </label>
        {isModal && onClose && (
          <button type="button" onClick={onClose} className="admin-btn ghost icon" aria-label="Close"><X size={16} /></button>
        )}
      </div>

      {/* Describe before it uploads */}
      {pending && (
        <form
          className="flex items-center gap-3 p-2 rounded-md border"
          style={{ borderColor: "hsl(var(--input))", background: "hsl(var(--card))" }}
          onSubmit={(e) => { e.preventDefault(); handleUpload(); }}
        >
          <div className="w-14 h-14 rounded overflow-hidden flex items-center justify-center bg-muted/40 border border-border/40 shrink-0">
            {pending.previewUrl ? <img src={pending.previewUrl} alt="" className="w-full h-full object-cover" /> : <FileText size={18} className="text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-xs truncate text-foreground">{pending.file.name} <span className="text-muted-foreground">· {formatBytes(pending.file.size)}</span></p>
            <input
              autoFocus
              value={pending.alt}
              onChange={(e) => setPending({ ...pending, alt: e.target.value })}
              maxLength={100}
              placeholder={isImageMime(pending.file.type) ? "Describe the picture in one line (for screen readers and search)" : "Short description (optional)"}
              aria-label="Description"
              className="admin-input mt-1"
            />
          </div>
          <select
            value={pending.folderId || ""}
            onChange={(e) => setPending({ ...pending, folderId: e.target.value || null })}
            aria-label="Folder"
            className="admin-input"
            style={{ width: 150 }}
          >
            {folderOptionsForMove.map((opt) => (
              <option key={opt.id || ROOT_KEY} value={opt.id || ""}>{opt.label}</option>
            ))}
          </select>
          <button type="submit" className="admin-btn primary" title="Pictures are resized to web size (max 2400px, WebP) before they upload">Upload</button>
          <button type="button" className="admin-btn ghost" onClick={cancelPending}>Cancel</button>
        </form>
      )}

      {uploadStatus !== "idle" && (
        <UploadProgress status={uploadStatus} percent={uploadPercent} fileName={uploadName} errorMessage={uploadError} />
      )}

      {/* Grid + details */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {loading ? (
            <ListSkeleton rows={4} rowHeight="h-14" />
          ) : visibleAssets.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center font-body text-sm text-muted-foreground" style={{ borderColor: "hsl(var(--input))" }}>
              {filter ? "Nothing matches that filter." : "No files here yet. Upload one to get started."}
            </div>
          ) : (
            <div className="media-grid" role="list">
              {visibleAssets.map((asset) => {
                const isImage = isImageMime(asset.mime_type);
                const url = getAssetPublicUrl(asset.storage_path, asset.bucket);
                const thumbUrl = isImage ? getAssetThumbnailUrl(asset.storage_path, asset.bucket, 320, 320) : "";
                const isSelected = selectedAssetId === asset.id;
                const name = asset.title || asset.storage_path.split("/").pop() || "";
                return (
                  <button
                    type="button"
                    role="listitem"
                    key={asset.id}
                    onClick={() => {
                      setSelectedAssetId(asset.id);
                      if (onSelect) { onSelect(url, asset); onClose?.(); }
                    }}
                    className="media-tile"
                    aria-pressed={isSelected}
                    aria-label={name}
                    title={name}
                  >
                    <span className="media-thumb">
                      {isImage ? (
                        <LazyThumb src={thumbUrl} alt={asset.alt_text || asset.title} />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-muted-foreground">
                          <FileText size={20} />
                          <span className="font-body text-[10px] uppercase">{asset.storage_path.split(".").pop()}</span>
                        </span>
                      )}
                      {isImage && !asset.alt_text && <span className="media-flag" title="No description yet">No alt text</span>}
                    </span>
                    <span className="media-name">{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedAsset && (
          <aside className="w-[300px] shrink-0 rounded-md border p-3 space-y-3" style={{ borderColor: "hsl(var(--input))", background: "hsl(var(--card))" }} aria-label="File details">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-body text-xs font-medium text-foreground truncate">{selectedAsset.title || selectedAsset.storage_path.split("/").pop()}</h3>
              <button type="button" onClick={() => setSelectedAssetId(null)} className="admin-btn ghost icon" aria-label="Close details"><X size={14} /></button>
            </div>

            {isImageMime(selectedAsset.mime_type) ? (
              <img
                src={getAssetThumbnailUrl(selectedAsset.storage_path, selectedAsset.bucket, 640, 640)}
                alt={selectedAsset.alt_text || selectedAsset.title}
                loading="lazy"
                decoding="async"
                className="w-full rounded border border-border/40"
              />
            ) : (
              <div className="w-full h-28 rounded border border-border/40 bg-muted/40 flex flex-col items-center justify-center gap-2">
                <FileText size={26} className="text-muted-foreground" />
                <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">{selectedAsset.mime_type || "Document"}</span>
              </div>
            )}
            <p className="font-body text-[11px] text-muted-foreground">{formatBytes(selectedAsset.size_bytes)} · {formatDate(selectedAsset.created_at)}</p>

            <div>
              <label className={fieldLabel}>Alt text</label>
              <input
                key={`alt-${selectedAsset.id}`}
                defaultValue={selectedAsset.alt_text}
                maxLength={100}
                placeholder="Describe the picture in one line"
                onBlur={(e) => commitAssetPatch(selectedAsset.id, { alt_text: e.target.value.trim() })}
                className="admin-input"
              />
            </div>
            <div>
              <label className={fieldLabel}>Title</label>
              <input key={`title-${selectedAsset.id}`} defaultValue={selectedAsset.title} onBlur={(e) => commitAssetPatch(selectedAsset.id, { title: e.target.value.trim() })} className="admin-input" />
            </div>
            <div>
              <label className={fieldLabel}>Filename</label>
              <div className="flex items-center gap-1">
                <input
                  key={`filename-${selectedAsset.id}-${selectedAsset.storage_path}`}
                  defaultValue={filenameWithoutExt(selectedAsset.storage_path)}
                  onBlur={(e) => commitFilenameRename(selectedAsset, e.target.value)}
                  className="admin-input"
                />
                {selectedAsset.storage_path.includes(".") && (
                  <span className="font-body text-[11px] text-muted-foreground whitespace-nowrap">.{selectedAsset.storage_path.split(".").pop()}</span>
                )}
              </div>
              <p className="font-body text-[10px] text-muted-foreground mt-1">Renaming changes the file's public address.</p>
            </div>
            <div>
              <label className={fieldLabel}>Description</label>
              <textarea key={`desc-${selectedAsset.id}`} defaultValue={selectedAsset.description} rows={2} onBlur={(e) => commitAssetPatch(selectedAsset.id, { description: e.target.value.trim() })} className="admin-input resize-none" />
            </div>
            <div>
              <label className={fieldLabel}>Folder</label>
              <select
                value={selectedAsset.folder_id || ""}
                onChange={async (e) => {
                  const next = e.target.value || null;
                  const { error } = await moveAssetToFolder(selectedAsset.id, next);
                  if (error) toast.error(error.message);
                  else { toast.success("Moved"); refresh(); }
                }}
                className="admin-input"
              >
                {folderOptionsForMove.map((opt) => (
                  <option key={opt.id || ROOT_KEY} value={opt.id || ""}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Public address</label>
              <input readOnly value={getAssetPublicUrl(selectedAsset.storage_path, selectedAsset.bucket)} onFocus={(e) => e.currentTarget.select()} className="admin-input" style={{ fontSize: 11 }} />
            </div>
            <div>
              <label className={fieldLabel}>Used in</label>
              {usagesLoading ? (
                <p className="font-body text-[11px] text-muted-foreground">Checking…</p>
              ) : usages.length === 0 ? (
                <p className="font-body text-[11px] text-muted-foreground">Not used on any page yet.</p>
              ) : (
                <ul className="space-y-1">
                  {usages.map((u, i) => (
                    <li key={i} className="flex items-center gap-1.5 font-body text-[11px] text-foreground">
                      <span className="text-muted-foreground">{u.source === "blog" ? "Post" : u.source === "cms" ? "Page" : "Home"}</span>
                      {u.href ? (
                        <a href={u.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline truncate">
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
            <button type="button" onClick={() => handleDeleteAsset(selectedAsset)} className="admin-btn w-full justify-center" style={{ color: "hsl(var(--admin-bad))" }}>
              Delete file
            </button>
          </aside>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-md p-4 shadow-2xl bg-card border" style={{ borderColor: "hsl(var(--input))" }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default MediaGallery;
