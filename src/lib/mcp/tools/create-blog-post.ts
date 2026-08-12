import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_blog_post",
  title: "Create blog post draft",
  description: "Create a new blog post. Posts are always created as drafts and must be published from the admin dashboard.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Post title."),
    slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only.").describe("URL slug."),
    content: z.string().default("").describe("Post body (HTML or rich text)."),
    excerpt: z.string().optional().describe("Short summary shown in listings."),
    category: z.string().optional().describe("Post category."),
    tags: z.array(z.string()).optional().describe("Tags for the post."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, slug, content, excerpt, category, tags }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        content: content ?? "",
        excerpt: excerpt ?? null,
        ...(category ? { category } : {}),
        ...(tags ? { tags } : {}),
        status: "draft",
      })
      .select("id, slug, title, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Draft created: ${data?.title} (/blog/${data?.slug})` }],
      structuredContent: { post: data },
    };
  },
});
