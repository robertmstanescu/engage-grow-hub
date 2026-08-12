import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_blog_post",
  title: "Update blog post",
  description: "Update an existing blog post's title, content, excerpt, category, tags or SEO metadata. Identified by slug.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Slug of the post to update."),
    title: z.string().trim().min(1).optional(),
    content: z.string().optional(),
    excerpt: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, ...fields }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "Nothing to update — supply at least one field." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("blog_posts")
      .update(patch)
      .eq("slug", slug)
      .select("id, slug, title, status, updated_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No blog post found with slug "${slug}".` }], isError: true };
    return {
      content: [{ type: "text", text: `Updated ${data.title} (/blog/${data.slug}).` }],
      structuredContent: { post: data },
    };
  },
});
