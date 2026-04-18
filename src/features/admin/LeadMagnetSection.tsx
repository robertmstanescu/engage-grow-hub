/**
 * LeadMagnetSection — dual-upload UI used inside the BlogEditor.
 *
 * Two file inputs:
 *   1. "Resource Document"  → registered as a media_assets row, id stored
 *      on the post as `lead_magnet_asset_id`.
 *   2. "Cover Image"        → optional; same treatment, stored as
 *      `lead_magnet_cover_id`.
 *
 * Each upload streams real progress through {@link uploadAssetWithProgress}
 * and renders a {@link UploadProgress} bar that flips to a green check on
 * success or a red error message on failure.
 *
 * The folder dropdown lets the admin route the uploaded files into the
 * Media Library folder of their choice. We keep folder list fresh on
 * mount — admin volumes are tiny so a single fetch is fine.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, ImageIcon, X } from "lucide-react";
import UploadProgress, { type UploadStatus } from "@/components/ui/upload-progress";
import {
  fetchAllAssets,
  fetchAllFolders,
  getAssetPublicUrl,
  isImageMime,
  uploadAssetWithProgress,
  type MediaAsset,
  type MediaFolder,
} from "@/services/mediaLibrary";

interface Props {
  resourceAssetId: string | null;
  coverAssetId: string | null;
  onChange: (next: { resource_asset_id: string | null; cover_asset_id: string | null }) => void;
}

interface SlotState {
  status: UploadStatus;
  percent: number;
  fileName?: string;
  errorMessage?: string;
}

const initialSlot: SlotState = { status: "idle", percent: 0 };

const LeadMagnetSection = ({ resourceAssetId, coverAssetId, onChange }: Props) => {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [resourceSlot, setResourceSlot] = useState<SlotState>(initialSlot);
  const [coverSlot, setCoverSlot] = useState<SlotState>(initialSlot);

  /** Initial load: folders + every asset (for resolving previously-selected ids). */
  useEffect(() => {
    Promise.all([fetchAllFolders(), fetchAllAssets()]).then(([folderRes, assetRes]) => {
      setFolders((folderRes.data as MediaFolder[]) || []);
      setAssets((assetRes.data as MediaAsset[]) || []);
    });
  }, []);

  /** Build the same flat folder dropdown shape used by MediaGallery. */
  const folderOptions = useMemo(() => {
    const roots = folders.filter((folder) => folder.parent_id === null);
    const childMap = new Map<string, MediaFolder[]>();
    folders.forEach((folder) => {
      if (folder.parent_id) {
        const list = childMap.get(folder.parent_id) || [];
        list.push(folder);
        childMap.set(folder.parent_id, list);
      }
    });
    const list: { id: string | null; label: string }[] = [{ id: null, label: "Root (no folder)" }];
    roots.forEach((root) => {
      list.push({ id: root.id, label: root.name });
      (childMap.get(root.id) || []).forEach((child) => {
        list.push({ id: child.id, label: `${root.name} / ${child.name}` });
      });
    });
    return list;
  }, [folders]);

  const resourceAsset = useMemo(
    () => assets.find((a) => a.id === resourceAssetId) || null,
    [assets, resourceAssetId],
  );
  const coverAsset = useMemo(
    () => assets.find((a) => a.id === coverAssetId) || null,
    [assets, coverAssetId],
  );

  /**
   * Generic upload runner shared by both slots. Keeping it inline (not a
   * separate hook) keeps the slot ↔ state wiring obvious in one place.
   */
  const runUpload = async (
    file: File,
    slot: "resource" | "cover",
    onDone: (assetId: string) => void,
  ) => {
    const setSlot = slot === "resource" ? setResourceSlot : setCoverSlot;
    setSlot({ status: "uploading", percent: 0, fileName: file.name });

    const { asset, error } = await uploadAssetWithProgress({
      file,
      folderId,
      onProgress: (event) => setSlot((prev) => ({ ...prev, percent: event.percent })),
    });

    if (error || !asset) {
      setSlot({ status: "error", percent: 0, fileName: file.name, errorMessage: error?.message });
      toast.error(error?.message || "Upload failed");
      return;
    }
    setSlot({ status: "success", percent: 100, fileName: file.name });
    setAssets((prev) => [asset, ...prev]);
    onDone(asset.id);
    toast.success(`${slot === "resource" ? "Resource" : "Cover"} uploaded`);
  };

  const handleResourceFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds 50MB.");
      return;
    }
    runUpload(file, "resource", (id) =>
      onChange({ resource_asset_id: id, cover_asset_id: coverAssetId }),
    );
  };

  const handleCoverFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Cover must be an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover image exceeds 5MB.");
      return;
    }
    runUpload(file, "cover", (id) =>
      onChange({ resource_asset_id: resourceAssetId, cover_asset_id: id }),
    );
  };

  const inputClass = "w-full px-3 py-2 rounded-lg font-body text-sm border";
  const inputStyle = {
    borderColor: "hsl(var(--border))",
    backgroundColor: "hsl(var(--card))",
    color: "hsl(var(--foreground))",
  } as const;

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--muted) / 0.2)" }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label
          className="font-body text-[10px] uppercase tracking-wider font-medium block"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Lead Magnet (gated download)
        </label>
        <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          Optional — when set, the resource widget is rendered at the bottom of the post.
        </p>
      </div>

      <div>
        <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
          Save uploads to folder
        </label>
        <select
          value={folderId || ""}
          onChange={(e) => setFolderId(e.target.value || null)}
          className={inputClass}
          style={inputStyle}
        >
          {folderOptions.map((opt) => (
            <option key={opt.id || "__root__"} value={opt.id || ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Resource slot */}
      <div className="space-y-2">
        <label className="font-body text-[10px] uppercase tracking-wider block" style={{ color: "hsl(var(--muted-foreground))" }}>
          Resource Document
        </label>
        {resourceAsset ? (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
          >
            <FileText size={18} style={{ color: "hsl(var(--primary))" }} />
            <div className="flex-1 min-w-0">
              <p className="font-body text-xs truncate" style={{ color: "hsl(var(--foreground))" }}>
                {resourceAsset.title || resourceAsset.storage_path.split("/").pop()}
              </p>
              <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                {resourceAsset.mime_type || "unknown"}
              </p>
            </div>
            <button
              onClick={() => onChange({ resource_asset_id: null, cover_asset_id: coverAssetId })}
              className="p-1.5 hover:opacity-70"
              style={{ color: "hsl(var(--destructive))" }}
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label
            className="block w-full px-3 py-3 rounded-lg border-2 border-dashed text-center cursor-pointer hover:opacity-80 transition-opacity font-body text-xs"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
          >
            <FileText size={16} className="inline mr-1.5" />
            Upload PDF, DOCX, or any file
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                handleResourceFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {resourceSlot.status !== "idle" && (
          <UploadProgress
            status={resourceSlot.status}
            percent={resourceSlot.percent}
            fileName={resourceSlot.fileName}
            errorMessage={resourceSlot.errorMessage}
          />
        )}
      </div>

      {/* Cover slot */}
      <div className="space-y-2">
        <label className="font-body text-[10px] uppercase tracking-wider block" style={{ color: "hsl(var(--muted-foreground))" }}>
          Cover Image (optional — falls back to resource if it's an image)
        </label>
        {coverAsset ? (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
          >
            {isImageMime(coverAsset.mime_type) ? (
              <img
                src={getAssetPublicUrl(coverAsset.storage_path)}
                alt={coverAsset.alt_text || coverAsset.title}
                className="w-10 h-10 rounded object-cover"
              />
            ) : (
              <ImageIcon size={18} style={{ color: "hsl(var(--primary))" }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-body text-xs truncate" style={{ color: "hsl(var(--foreground))" }}>
                {coverAsset.title || coverAsset.storage_path.split("/").pop()}
              </p>
              <p className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                {coverAsset.mime_type || "unknown"}
              </p>
            </div>
            <button
              onClick={() => onChange({ resource_asset_id: resourceAssetId, cover_asset_id: null })}
              className="p-1.5 hover:opacity-70"
              style={{ color: "hsl(var(--destructive))" }}
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label
            className="block w-full px-3 py-3 rounded-lg border-2 border-dashed text-center cursor-pointer hover:opacity-80 transition-opacity font-body text-xs"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
          >
            <ImageIcon size={16} className="inline mr-1.5" />
            Upload cover image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleCoverFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {coverSlot.status !== "idle" && (
          <UploadProgress
            status={coverSlot.status}
            percent={coverSlot.percent}
            fileName={coverSlot.fileName}
            errorMessage={coverSlot.errorMessage}
          />
        )}
      </div>
    </div>
  );
};

export default LeadMagnetSection;
