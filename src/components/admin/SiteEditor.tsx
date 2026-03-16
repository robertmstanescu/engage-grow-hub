import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, ChevronDown, ChevronUp } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";

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
};

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

  const updateField = (sectionKey: string, field: string, value: any) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_key === sectionKey
          ? { ...s, content: { ...s.content, [field]: value } }
          : s
      )
    );
  };

  const updateVowCard = (sectionKey: string, idx: number, field: string, value: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.section_key !== sectionKey) return s;
        const cards = [...(s.content.cards || [])];
        cards[idx] = { ...cards[idx], [field]: value };
        return { ...s, content: { ...s.content, cards } };
      })
    );
  };

  const saveSection = async (sectionKey: string) => {
    setSaving(sectionKey);
    const section = sections.find((s) => s.section_key === sectionKey);
    if (!section) return;

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

  const renderFields = (section: SectionData) => {
    const { section_key, content } = section;

    switch (section_key) {
      case "hero":
        return (
          <div className="space-y-3">
            <Field label="Label" value={content.label} onChange={(v) => updateField(section_key, "label", v)} />
            <Field label="Title Line 1" value={content.title_line1} onChange={(v) => updateField(section_key, "title_line1", v)} />
            <Field label="Accent Word" value={content.title_accent} onChange={(v) => updateField(section_key, "title_accent", v)} />
            <Field label="Title Line 2" value={content.title_line2} onChange={(v) => updateField(section_key, "title_line2", v)} />
            <TextArea label="Body" value={content.body} onChange={(v) => updateField(section_key, "body", v)} />
          </div>
        );

      case "intro":
        return (
          <div className="space-y-3">
            <TextArea label="Text (HTML allowed)" value={content.text} onChange={(v) => updateField(section_key, "text", v)} rows={4} />
          </div>
        );

      case "pillar_comms":
      case "pillar_ex":
        return (
          <div className="space-y-3">
            <Field label="Pillar Number" value={content.pillar_number} onChange={(v) => updateField(section_key, "pillar_number", v)} />
            <Field label="Title" value={content.title} onChange={(v) => updateField(section_key, "title", v)} />
            <TextArea label="Description" value={content.description} onChange={(v) => updateField(section_key, "description", v)} />
          </div>
        );

      case "vows":
        return (
          <div className="space-y-4">
            <Field label="Title Line 1" value={content.title_line1} onChange={(v) => updateField(section_key, "title_line1", v)} />
            <Field label="Title Line 2" value={content.title_line2} onChange={(v) => updateField(section_key, "title_line2", v)} />
            <div className="space-y-3">
              {(content.cards || []).map((card: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border space-y-2" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--muted) / 0.15)" }}>
                  <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">Vow {i + 1}</span>
                  <Field label="Title" value={card.title} onChange={(v) => updateVowCard(section_key, i, "title", v)} />
                  <TextArea label="Body" value={card.body} onChange={(v) => updateVowCard(section_key, i, "body", v)} rows={2} />
                </div>
              ))}
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-3">
            <Field label="Title Line 1" value={content.title_line1} onChange={(v) => updateField(section_key, "title_line1", v)} />
            <Field label="Title Line 2" value={content.title_line2} onChange={(v) => updateField(section_key, "title_line2", v)} />
            <TextArea label="Body" value={content.body} onChange={(v) => updateField(section_key, "body", v)} />
          </div>
        );

      default:
        return <p className="font-body text-xs text-muted-foreground">Unknown section</p>;
    }
  };

  const order = ["hero", "intro", "pillar_comms", "pillar_ex", "vows", "contact"];
  const sorted = [...sections].sort((a, b) => order.indexOf(a.section_key) - order.indexOf(b.section_key));

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>
        Edit Main Page
      </h2>

      {sorted.map((section) => (
        <div
          key={section.section_key}
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
          <button
            onClick={() => setOpenSection(openSection === section.section_key ? null : section.section_key)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity"
            style={{ color: "hsl(var(--foreground))" }}>
            <span className="font-body text-sm font-medium">{SECTION_LABELS[section.section_key] || section.section_key}</span>
            {openSection === section.section_key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openSection === section.section_key && (
            <div className="px-4 pb-4 space-y-4">
              {renderFields(section)}
              <button
                onClick={() => saveSection(section.section_key)}
                disabled={saving === section.section_key}
                className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                <Save size={13} /> {saving === section.section_key ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ── Reusable field components ── */
const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg font-body text-sm border"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
    />
  </div>
);

const TextArea = ({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">{label}</label>
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg font-body text-sm border resize-none"
      style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}
    />
  </div>
);

export default SiteEditor;
