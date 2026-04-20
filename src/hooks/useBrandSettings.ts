import { useState, useEffect } from "react";
import { fetchPublicSection } from "@/services/siteContent";

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
}

export interface TypographyLevel {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
}

export interface BrandSettings {
  colors: BrandColor[];
  typography: {
    h1: TypographyLevel;
    h2: TypographyLevel;
    h3: TypographyLevel;
    body: TypographyLevel;
  };
}

const DEFAULT_TYPOGRAPHY: BrandSettings["typography"] = {
  h1: { fontFamily: "'Unbounded', sans-serif", fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: "1.1", fontWeight: "900" },
  h2: { fontFamily: "'Unbounded', sans-serif", fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)", lineHeight: "1.15", fontWeight: "700" },
  h3: { fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(1.1rem, 2vw, 1.5rem)", lineHeight: "1.3", fontWeight: "700" },
  body: { fontFamily: "'Inter', sans-serif", fontSize: "16px", lineHeight: "1.7", fontWeight: "400" },
};

const DEFAULT_COLORS: BrandColor[] = [
  { id: "1", name: "Violet", hex: "#4D1B5E" },
  { id: "2", name: "Gold", hex: "#E5C54F" },
  { id: "3", name: "Revolver", hex: "#2A0E33" },
  { id: "4", name: "Isabelline", hex: "#F4F0EC" },
  { id: "5", name: "Cream", hex: "#F9F0C1" },
  { id: "6", name: "White", hex: "#FFFFFF" },
];

export const DEFAULT_BRAND: BrandSettings = {
  colors: DEFAULT_COLORS,
  typography: DEFAULT_TYPOGRAPHY,
};

let cachedBrand: BrandSettings | null = null;
const listeners = new Set<(b: BrandSettings) => void>();

const notify = (b: BrandSettings) => {
  cachedBrand = b;
  listeners.forEach((fn) => fn(b));
  applyBrandCSSVars(b);
};

export const invalidateBrandSettings = () => {
  cachedBrand = null;
};

/** Apply brand settings as CSS custom properties on :root */
export const applyBrandCSSVars = (brand: BrandSettings) => {
  const root = document.documentElement;
  brand.colors.forEach((c, i) => {
    const varName = `--brand-${c.name.toLowerCase().replace(/\s+/g, "-")}`;
    root.style.setProperty(varName, c.hex);
    root.style.setProperty(`--brand-color-${i}`, c.hex);
  });

  const levels = ["h1", "h2", "h3", "body"] as const;
  for (const level of levels) {
    const t = brand.typography[level];
    root.style.setProperty(`--font-size-${level}`, t.fontSize);
    root.style.setProperty(`--line-height-${level}`, t.lineHeight);
    root.style.setProperty(`--font-weight-${level}`, t.fontWeight);
    root.style.setProperty(`--font-family-${level}`, t.fontFamily);
  }
};

export const useBrandSettings = (): BrandSettings => {
  const [brand, setBrand] = useState<BrandSettings>(cachedBrand || DEFAULT_BRAND);

  useEffect(() => {
    listeners.add(setBrand);

    if (!cachedBrand) {
      fetchPublicSection<BrandSettings>("brand_settings", "content").then(({ data }) => {
        const resolved = data?.content || DEFAULT_BRAND;
        const merged: BrandSettings = {
          colors: resolved.colors || DEFAULT_BRAND.colors,
          typography: { ...DEFAULT_BRAND.typography, ...resolved.typography },
        };
        notify(merged);
      });
    }

    return () => {
      listeners.delete(setBrand);
    };
  }, []);

  return brand;
};

export const useBrandColors = (): BrandColor[] => {
  const brand = useBrandSettings();
  return brand.colors;
};
