/**
 * RowNeighborContext — tells a row what its neighbours look like.
 *
 * `RowsRenderer` knows the full row list, so it computes each row's
 * surface colour once and hands the previous / next colours down. The
 * shared `<RowSection/>` reads them to fill its decorative edge shapes,
 * which is what makes a shape read as the neighbouring band bleeding
 * into this section rather than a floating decoration.
 */
import { createContext, useContext } from "react";
import { MESH_SHAPE_FILL } from "./rowSurface";

export interface RowNeighbors {
  prevSurface: string;
  nextSurface: string;
}

const RowNeighborContext = createContext<RowNeighbors>({
  prevSurface: MESH_SHAPE_FILL,
  nextSurface: MESH_SHAPE_FILL,
});

export const RowNeighborProvider = RowNeighborContext.Provider;
export const useRowNeighbors = () => useContext(RowNeighborContext);

export default RowNeighborContext;
