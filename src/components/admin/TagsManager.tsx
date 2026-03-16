import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";
import { Field, SectionBox } from "./site-editor/FieldComponents";

interface ServiceTagType {
  label: string;
  value: string;
  bgColor: string;
  textColor: string;
}

interface TagsData {
  service_tag_types: ServiceTagType[];
  blog_categories: string[];
}

const DEFAULT_TAGS: TagsData = {
  service_tag_types: [
    { label: "Fixed project", value: "fixed", bgColor: "#4D1B5E", textColor: "#F9F0C1" },
    { label: "Monthly retainer", value: "retainer", bgColor: "#E5C54F", textColor: "#2A0E33" },
  ],
  blog_categories: [
    "Internal Communications",
    "Employee Experience",
    "General",
  ],
};

const TagsManager = () => {
  const [tags, setTags] = useState<TagsData>(DEFAULT_TAGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "tags_config")
        .maybeSingle() as any;
      if (data?.content) setTags(data.content);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_content")
      .upsert({ section_key: "tags_config", content: tags as any, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
    if (error) toast.error("Failed to save");
    else toast.success("Tags saved");
    setSaving(false);
  };

  const addServiceTag = () => {
    setTags({
      ...tags,
      service_tag_types: [...tags.service_tag_types, { label: "New Tag", value: `tag-${Date.now()}`, bgColor: "#4D1B5E", textColor: "#FFFFFF" }],
    });
  };

  const updateServiceTag = (idx: number, field: keyof ServiceTagType, val: string) => {
    const next = [...tags.service_tag_types];
    next[idx] = { ...next[idx], [field]: val };
    setTags({ ...tags, service_tag_types: next });
  };

  const removeServiceTag = (idx: number) => {
    setTags({ ...tags, service_tag_types: tags.service_tag_types.filter((_, i) => i !== idx) });
  };

  const addBlogCategory = () => {
    setTags({ ...tags, blog_categories: [...tags.blog_categories, "New Category"] });
  };

  const updateBlogCategory = (idx: number, val: string) => {
    const next = [...tags.blog_categories];
    next[idx] = val;
    setTags({ ...tags, blog_categories: next });
  };

  const removeBlogCategory = (idx: number) => {
    setTags({ ...tags, blog_categories: tags.blog_categories.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold" style={{ color: "hsl(var(--foreground))" }}>Tags & Categories</h2>
        <button
          onClick={save}
          disabled={saving}
          className="font-display text-[10px] uppercase tracking-wider font-bold px-5 py-2 rounded-full hover:opacity-85 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          {saving ? "Saving…" : "Save Tags"}
        </button>
      </div>

      {/* Service Tag Types */}
      <SectionBox label="Service Tag Types">
        <p className="font-body text-xs text-muted-foreground mb-3">
          These appear as tag badges on service cards. The "value" is the internal ID used for styling.
        </p>
        <div className="space-y-2">
          {tags.service_tag_types.map((tag, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg border mb-2" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="flex items-center gap-2">
                <Tag size={12} className="text-muted-foreground flex-shrink-0" />
                <input
                  value={tag.label}
                  onChange={(e) => updateServiceTag(i, "label", e.target.value)}
                  placeholder="Display label"
                  className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                />
                <input
                  value={tag.value}
                  onChange={(e) => updateServiceTag(i, "value", e.target.value)}
                  placeholder="Internal value"
                  className="w-28 px-3 py-2 rounded-lg font-body text-sm border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
                />
                <button type="button" onClick={() => removeServiceTag(i)} className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center gap-3 pl-5">
                <div className="flex items-center gap-1.5">
                  <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">BG</label>
                  <input
                    type="color"
                    value={tag.bgColor || "#4D1B5E"}
                    onChange={(e) => updateServiceTag(i, "bgColor", e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Text</label>
                  <input
                    type="color"
                    value={tag.textColor || "#FFFFFF"}
                    onChange={(e) => updateServiceTag(i, "textColor", e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                  />
                </div>
                <span
                  className="ml-auto font-body text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: tag.bgColor || "#4D1B5E", color: tag.textColor || "#FFFFFF" }}>
                  {tag.label}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addServiceTag}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity mt-2"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add Tag Type
        </button>
      </SectionBox>

      {/* Blog Categories */}
      <SectionBox label="Blog Categories">
        <p className="font-body text-xs text-muted-foreground mb-3">
          Categories available when creating or editing blog posts.
        </p>
        <div className="space-y-2">
          {tags.blog_categories.map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <Tag size={12} className="text-muted-foreground flex-shrink-0" />
              <input
                value={cat}
                onChange={(e) => updateBlogCategory(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
              />
              <button type="button" onClick={() => removeBlogCategory(i)} className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBlogCategory}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity mt-2"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add Category
        </button>
      </SectionBox>
    </div>
  );
};

export default TagsManager;
