import { useAnalyticsBeacon } from "@/hooks/useAnalyticsBeacon";

/**
 * Mounts the unified analytics beacon. Lives in its own component so
 * the hook (which depends on `useLocation`) only runs inside the router.
 */
const AnalyticsBeaconMount = () => {
  useAnalyticsBeacon();
  return null;
};

export default AnalyticsBeaconMount;
