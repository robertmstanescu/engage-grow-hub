import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import FaviconManager from "@/features/site/FaviconManager";
import SiteContentInvalidator from "@/components/app/SiteContentInvalidator";
import BrandLoader from "@/components/app/BrandLoader";
import HighlightListener from "@/components/app/HighlightListener";

/**
 * Bundle of headless mounts that run for the entire app lifetime:
 * toasts, favicon, brand-vars loader, cache-bust bridge, and the
 * cross-frame highlight listener. Keeps `App.tsx` to routing-only.
 */
const GlobalMounts = () => (
  <>
    <Toaster />
    <Sonner />
    <FaviconManager />
    <SiteContentInvalidator />
    <BrandLoader />
    <HighlightListener />
  </>
);

export default GlobalMounts;
