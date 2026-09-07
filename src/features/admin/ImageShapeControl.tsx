import { IMAGE_RATIO_OPTIONS, clampFocal, focalObjectPosition, resolveAspectRatio } from "@/lib/imageShape";

interface Props {
  /** Current image URL — used for the focal-point preview. */
  imageUrl?: string;
  ratio?: string;
  focalX?: number;
  focalY?: number;
  onRatioChange: (v: string) => void;
  onFocalChange: (x: number, y: number) => void;
  /** Ratio used when the preset is "original" / unset (the row's own shape). */
  fallbackRatio?: number;
}

/**
 * <ImageShapeControl/> — shape preset + focal point picker.
 *
 * The admin picks a shape (square / portrait / landscape / wide / banner)
 * and then clicks the preview to say which part of the picture must stay
 * visible once it is cropped into that shape.
 */
const ImageShapeControl = ({
  imageUrl,
  ratio,
  focalX,
  focalY,
  onRatioChange,
  onFocalChange,
  fallbackRatio,
}: Props) => {
  const aspect = resolveAspectRatio(ratio, fallbackRatio) ?? 4 / 3;
  const x = clampFocal(focalX);
  const y = clampFocal(focalY);

  const pick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onFocalChange(
      Math.round(((e.clientX - r.left) / r.width) * 100),
      Math.round(((e.clientY - r.top) / r.height) * 100),
    );
  };

  return (
    <div className="mt-2">
      <label className="font-body text-[10px] uppercase tracking-wider mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>
        Image Shape
      </label>
      <select
        value={ratio || "original"}
        onChange={(e) => onRatioChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg font-body text-xs border text-black"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
      >
        {IMAGE_RATIO_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {imageUrl && (
        <>
          <p className="font-body text-[10px] mt-2 mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Click the picture to choose what stays in view when it is cropped.
          </p>
          <div
            role="button"
            tabIndex={0}
            onClick={pick}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFocalChange(50, 50); } }}
            className="relative w-full overflow-hidden rounded-lg border cursor-crosshair"
            style={{ aspectRatio: String(aspect), borderColor: "hsl(var(--border))" }}
            aria-label="Focal point picker — press Enter to reset to centre"
          >
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover pointer-events-none"
              style={{ objectPosition: focalObjectPosition(x, y) }}
            />
            <span
              className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 pointer-events-none"
              style={{ left: `${x}%`, top: `${y}%`, borderColor: "white", boxShadow: "0 0 0 1px rgba(0,0,0,.6)" }}
            />
          </div>
          <p className="font-body text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Focus point: {x}% / {y}%
          </p>
        </>
      )}
    </div>
  );
};

export default ImageShapeControl;
