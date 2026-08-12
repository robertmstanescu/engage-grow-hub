import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contacts",
  title: "List contact enquiries",
  description: "List contact-form enquiries with name, email, company and message, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum number of enquiries to return."),
    search: z.string().trim().optional().describe("Filter by name, email or company (case-insensitive substring)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("contacts")
      .select("id, name, email, company, message, subscribed_to_marketing, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (search) {
      const term = `%${search}%`;
      query = query.or(`name.ilike.${term},email.ilike.${term},company.ilike.${term}`);
    }
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { contacts: data ?? [] },
    };
  },
});
