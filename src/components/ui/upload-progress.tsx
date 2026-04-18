/**
 * UploadProgress — high-fidelity progress bar with success state.
 *
 * Three visual states:
 *   • idle      : empty bar with a small label
 *   • uploading : animated bar fills to `percent`, percentage shown
 *   • success   : bar turns accent-green and a check-mark appears
 *   • error     : bar turns destructive-red and the error message shows
 *
 * The component is purely presentational — it does not own the upload
 * lifecycle. The parent passes `status` + `percent` and switches state
 * as the underlying upload fires events.
 */

import { Check, AlertCircle } from "lucide-react";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

interface Props {
  status: UploadStatus;
  percent: number;
  fileName?: string;
  errorMessage?: string;
}

const UploadProgress = ({ status, percent, fileName, errorMessage }: Props) => {
  const clamped = Math.max(0, Math.min(100, percent));

  // Pick a fill colour per state. We use semantic tokens so this respects
  // the brand palette automatically.
  const fillColor =
    status === "success"
      ? "hsl(142 70% 45%)" // success green — matches the global "ok" tone
      : status === "error"
      ? "hsl(var(--destructive))"
      : "hsl(var(--primary))";

  const label = (() => {
    if (status === "success") return "Upload complete";
    if (status === "error") return errorMessage || "Upload failed";
    if (status === "uploading") return `${clamped}%`;
    return fileName || "Ready";
  })();

  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{
        borderColor: "hsl(var(--border) / 0.5)",
        backgroundColor: "hsl(var(--muted) / 0.15)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-body text-[11px] truncate"
          style={{ color: "hsl(var(--foreground) / 0.8)" }}
        >
          {fileName || "Lead magnet file"}
        </span>
        <span
          className="flex items-center gap-1 font-body text-[11px] font-medium tabular-nums"
          style={{ color: fillColor }}
        >
          {status === "success" && <Check size={12} />}
          {status === "error" && <AlertCircle size={12} />}
          {label}
        </span>
      </div>

      {/* Track */}
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: "hsl(var(--muted) / 0.4)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-200 ease-out"
          style={{
            width: `${status === "success" ? 100 : clamped}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
    </div>
  );
};

export default UploadProgress;
