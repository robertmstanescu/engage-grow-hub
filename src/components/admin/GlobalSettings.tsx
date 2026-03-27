import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Send, ChevronDown, ChevronUp } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import BrandingEditor from "./BrandingEditor";
import SocialLinksEditor from "./site-editor/SocialLinksEditor";
import { Field } from "./site-editor/FieldComponents";

interface SectionState {
  content: Record<string, any>;
  draft: Record<string, any>;
}

const SECTIONS = ["branding", "social_links", "footer"] as const;

const GlobalSettings = () => {
  const [data, setData] = useState<Record<string, SectionState>>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("branding");

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await supabase
        .from("site_content")
        .select("section_key, content, draft_content")
        .in("section_key", [...SECTIONS]) as any;

      const mapped: Record<string, SectionState> = {};
      for (const key of SECTIONS) {
        const row = rows?.find((r: any) => r.section_key === key);
        mapped[key] = {
          content: row?.content || {},
          draft: row?.draft_content || row?.content || {},
        };
      }
      setData(mapped);
    };
    load();
  }, []);

  const getDraft = (key: string) => data[key]?.draft || {};

  const updateField = (sectionKey: string, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        draft: { ...(prev[sectionKey]?.draft || {}), [field]: value },
      },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const key of SECTIONS) {
      const draft = data[key]?.draft || {};
      const { data: existing } = await supabase.from("site_content").select("id").eq("section_key", key).maybeSingle();
      if (existing) {
        await supabase.from("site_content").update({ draft_content: draft as any }).eq("section_key", key);
      } else {
        await supabase.from("site_content").insert({ section_key: key, content: draft, draft_content: draft } as any);
      }
    }
    toast.success("Settings draft saved");
    setSaving(false);
  };

  const publishAll = async () => {
    setPublishing(true);
    for (const key of SECTIONS) {
      const draft = data[key]?.draft || {};
      await supabase.from("site_content").upsert(
        { section_key: key, content: draft, draft_content: draft } as any,
        { onConflict: "section_key" }
      );
      invalidateSiteContent(key);
    }
    setData((prev) => {
      const next = { ...prev };
      for (const key of SECTIONS) {
        next[key] = { ...next[key], content: next[key].draft };
      }
      return next;
    });
    toast.success("Settings published!");
    setPublishing(false);
  };

  const hasChanges = SECTIONS.some((k) => JSON.stringify(data[k]?.draft) !== JSON.stringify(data[k]?.content));

  const AccordionSection = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
      <button onClick={() => setOpenSection(openSection === id ? null : id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--foreground))" }}>
        <span className="font-body text-sm font-medium">{label}</span>
        {openSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {openSection === id && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Global Settings</h2>
        <div className="flex items-center gap-2">
          <button onClick={saveAll} disabled={saving} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            <Save size={13} /> {saving ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={publishAll} disabled={publishing || !hasChanges} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40" style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            <Send size={13} /> {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <AccordionSection id="branding" label="Logo & Favicon">
        <BrandingEditor content={getDraft("branding")} onChange={(f, v) => updateField("branding", f, v)} />
      </AccordionSection>

      <AccordionSection id="footer" label="Footer Text">
        <Field
          label="Copyright Line"
          value={getDraft("footer").copyright || `© ${new Date().getFullYear()} The Magic Coffin for Silly Vampires. All rights reserved.`}
          onChange={(v) => updateField("footer", "copyright", v)}
        />
        <Field
          label="Tagline"
          value={getDraft("footer").tagline || "Based in Sweden 🇸🇪 · Operating globally"}
          onChange={(v) => updateField("footer", "tagline", v)}
        />
      </AccordionSection>

      <AccordionSection id="social" label="Social Media Links">
        <SocialLinksEditor content={getDraft("social_links")} onChange={(f, v) => updateField("social_links", f, v)} />
      </AccordionSection>
    </div>
  );
};

export default GlobalSettings;
