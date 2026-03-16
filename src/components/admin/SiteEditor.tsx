import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, ChevronDown, ChevronUp, Eye, Send, FileText } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import SocialLinksEditor from "./site-editor/SocialLinksEditor";
import HeroEditor from "./site-editor/HeroEditor";
import IntroEditor from "./site-editor/IntroEditor";
import PillarEditor from "./site-editor/PillarEditor";
import VowsEditor from "./site-editor/VowsEditor";
import ContactEditor from "./site-editor/ContactEditor";

interface SectionData {
  section_key: string;
  content: Record<string, any>;
  draft_content: Record<string, any> | null;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Section",
  intro: "Intro Strip",
  pillar_comms: "Pillar 01 — Internal Communications",
  pillar_ex: "Pillar 02 — Employee Experience",
  vows: "Vows Section",
  contact: "Contact Section",
  social_links: "Social Media Links",
};

const SECTION_ORDER = ["hero", "intro", "pillar_comms", "services_comms", "pillar_ex", "services_ex", "vows", "contact", "social_links"];
const HIDDEN_SECTIONS = new Set(["services_comms", "services_ex"]);

const SiteEditor = () => {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [openSection, setOpenSection] = useState<string | null>("hero");
  const [saving, setSaving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("section_key, content, draft_content")
        .order("section_key") as any;
      if (data) {
        // Initialise editing state from draft_content (fallback to content)
        const mapped = data.map((s: any) => ({
          section_key: s.section_key,
          content: s.content,
          draft_content: s.draft_content || s.content,
        }));
        setSections(mapped);
      }
    };
    fetchAll();
  }, []);

  const getSection = (key: string) => sections.find((s) => s.section_key === key);
  const getDraft = (key: string) => getSection(key)?.draft_content || getSection(key)?.content || {};

  const updateField = (sectionKey: string, field: string, value: any) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_key === sectionKey
          ? { ...s, draft_content: { ...(s.draft_content || s.content), [field]: value } }
          : s
      )
    );
  };

  const updateFullDraft = (sectionKey: string, draft: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) => (s.section_key === sectionKey ? { ...s, draft_content: draft } : s))
    );
  };

  // Save draft only
  const saveDraft = async (sectionKey: string) => {
    setSaving(sectionKey);
    const section = getSection(sectionKey);
    if (!section) { setSaving(null); return; }

    const { error } = await supabase
      .from("site_content")
      .update({ draft_content: (section.draft_content || section.content) as any })
      .eq("section_key", sectionKey);

    if (error) toast.error(error.message);
    else toast.success(`${SECTION_LABELS[sectionKey] || sectionKey} draft saved`);
    setSaving(null);
  };

  const savePillarDraft = async (pillarKey: string, servicesKey: string) => {
    setSaving(pillarKey);
    const pillar = getSection(pillarKey);
    const services = getSection(servicesKey);

    await Promise.all([
      pillar ? supabase.from("site_content").update({ draft_content: (pillar.draft_content || pillar.content) as any }).eq("section_key", pillarKey) : Promise.resolve({ error: null }),
      services ? supabase.from("site_content").update({ draft_content: (services.draft_content || services.content) as any }).eq("section_key", servicesKey) : Promise.resolve({ error: null }),
    ]);

    toast.success(`${SECTION_LABELS[pillarKey] || pillarKey} draft saved`);
    setSaving(null);
  };

  // Publish all drafts → content
  const publishAll = async () => {
    setPublishing(true);

    // First save all current draft states
    const updates = sections.map((s) =>
      supabase
        .from("site_content")
        .update({
          content: (s.draft_content || s.content) as any,
          draft_content: (s.draft_content || s.content) as any,
        })
        .eq("section_key", s.section_key)
    );

    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error((err.error as any).message);
    } else {
      // Update local state
      setSections((prev) =>
        prev.map((s) => ({ ...s, content: s.draft_content || s.content }))
      );
      // Invalidate all caches
      sections.forEach((s) => invalidateSiteContent(s.section_key));
      toast.success("All changes published!");
    }
    setPublishing(false);
  };

  // Preview draft in new tab
  const openPreview = () => {
    // Save all drafts first, then open preview
    const saveAll = sections.map((s) =>
      supabase
        .from("site_content")
        .update({ draft_content: (s.draft_content || s.content) as any })
        .eq("section_key", s.section_key)
    );
    Promise.all(saveAll).then(() => {
      window.open("/?preview=1", "_blank");
    });
  };

  // Check if any section has unsaved changes (draft differs from content)
  const hasChanges = sections.some(
    (s) => JSON.stringify(s.draft_content) !== JSON.stringify(s.content)
  );

  const renderEditor = (sectionKey: string) => {
    const draft = getDraft(sectionKey);
    const onChange = (field: string, value: any) => updateField(sectionKey, field, value);

    switch (sectionKey) {
      case "hero":
        return <HeroEditor content={draft} onChange={onChange} />;
      case "intro":
        return <IntroEditor content={draft} onChange={onChange} />;
      case "pillar_comms":
        return (
          <PillarEditor
            pillarContent={draft}
            servicesContent={getDraft("services_comms")}
            onPillarChange={onChange}
            onServicesChange={(svcs) => updateFullDraft("services_comms", { services: svcs })}
          />
        );
      case "pillar_ex":
        return (
          <PillarEditor
            pillarContent={draft}
            servicesContent={getDraft("services_ex")}
            onPillarChange={onChange}
            onServicesChange={(svcs) => updateFullDraft("services_ex", { services: svcs })}
          />
        );
      case "vows":
        return <VowsEditor content={draft} onChange={onChange} />;
      case "contact":
        return <ContactEditor content={draft} onChange={onChange} />;
      case "social_links":
        return <SocialLinksEditor content={draft} onChange={onChange} />;
      default:
        return <p className="font-body text-xs text-muted-foreground">Unknown section</p>;
    }
  };

  const visibleSections = SECTION_ORDER.filter((k) => !HIDDEN_SECTIONS.has(k) && getSection(k));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
          Edit Main Page
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={openPreview}
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}>
            <Eye size={13} /> Preview
          </button>
          <button
            onClick={publishAll}
            disabled={publishing || !hasChanges}
            className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            <Send size={13} /> {publishing ? "Publishing…" : "Publish All"}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg font-body text-xs"
          style={{ backgroundColor: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent-foreground))" }}>
          <FileText size={13} />
          You have unpublished draft changes. Preview or publish when ready.
        </div>
      )}

      {visibleSections.map((key) => {
        const isPillar = key === "pillar_comms" || key === "pillar_ex";
        const servicesKey = key === "pillar_comms" ? "services_comms" : key === "pillar_ex" ? "services_ex" : "";

        return (
          <div
            key={key}
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
            <button
              onClick={() => setOpenSection(openSection === key ? null : key)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity"
              style={{ color: "hsl(var(--foreground))" }}>
              <span className="font-body text-sm font-medium">{SECTION_LABELS[key] || key}</span>
              {openSection === key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openSection === key && (
              <div className="px-4 pb-4 space-y-4">
                {renderEditor(key)}
                <button
                  onClick={() => isPillar ? savePillarDraft(key, servicesKey) : saveDraft(key)}
                  disabled={saving === key}
                  className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <Save size={13} /> {saving === key ? "Saving…" : "Save Draft"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SiteEditor;
