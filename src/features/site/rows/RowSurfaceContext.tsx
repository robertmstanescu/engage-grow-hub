/**
 * RowSurfaceContext — tells a nested <RowSection/> that its ROW already
 * painted the surface (background colour, edge shapes, height, padding,
 * optional cover image) around ALL of the row's widgets.
 *
 * Why: every widget renders a full legacy row component, and each of
 * those calls <RowSection/>. In a row holding two widgets side by side
 * that produced two coloured bands with two rounded caps and a seam in
 * between. With this flag the row paints once and each widget renders
 * as a bare, transparent content block on top.
 */
import { createContext, useContext } from "react";

const RowSurfaceContext = createContext(false);

export const RowSurfaceProvider = RowSurfaceContext.Provider;

/** True when an ancestor row already painted this row's surface. */
export const useInsideRowSurface = () => useContext(RowSurfaceContext);

export default RowSurfaceContext;
