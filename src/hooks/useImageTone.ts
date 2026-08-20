import { useState, useEffect } from "react";

export type ImageTone = "light" | "dark";

const sampleTone = (src: string): Promise<ImageTone> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("dark");
        return;
      }
      const w = 50;
      const h = 50;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let total = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        total += lum;
        count++;
      }
      const avg = count ? total / count : 0;
      resolve(avg > 128 ? "light" : "dark");
    };
    img.onerror = () => resolve("dark");
    img.src = src;
  });
};

/**
 * useImageTone — returns whether a remote image is overall light or dark.
 *
 * Used by blog cards to decide whether to lay a darkening gradient with
 * light text, or a lightening gradient with dark text, so the overlay
 * always guarantees readable contrast.
 */
export const useImageTone = (src: string | null | undefined): ImageTone => {
  const [tone, setTone] = useState<ImageTone>("dark");

  useEffect(() => {
    if (!src) {
      setTone("dark");
      return;
    }
    let cancelled = false;
    sampleTone(src).then((t) => {
      if (!cancelled) setTone(t);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return tone;
};
