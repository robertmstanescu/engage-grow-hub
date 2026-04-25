import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Field, TextArea, RichField, ArrayField, SelectField, SectionBox, ColorField } from "./FieldComponents";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface Service {
  tag: string;
  tagType: string;
  tagBgColor?: string;
  tagTextColor?: string;
  title: string;
  subtitle: string;
  description: string;
  deliverables: string[];
  deliverablesLabel?: string;
  price: string;
  time: string;
  note?: string;
}

interface Props {
  pillarContent: Record<string, any>;
  servicesContent: Record<string, any>;
  onPillarChange: (field: string, value: any) => void;
  onServicesChange: (services: Service[]) => void;
  /** Live row background, forwarded to RichField for legible contrast. */
  bgColor?: string;
}

const DEFAULT_TAG_TYPES = [
  { label: "Fixed project", value: "fixed" },
  { label: "Monthly retainer", value: "retainer" },
];

type PillarColorField = {
  key: string;
  label: string;
  description: string;
  fallback: string;
};

type PillarColorGroup = {
  id: string;
  label: string;
  fields: PillarColorField[];
};

/**
 * Section colours are organised by the 4 visible "levels" of a pillar
 * row (top → accordion → CTA bar → note), each with the Text /
 * Background pair the admin actually has direct control over.
 *
 * What was REMOVED:
 *   • `color_card_bg` (was "Card Surface") — the card surface inherits
 *     from the row background and was never visibly applied; exposing
 *     it confused admins.
 *   • `color_deliverables_bg` (was "Accordion Background") — same
 *     story; the deliverables panel is transparent over the card.
 *
 * Backwards compat: any value previously saved under those two keys
 * stays in the database untouched (we just stop rendering the inputs).
 * The renderer was already tolerant of empty values.
 */
const PILLAR_COLOR_GROUPS: PillarColorGroup[] = [
  {
    id: "top",
    label: "Top — Section header",
    fields: [
      { key: "color_section_bg", label: "Background", description: "Background of the entire pillar section", fallback: "#FFFFFF" },
      { key: "color_label", label: "Eyebrow Text", description: "Small eyebrow text above the title", fallback: "#7B3A91" },
      { key: "color_heading", label: "Title Text", description: "Main heading of the pillar section", fallback: "#2A0E33" },
      { key: "color_heading_sub", label: "Description Text", description: "Description text below the title", fallback: "#2A0E33" },
      { key: "color_card_title", label: "Card Title Text", description: "Title text inside each service card", fallback: "#2A0E33" },
      { key: "color_subtitle", label: "Card Subtitle Text", description: "Subtitle text and bullet markers in cards", fallback: "#7B3A91" },
      { key: "color_card_description", label: "Card Body Text", description: "Description text inside each service card", fallback: "#555555" },
    ],
  },
  {
    id: "accordion",
    label: "Accordion — Deliverables",
    fields: [
      { key: "color_deliverables_label", label: "Toggle Text", description: "Color of the 'What's inside' toggle text", fallback: "#4D1B5E" },
    ],
  },
  {
    id: "cta",
    label: "CTA — Bottom action bar",
    fields: [
      { key: "color_meta_bg", label: "Background", description: "Background of the price/timeline footer bar", fallback: "#E5C54F" },
      { key: "color_meta_fg", label: "Text", description: "Text color in the price/timeline footer bar", fallback: "#2A0E33" },
      { key: "color_cta_text", label: "CTA Link Text", description: "Color of the price/CTA link in cards", fallback: "#E5C54F" },
      { key: "color_cta_time", label: "Timeline Text", description: "Color of the timeline text in cards", fallback: "#999999" },
    ],
  },
  {
    id: "note",
    label: "Note — Optional footnote",
    fields: [
      { key: "color_note_border", label: "Border Accent", description: "Left border color of the optional note section", fallback: "#7B3A91" },
    ],
  },
];

