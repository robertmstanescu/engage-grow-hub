/**
 * Blog Posts service — `blog_posts` table CRUD.
 *
 * Pure data-access layer. Combine with {@link runDbAction} for toasts and
 * loading state.
 */

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PAGE_SIZE, pageRange } from "@/services/pagination";

export interface BlogPostRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  status: string;
  published_at: string | null;
  created_at: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  author_name: string | null;
  author_image: string | null;
  author_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  og_image_alt: string | null;
  tags: string[] | null;
  ai_summary: string | null;
  publish_at: string | null;
  expiry_at: string | null;
}

export const fetchAllBlogPosts = (page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const [from, to] = pageRange(page, pageSize);
  return supabase
    .from("blog_posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
};

export const fetchPublishedBlogPosts = () =>
  supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

export const insertBlogPost = (payload: Record<string, any>) =>
  supabase.from("blog_posts").insert(payload as any);

export const updateBlogPost = (id: string, payload: Record<string, any>) =>
  supabase.from("blog_posts").update(payload as any).eq("id", id);

export const deleteBlogPost = (id: string) =>
  supabase.from("blog_posts").delete().eq("id", id);
