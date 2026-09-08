import { useEffect, useRef } from "react";
import { startAurora } from "./meshAurora";

/**
 * The aurora canvas inside `.page-mesh-layer`. Mounts once for the
 * whole public site; the shader follows the page's hero settings
 * through CSS variables, so route changes cost nothing here.
 */
const PageMeshAurora = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return startAurora(canvas);
  }, []);
  return <canvas ref={ref} className="page-mesh-aurora" aria-hidden />;
};

export default PageMeshAurora;
