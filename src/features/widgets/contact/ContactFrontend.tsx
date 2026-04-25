/**
 * ContactFrontend — public renderer for the Contact widget.
 *
 * WHY this is a re-export:
 * The canonical implementation still lives at
 * `src/features/site/rows/ContactRow.tsx` because the page-builder
 * engine (PageRows.tsx) and a handful of legacy call sites import it
 * by that path. Moving the file would force a wide rename across the
 * engine for zero behavioural gain. Instead we expose it under the
 * widget namespace so the WidgetRegistry can treat it like any other
 * modular block.
 *
 * Width-awareness: the underlying ContactRow already uses internal
 * `max-w-[900px]` and a 1-col → 2-col responsive grid, so it shrinks
 * naturally when dropped into a 50% (or 33%) column. No extra layout
 * shim is required to satisfy US 2.2's QA matrix.
 */

import ContactRow from "@/features/site/rows/ContactRow";

export { ContactRow as ContactFrontend };
export default ContactRow;
