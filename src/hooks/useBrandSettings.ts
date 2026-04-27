import { useState, useEffect } from "react";
import { fetchPublicSiteContentValue } from "@/services/publicSiteContent";

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

export interface BrandIdentity {
  /** Display name used as the default <title> suffix and in JSON-LD. */
  brandName: string;
  /** Optional one-line tagline (used when no page title is set). */
  tagline: string;
  /**
   * Canonical origin (no trailing slash) used for <link rel="canonical">,
   * sitemap entries, llms.txt etc. Falls back to the current window
   * origin when empty.
   */
  canonicalOrigin: string;
}

export interface BrandSettings {
  identity: BrandIdentity;
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
  { id: "1", name: "Primary", hex: "#2A0E33" },
  { id: "2", name: "Accent", hex: "#E5C54F" },
  { id: "3", name: "Neutral", hex: "#F4F0EC" },
];

/**
 * Brand identity defaults are intentionally NEUTRAL. They are placeholders
 * a tenant overrides on first edit; nothing brand-specific should ever
 * ship in this constant.
 */
const DEFAULT_IDENTITY: BrandIdentity = {
  brandName: "My Site",
  tagline: "",
  canonicalOrigin: "",
};

export const DEFAULT_BRAND: BrandSettings = {
  identity: DEFAULT_IDENTITY,
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
  // Map named brand colors
  brand.colors.forEach((c, i) => {
    const varName = `--brand-${c.name.toLowerCase().replace(/\s+/g, "-")}`;
    root.style.setProperty(varName, c.hex);
    root.style.setProperty(`--brand-color-${i}`, c.hex);
  });
  // Typography
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
      fetchPublicSiteContentValue<Partial<BrandSettings>>("brand_settings")
        .then((resolved) => {
          const merged: BrandSettings = {
            identity: { ...DEFAULT_BRAND.identity, ...(resolved?.identity || {}) },
            colors: resolved?.colors || DEFAULT_BRAND.colors,
            typography: { ...DEFAULT_BRAND.typography, ...resolved?.typography },
          };
          notify(merged);
        })
        .catch(() => {
          notify(DEFAULT_BRAND);
        });
    }

    return () => { listeners.delete(setBrand); };
  }, []);

  return brand;
};

/** Just the colors, for quick-pick UIs */
export const useBrandColors = (): BrandColor[] => {
  const brand = useBrandSettings();
  return brand.colors;
};

/**
 * Async one-shot fetch of brand identity (name / tagline / canonical
 * origin). Used by non-React code paths like the page-meta hook on
 * its first render — they need the values before the React tree has
 * had a chance to broadcast them via `useBrandSettings`.
 */
export const fetchBrandIdentity = async (): Promise<BrandIdentity> => {
  if (cachedBrand) return cachedBrand.identity;
  try {
    const resolved = await fetchPublicSiteContentValue<Partial<BrandSettings>>("brand_settings");
    return { ...DEFAULT_BRAND.identity, ...(resolved?.identity || {}) };
  } catch {
    return DEFAULT_BRAND.identity;
  }
};
