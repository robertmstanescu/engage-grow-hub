import { useEffect, useRef } from "react";
import { startLiquid } from "./meshLiquid";

/**
 * The liquid canvas inside `.page-mesh-layer`. Mounts once for the
 * whole public site; the shader follows the page's hero settings
 * through CSS variables, so route changes cost nothing here.
 */
const PageMeshLiquid = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return startLiquid(canvas);
  }, []);
  return <canvas ref={ref} className="page-mesh-liquid" aria-hidden />;
};

export default PageMeshLiquid;
