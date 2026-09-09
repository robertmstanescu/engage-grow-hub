import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EyebrowField, Field, SectionBox, SelectField } from "@/features/admin/site-editor/FieldComponents";
import { ALL_POSTS_LABEL } from "@/features/site/AllPostsButton";

/**
 * FromTheBlogAdmin — the row's four decisions: heading, which categories
 * come first, how many posts, and the link text. The categories are the
 * ones that exist on published posts, ticked on or off.
 */
interface Props {
  content: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

const FromTheBlogAdmin = ({ content, onChange }: Props) => {
  const [categories, setCategories] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("blog_posts")
      .select("category, status")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data || []) as Array<{ category: string | null; status?: string | null }>;
        const seen = new Set<string>();
        for (const r of rows) if (r.category && (!r.status || r.status === "published")) seen.add(r.category);
        setCategories(Array.from(seen));
      }, () => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  const chosen: string[] = Array.isArray(content.categories) ? content.categories.map(String) : [];
  const toggle = (c: string) => onChange("categories", chosen.includes(c) ? chosen.filter((x) => x !== c) : [...chosen, c]);
  // A category chosen earlier that no longer has a published post still shows, so it can be unticked.
  const options = Array.from(new Set([...(categories || []), ...chosen]));

  return (
    <div className="space-y-3">
      <EyebrowField
        value={String(content.eyebrow || "")}
        color={String(content.color_eyebrow || "")}
        onChange={(v) => onChange("eyebrow", v)}
        onColorChange={(v) => onChange("color_eyebrow", v)}
      />
      <Field label="Heading" value={typeof content.title === "string" ? content.title : "From the blog"} onChange={(v) => onChange("title", v)} />
      <SectionBox label="Show these categories first" group>
        <p className="font-body text-xs text-muted-foreground mb-2">Newest posts fill the row when these run out. Nothing ticked means simply the newest posts.</p>
        {categories === null ? (
          <p className="font-body text-xs text-muted-foreground">Looking up categories…</p>
        ) : options.length === 0 ? (
          <p className="font-body text-xs text-muted-foreground">No published posts yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {options.map((c) => (
              <li key={c}>
                <label className="flex items-center gap-2 font-body text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={chosen.includes(c)} onChange={() => toggle(c)} className="accent-current" />
                  {c}
                </label>
              </li>
            ))}
          </ul>
        )}
      </SectionBox>
      <SelectField
        label="How many posts"
        value={String(content.limit ?? 3)}
        onChange={(v) => onChange("limit", Number(v) || 3)}
        options={[{ label: "Three (one row)", value: "3" }, { label: "Six (two rows)", value: "6" }]}
      />
      <Field label="Button text" value={typeof content.link_label === "string" ? content.link_label : ALL_POSTS_LABEL} onChange={(v) => onChange("link_label", v)} hint="The button leads to the blog, filtered by the first category above. Empty hides it." />
    </div>
  );
};

export default FromTheBlogAdmin;