const PillarEditor = ({ pillarContent, servicesContent, onPillarChange, onServicesChange, bgColor }: Props) => {
  const [openCard, setOpenCard] = useState<number | null>(null);
  const [showColors, setShowColors] = useState(false);
  const [tagTypes, setTagTypes] = useState(DEFAULT_TAG_TYPES);
  const services: Service[] = servicesContent?.services || [];

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "tags_config")
        .maybeSingle() as any;
      if (data?.content?.service_tag_types) {
        setTagTypes(data.content.service_tag_types);
      }
    };
    load();
  }, []);

  const updateService = (idx: number, field: string, value: any) => {
    const next = [...services];
    next[idx] = { ...next[idx], [field]: value };
    onServicesChange(next);
  };

  const addService = () => {
    onServicesChange([...services, {
      tag: tagTypes[0]?.label || "New",
      tagType: tagTypes[0]?.value || "fixed",
      title: "New Service",
      subtitle: "",
      description: "",
      deliverables: [],
      price: "Book a free consultation",
      time: "",
    }]);
  };

  const removeService = (idx: number) => {
    onServicesChange(services.filter((_, i) => i !== idx));
    if (openCard === idx) setOpenCard(null);
  };

  return (
    <div className="space-y-4">
      <SectionBox label="Section Header">
        <Field label="Eyebrow" value={pillarContent.eyebrow || pillarContent.pillar_number || ""} onChange={(v) => onPillarChange("eyebrow", v)} />
        <Field label="Title" value={pillarContent.title || ""} onChange={(v) => onPillarChange("title", v)} />
        <RichField label="Description" value={pillarContent.description || ""} onChange={(v) => onPillarChange("description", v)} bgColor={pillarContent.color_section_bg || bgColor} />
      </SectionBox>

      <SectionBox label="Carousel Content Alignment">
        <p className="font-body text-[9px] text-muted-foreground/60 mb-2">Controls text alignment inside the carousel cards only. Does not affect the row position on screen.</p>
        <div className="flex gap-2">
          {(["left", "center", "right"] as const).map((opt) => (
            <button key={opt} type="button" onClick={() => onPillarChange("card_text_align", opt)}
              className="font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor: (pillarContent.card_text_align || "left") === opt ? "hsl(var(--primary))" : "transparent",
                color: (pillarContent.card_text_align || "left") === opt ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                border: (pillarContent.card_text_align || "left") === opt ? "none" : "1px solid hsl(var(--border))",
              }}>
              {opt}
            </button>
          ))}
        </div>
      </SectionBox>

      {/* Color overrides */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--muted) / 0.15)" }}>
        <button
          type="button"
          onClick={() => setShowColors(!showColors)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--foreground))" }}>
          <span className="font-body text-[9px] uppercase tracking-wider text-muted-foreground">Section Colors</span>
          {showColors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showColors && (
          <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
            <p className="font-body text-[9px] text-muted-foreground/60 pt-2">Organized by category. Leave empty to use defaults.</p>
            <Accordion type="multiple" className="w-full">
              {PILLAR_COLOR_GROUPS.map((group) => (
                <AccordionItem key={group.id} value={group.id} className="border-b-0">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <span className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                      {group.label}
                      <span className="ml-2 normal-case tracking-normal text-muted-foreground/50">({group.fields.length})</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {group.fields.map((cf) => (
                        <ColorField
                          key={cf.key}
                          label={cf.label}
                          description={cf.description}
                          value={pillarContent[cf.key] || ""}
                          fallback={cf.fallback}
                          onChange={(v) => onPillarChange(cf.key, v)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Service Cards</label>
          <button
            type="button"
            onClick={addService}
            className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Service
          </button>
        </div>

        <div className="space-y-2">
          {services.map((svc, i) => (
            <div
              key={i}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--muted) / 0.1)" }}>
              <button
                type="button"
                onClick={() => setOpenCard(openCard === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                style={{ color: "hsl(var(--foreground))" }}>
                <span className="font-body text-xs font-medium">
                  {svc.title}{svc.subtitle ? ` — ${svc.subtitle}` : ""}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-body text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "hsl(var(--muted) / 0.4)",
                      color: "hsl(var(--muted-foreground))",
                    }}>
                    {svc.tag}
                  </span>
                  {openCard === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {openCard === i && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Field label="Tag Label" value={svc.tag} onChange={(v) => updateService(i, "tag", v)} />
                    <SelectField
                      label="Tag Type"
                      value={svc.tagType}
                      onChange={(v) => {
                        updateService(i, "tagType", v);
                        const matched = tagTypes.find(t => t.value === v);
                        if (matched) {
                          updateService(i, "tagBgColor", (matched as any).bgColor || "");
                          updateService(i, "tagTextColor", (matched as any).textColor || "");
                        }
                      }}
                      options={tagTypes}
                    />
                  </div>
                  <Field label="Title" value={svc.title} onChange={(v) => updateService(i, "title", v)} />
                  <Field label="Subtitle" value={svc.subtitle} onChange={(v) => updateService(i, "subtitle", v)} />
                  <TextArea label="Description" value={svc.description} onChange={(v) => updateService(i, "description", v)} rows={4} />
                  <ArrayField
                    label="Deliverables"
                    items={svc.deliverables || []}
                    onChange={(items) => updateService(i, "deliverables", items)}
                    placeholder="Deliverable item"
                  />
                  <Field
                    label="Deliverables Label"
                    value={svc.deliverablesLabel || "What's inside"}
                    onChange={(v) => updateService(i, "deliverablesLabel", v)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Price / CTA" value={svc.price} onChange={(v) => updateService(i, "price", v)} />
                    <Field label="Timeline" value={svc.time} onChange={(v) => updateService(i, "time", v)} />
                  </div>
                  <TextArea label="Note (optional)" value={svc.note || ""} onChange={(v) => updateService(i, "note", v)} rows={2} />

                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity"
                    style={{ color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.3)" }}>
                    <Trash2 size={11} /> Remove Service
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PillarEditor;
