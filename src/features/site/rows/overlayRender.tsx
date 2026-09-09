import type { OverlayAnchor, OverlayElement } from "@/types/rows";

export const anchorToCSS = (anchor: OverlayAnchor): React.CSSProperties => {
  const [v, h] = anchor.split("-") as [string, string];
  return {
    top: v === "top" ? 0 : v === "middle" ? "50%" : undefined,
    bottom: v === "bottom" ? 0 : undefined,
    left: h === "left" ? 0 : h === "center" ? "50%" : undefined,
    right: h === "right" ? 0 : undefined,
    transform: `translate(${h === "center" ? "-50%" : "0"}, ${v === "middle" ? "-50%" : "0"})`,
  };
};

/** Decorative overlay pictures of a row; shared by the site and the editor. */
export const renderOverlayElements = (overlays: OverlayElement[] | undefined) => {
  if (!overlays?.length) return null;
  return overlays.map((el) => {
    const posStyle = anchorToCSS(el.anchor);
    const fitStyle: React.CSSProperties =
      el.fit === "fill" ? { width: "100%", height: "100%", objectFit: "cover" }
      : el.fit === "fit" ? { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }
      : {};
    return (
      <img
        key={el.id}
        src={el.url}
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          ...posStyle,
          ...fitStyle,
          opacity: el.opacity / 100,
          transform: `${posStyle.transform || ""} rotate(${el.rotation}deg)`,
          mixBlendMode: el.blendMode as any,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    );
  });
};
