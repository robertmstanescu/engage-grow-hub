import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pages",
  title: "List site pages",
  description: "List CMS pages with slug, title, template type and publication status.",
  inputSchema: {
    status: z.enum(["draft", "published", "scheduled"]).optional().describe("Filter by page status."),
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum number of pages to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("cms_pages")
      .select("id, slug, title, status, template_type, meta_title, meta_description, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { pages: data ?? [] },
    };
  },
});
