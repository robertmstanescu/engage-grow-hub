/**
 * LeadMagnetEditor — picks a resource asset + optional cover asset
 * from the media library for a Lead Magnet page row.
 *
 * For speed in this first pass we let the admin paste an asset id
 * (visible from the Media Gallery list) and override the heading /
 * description. A future iteration can add an asset picker modal.
 */

import { useEffect, useState } from "react";
import { fetchAllAssets, type MediaAsset, isImageMime } from "@/services/mediaLibrary";
import { DeferredInput, DeferredTextarea } from "./DeferredInput";

interface Props {
  content: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}

const LeadMagnetEditor = ({ content, onChange }: Props) => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);

  useEffect(() => {
    fetchAllAssets().then(({ data }) => {
      if (data) setAssets(data as MediaAsset[]);
    });
  }, []);

  const update = (patch: Record<string, any>) => onChange({ ...content, ...patch });

  const inputClass =
    "w-full px-3 py-2 rounded-lg font-body text-sm border";
  const inputStyle = {
    borderColor: "hsl(var(--border))",
    backgroundColor: "hsl(var(--card))",
  } as const;

  return (
    <div className="space-y-3">
      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Resource (downloadable file)
        </label>
        <select
          className={inputClass}
          style={inputStyle}
          value={content.resource_asset_id || ""}
          onChange={(e) => update({ resource_asset_id: e.target.value || null })}
        >
          <option value="">— pick a resource —</option>
          {assets
            .filter((a) => !isImageMime(a.mime_type))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.title || a.storage_path}
              </option>
            ))}
          {/* Allow images too in case the lead magnet is itself an image */}
          {assets.filter((a) => isImageMime(a.mime_type)).map((a) => (
            <option key={a.id} value={a.id}>
              {a.title || a.storage_path} (image)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Cover image (optional)
        </label>
        <select
          className={inputClass}
          style={inputStyle}
          value={content.cover_asset_id || ""}
          onChange={(e) => update({ cover_asset_id: e.target.value || null })}
        >
          <option value="">— use resource as cover —</option>
          {assets.filter((a) => isImageMime(a.mime_type)).map((a) => (
            <option key={a.id} value={a.id}>
              {a.title || a.storage_path}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Heading override
        </label>
        <input
          className={inputClass}
          style={inputStyle}
          value={content.title || ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Defaults to asset title"
        />
      </div>

      <div>
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
          Description override
        </label>
        <textarea
          className={inputClass}
          style={inputStyle}
          rows={2}
          value={content.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Defaults to asset description"
        />
      </div>
    </div>
  );
};

export default LeadMagnetEditor;
