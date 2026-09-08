import { useEffect, useRef } from "react";
import { startBlooms } from "./meshBlooms";

/**
 * The blooms canvas inside `.page-mesh-layer`. Mounts once for the
 * whole public site; the shader follows the page's hero settings
 * through CSS variables, so route changes cost nothing here.
 */
const PageMeshBlooms = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return startBlooms(canvas);
  }, []);
  return <canvas ref={ref} className="page-mesh-blooms" aria-hidden />;
};

export default PageMeshBlooms;
