import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, ChevronDown, ChevronUp } from "lucide-react";
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

// Pillar+services are rendered together — hide standalone services rows
const HIDDEN_SECTIONS = new Set(["services_comms", "services_ex"]);

const SiteEditor = () => {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [openSection, setOpenSection] = useState<string | null>("hero");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("section_key, content")
        .order("section_key");
      if (data) setSections(data as SectionData[]);
    };
    fetchAll();
  }, []);

  const getSection = (key: string) => sections.find((s) => s.section_key === key);

  const updateField = (sectionKey: string, field: string, value: any) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_key === sectionKey
          ? { ...s, content: { ...s.content, [field]: value } }
          : s
      )
    );
  };

  const updateFullContent = (sectionKey: string, content: Record<string, any>) => {
    setSections((prev) =>
      prev.map((s) => (s.section_key === sectionKey ? { ...s, content } : s))
    );
  };

  const saveSection = async (sectionKey: string) => {
    setSaving(sectionKey);
    const section = getSection(sectionKey);
    if (!section) { setSaving(null); return; }

    const { error } = await supabase
      .from("site_content")
      .update({ content: section.content as any })
      .eq("section_key", sectionKey);

    if (error) {
      toast.error(error.message);
    } else {
      invalidateSiteContent(sectionKey);
      toast.success(`${SECTION_LABELS[sectionKey] || sectionKey} saved`);
    }
    setSaving(null);
  };

  const savePillar = async (pillarKey: string, servicesKey: string) => {
    setSaving(pillarKey);
    const pillar = getSection(pillarKey);
    const services = getSection(servicesKey);

    const results = await Promise.all([
      pillar ? supabase.from("site_content").update({ content: pillar.content as any }).eq("section_key", pillarKey) : Promise.resolve({ error: null }),
      services ? supabase.from("site_content").update({ content: services.content as any }).eq("section_key", servicesKey) : Promise.resolve({ error: null }),
    ]);

    const err = results.find((r) => r.error);
    if (err?.error) {
      toast.error((err.error as any).message);
    } else {
      invalidateSiteContent(pillarKey);
      invalidateSiteContent(servicesKey);
      toast.success(`${SECTION_LABELS[pillarKey] || pillarKey} saved`);
    }
    setSaving(null);
  };

  const renderEditor = (sectionKey: string) => {
    const section = getSection(sectionKey);
    if (!section) return null;
    const onChange = (field: string, value: any) => updateField(sectionKey, field, value);

    switch (sectionKey) {
      case "hero":
        return <HeroEditor content={section.content} onChange={onChange} />;
      case "intro":
        return <IntroEditor content={section.content} onChange={onChange} />;
      case "pillar_comms":
        return (
          <PillarEditor
            pillarContent={section.content}
            servicesContent={getSection("services_comms")?.content || { services: [] }}
            onPillarChange={onChange}
            onServicesChange={(svcs) => updateFullContent("services_comms", { services: svcs })}
          />
        );
      case "pillar_ex":
        return (
          <PillarEditor
            pillarContent={section.content}
            servicesContent={getSection("services_ex")?.content || { services: [] }}
            onPillarChange={onChange}
            onServicesChange={(svcs) => updateFullContent("services_ex", { services: svcs })}
          />
        );
      case "vows":
        return <VowsEditor content={section.content} onChange={onChange} />;
      case "contact":
        return <ContactEditor content={section.content} onChange={onChange} />;
      case "social_links":
        return <SocialLinksEditor content={section.content} onChange={onChange} />;
      default:
        return <p className="font-body text-xs text-muted-foreground">Unknown section</p>;
    }
  };

  const visibleSections = SECTION_ORDER.filter((k) => !HIDDEN_SECTIONS.has(k) && getSection(k));

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
        Edit Main Page
      </h2>

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
                  onClick={() => isPillar ? savePillar(key, servicesKey) : saveSection(key)}
                  disabled={saving === key}
                  className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  <Save size={13} /> {saving === key ? "Saving..." : "Save"}
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
