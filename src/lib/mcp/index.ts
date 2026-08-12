import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBlogPosts from "./tools/list-blog-posts";
import getBlogPost from "./tools/get-blog-post";
import createBlogPost from "./tools/create-blog-post";
import updateBlogPost from "./tools/update-blog-post";
import listPages from "./tools/list-pages";
import listContacts from "./tools/list-contacts";
import listLeads from "./tools/list-leads";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (inlined by Vite at build time, so this stays import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "the-magic-coffin-for-silly-vampires",
  title: "The Magic Coffin for Silly Vampires",
  version: "0.1.0",
  instructions:
    "Tools for The Magic Coffin for Silly Vampires. Read and edit blog posts and CMS pages, and review contact enquiries and captured leads. All tools act as the signed-in admin user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listBlogPosts,
    getBlogPost,
    createBlogPost,
    updateBlogPost,
    listPages,
    listContacts,
    listLeads,
  ],
});
