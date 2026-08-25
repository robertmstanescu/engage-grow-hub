/**
 * naming.ts — one place where the admin turns system identifiers into
 * plain English.
 *
 * Vocabulary rules (agreed with the site owner, no synonyms allowed):
 *   • "Blogs"  — never Posts / Articles
 *   • "Rows"   — never sections / blocks / modules
 *   • "Live"   — never Published / Active
 * "Draft" and "Scheduled" are the other two states.
 */

/* ── state vocabulary ───────────────────────────────────────────── */

export type ContentState = "draft" | "live" | "scheduled";

/** Map a DB status (+ optional publish_at) to the admin's vocabulary. */
export const contentState = (
  status: string | null | undefined,
  publishAt?: string | null,
): ContentState => {
  if (publishAt && new Date(publishAt).getTime() > Date.now()) return "scheduled";
  return status === "published" ? "live" : "draft";
};

export const STATE_LABEL: Record<ContentState, string> = {
  draft: "Draft",
  live: "Live",
  scheduled: "Scheduled",
};

/** DB value to write for a chosen state. */
export const stateToStatus = (state: ContentState) => (state === "live" ? "published" : "draft");

/* ── glossary: internal key → human label + helper ───────────────── */

export interface Term {
  label: string;
  hint?: string;
}

export const TERMS: Record<string, Term> = {
  site_content: { label: "Homepage section", hint: "A named part of the homepage, like Hero or Contact." },
  section_key: { label: "Homepage section", hint: "Which part of the homepage this belongs to." },
  cms_pages: { label: "Pages" },
  blog_posts: { label: "Blogs" },
  page_rows: { label: "Rows", hint: "The stacked bands of content that make up the page." },
  draft_page_rows: { label: "Unsaved rows", hint: "Row changes that are not live yet." },
  slug: { label: "Web address", hint: "The part of the URL after the domain." },
  status: { label: "Visibility" },
  publish_at: { label: "Goes live on" },
  expiry_at: { label: "Stops showing on" },
  og_image: { label: "Social share image", hint: "Shown when the link is posted on social media." },
  og_image_alt: { label: "Social share image description" },
  ai_summary: { label: "AI answer summary", hint: "What AI assistants quote when they answer about this." },
  meta_title: { label: "Search title" },
  meta_description: { label: "Search description" },
  cover_image: { label: "Cover image" },
  excerpt: { label: "Short summary", hint: "Shown on the Blogs listing page." },
  entity_type: { label: "Type" },
  entity_ref: { label: "Item" },
};

export const termLabel = (key: string) => TERMS[key]?.label ?? key;
export const termHint = (key: string) => TERMS[key]?.hint;

/** Human name for a revision entity type. */
export const ENTITY_LABEL: Record<string, string> = {
  site_content: "Homepage section",
  cms_page: "Page",
  cms_pages: "Page",
  blog_post: "Blog",
  blog_posts: "Blog",
};

/* ── row naming ──────────────────────────────────────────────────── */

const ROW_TYPE_LABEL: Record<string, string> = {
  hero: "Hero",
  text: "Text",
  image: "Image",
  imageText: "Image & text",
  image_text: "Image & text",
  boxed: "Boxed cards",
  grid: "Grid",
  faq: "FAQ",
  contact: "Contact",
  service: "Service",
  testimonial: "Testimonial",
  proofBand: "Proof band",
  processSteps: "How we work",
  quoteBand: "Quote",
  ctaBand: "Call to action",
  logoCloud: "Logos",
  leadMagnet: "Lead magnet",
  profile: "Profile",
};

const stripHtml = (v: unknown) =>
  typeof v === "string" ? v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";

const truncate = (v: string, n = 34) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);

/**
 * A readable name for a builder row, derived from its own content
 * rather than a type code and index — "Hero — Comms and experience",
 * "Boxed cards — 3 cards".
 */
