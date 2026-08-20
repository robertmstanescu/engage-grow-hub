/**
 * Re-exports the canonical email-campaign block model + renderer.
 *
 * The real implementation lives in supabase/functions/_shared/emailBlocks.ts
 * so the admin's live preview (this file) and the actual send
 * (supabase/functions/send-campaign/index.ts) render from the exact
 * same code instead of two independently-maintained copies that can
 * drift out of sync — see that file's header comment for the full
 * rationale.
 */
export type { EmailBlock } from "../../../supabase/functions/_shared/emailBlocks";
export { createBlock, blocksToHtml } from "../../../supabase/functions/_shared/emailBlocks";
