import { useBrandSettings } from "@/hooks/useBrandSettings";

/** Loads brand settings and applies their CSS variables on mount. */
const BrandLoader = () => {
  useBrandSettings();
  return null;
};

export default BrandLoader;