export const rowDisplayName = (row: any): string => {
  const type = String(row?.type ?? "row");
  const base = ROW_TYPE_LABEL[type] ?? type.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

  const titleish =
    stripHtml(row?.title) ||
    stripHtml(Array.isArray(row?.titleLines) ? row.titleLines.join(" ") : row?.titleLines) ||
    stripHtml(row?.heading) ||
    stripHtml(row?.eyebrow) ||
    stripHtml(row?.quote) ||
    truncate(stripHtml(row?.body), 40);

  if (titleish) return `${base} — ${truncate(titleish)}`;

  const items = row?.items ?? row?.cards ?? row?.boxes ?? row?.steps;
  if (Array.isArray(items) && items.length) {
    return `${base} — ${items.length} ${items.length === 1 ? "item" : "items"}`;
  }
  if (row?.image || row?.imageUrl) return `${base} — image`;
  return base;
};

/* ── change descriptions ─────────────────────────────────────────── */

const FIELD_PHRASES: Record<string, string> = {
  title: "Title",
  excerpt: "Short summary",
  content: "Article text",
  cover_image: "Cover image",
  cover_image_alt: "Cover image description",
  author_name: "Author",
  author_image: "Author photo",
  category: "Category",
  tags: "Tags",
  meta_title: "Search title",
  meta_description: "Search description",
  og_image: "Social share image",
  ai_summary: "AI answer summary",
  slug: "Web address",
  status: "Visibility",
  page_rows: "Rows",
  rows: "Rows",
};

const isEqual = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Compare two saved snapshots and describe what changed in a sentence,
 * e.g. "Cover image replaced, short summary edited".
 * Returns null when nothing comparable changed.
 */
export const describeChanges = (current: any, previous: any): string | null => {
  if (!current) return null;
  if (!previous) return "First saved version";

  const cur = current && typeof current === "object" ? current : { value: current };
  const prev = previous && typeof previous === "object" ? previous : { value: previous };

  const keys = Array.from(new Set([...Object.keys(cur), ...Object.keys(prev)]));
  const parts: string[] = [];

  for (const key of keys) {
    if (isEqual(cur[key], prev[key])) continue;
    const name = FIELD_PHRASES[key] || termLabel(key);

    if (Array.isArray(cur[key]) && Array.isArray(prev[key])) {
      const delta = cur[key].length - prev[key].length;
      if (delta > 0) parts.push(`${delta} ${name.toLowerCase()} added`);
      else if (delta < 0) parts.push(`${-delta} ${name.toLowerCase()} removed`);
      else parts.push(`${name} reordered or edited`);
      continue;
    }
    if (prev[key] == null || prev[key] === "") parts.push(`${name} added`);
    else if (cur[key] == null || cur[key] === "") parts.push(`${name} removed`);
    else if (key.includes("image")) parts.push(`${name} replaced`);
    else parts.push(`${name} edited`);
  }

  if (parts.length === 0) return null;
  const shown = parts.slice(0, 3).join(", ");
  const rest = parts.length - 3;
  return rest > 0 ? `${shown} +${rest} more` : shown;
};

/** "12 Sep 2026, 14:03" */
export const friendlyDateTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** "Goes live Saturday 12 Sep at 09:00" */
export const scheduleSentence = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `Goes live ${day} at ${time}`;
};

/* ── link naming ─────────────────────────────────────────────────── */

/** Canonical public origin, falling back to the current host. */
export const canonicalOrigin = (fromBrandSettings?: string | null) =>
  (fromBrandSettings || "").replace(/\/$/, "") ||
  (typeof window !== "undefined" ? window.location.origin : "");

export interface ContentLink {
  /** Text shown on the button, never a raw URL. */
  label: string;
  /** Where the button goes. */
  href: string;
  /** Raw URL for the tooltip / copy action. */
  raw: string;
  live: boolean;
}

/**
 * Build a friendly link for a piece of content. Live items point at the
 * real domain; drafts and scheduled items stay on the current preview
 * host behind the same human label.
 */
export const contentLink = (opts: {
  kind: "Blogs" | "Pages" | "Homepage section";
  name: string;
  path: string;
  state: ContentState;
  origin?: string | null;
}): ContentLink => {
  const live = opts.state === "live";
  const base = live
    ? canonicalOrigin(opts.origin)
    : typeof window !== "undefined"
      ? window.location.origin
      : "";
  const raw = `${base}${opts.path}`;
  return {
    label: live ? `View live — ${opts.kind}: ${opts.name}` : `Preview — ${opts.kind}: ${opts.name}`,
    href: raw,
    raw,
    live,
  };
};
