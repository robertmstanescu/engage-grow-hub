import { useState, useEffect } from "react";
import { fetchPublicSection } from "@/services/siteContent";
...
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

    return () => { listeners.delete(setBrand); };
  }, []);

  return brand;
};

/** Just the colors, for quick-pick UIs */
export const useBrandColors = (): BrandColor[] => {
  const brand = useBrandSettings();
  return brand.colors;
};
