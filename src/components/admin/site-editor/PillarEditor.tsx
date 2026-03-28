import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Field, TextArea, RichField, ArrayField, SelectField, SectionBox, ColorField } from "./FieldComponents";

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
}

const DEFAULT_TAG_TYPES = [
  { label: "Fixed project", value: "fixed" },
  { label: "Monthly retainer", value: "retainer" },
];

const PILLAR_COLOR_FIELDS = [
  { key: "color_section_bg", label: "Section Background", description: "Background of the entire pillar section", fallback: "#FFFFFF" },
  { key: "color_label", label: "Pillar Label", description: "The small pillar number text (e.g. 'Pillar 01')", fallback: "#7B3A91" },
  { key: "color_heading", label: "Pillar Title", description: "The main heading of the pillar section", fallback: "#2A0E33" },
  { key: "color_heading_sub", label: "Pillar Description", description: "The description text below the title", fallback: "#2A0E33" },
  { key: "color_primary", label: "Primary Accent", description: "Used for navigation dots, card borders, and arrow buttons", fallback: "#4D1B5E" },
  { key: "color_card_bg", label: "Card Background", description: "Background of each service card", fallback: "#FFFFFF" },
  { key: "color_card_title", label: "Card Title", description: "Title text inside each service card", fallback: "#2A0E33" },
  { key: "color_subtitle", label: "Card Subtitle", description: "Subtitle text and bullet markers in cards", fallback: "#7B3A91" },
  { key: "color_card_description", label: "Card Description", description: "Description text inside each service card", fallback: "#555555" },
  { key: "color_deliverables_bg", label: "Deliverables Background", description: "Background of the collapsible deliverables section", fallback: "#F9F0C1" },
  { key: "color_deliverables_label", label: "Deliverables Label", description: "The 'What's inside' toggle text color", fallback: "#4D1B5E" },
  { key: "color_meta_bg", label: "Meta Bar Background", description: "Background of the price/timeline footer bar", fallback: "#E5C54F" },
  { key: "color_meta_fg", label: "Meta Bar Text", description: "Text color in the price/timeline footer bar", fallback: "#2A0E33" },
  { key: "color_cta_text", label: "CTA Link Color", description: "Color of the price/CTA link in cards", fallback: "#E5C54F" },
  { key: "color_cta_time", label: "Timeline Text", description: "Color of the timeline text in cards", fallback: "#999999" },
  { key: "color_carousel_btn_bg", label: "Carousel Button BG", description: "Background of carousel prev/next buttons. Leave empty to auto-detect from background.", fallback: "" },
  { key: "color_carousel_btn_fg", label: "Carousel Button Icon", description: "Icon color of carousel prev/next buttons. Leave empty to auto-detect.", fallback: "" },
  { key: "color_dot_active", label: "Carousel Dot Active", description: "Active dot indicator color. Leave empty to use theme accent.", fallback: "" },
  { key: "color_dot_inactive", label: "Carousel Dot Inactive", description: "Inactive dot indicator color. Leave empty to auto-detect.", fallback: "" },
  { key: "color_note_border", label: "Note Border", description: "Left border color of the optional note section", fallback: "#7B3A91" },
  { key: "color_divider_from", label: "Divider Gradient Start", description: "Starting color of the gradient divider line above the section", fallback: "#4D1B5E" },
  { key: "color_divider_to", label: "Divider Gradient End", description: "Ending color of the gradient divider line", fallback: "#7B3A91" },
];

const PillarEditor = ({ pillarContent, servicesContent, onPillarChange, onServicesChange }: Props) => {
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
      <SectionBox label="Pillar Header">
        <Field label="Pillar Number" value={pillarContent.pillar_number || ""} onChange={(v) => onPillarChange("pillar_number", v)} />
        <Field label="Title" value={pillarContent.title || ""} onChange={(v) => onPillarChange("title", v)} />
        <RichField label="Description" value={pillarContent.description || ""} onChange={(v) => onPillarChange("description", v)} />
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
            <p className="font-body text-[9px] text-muted-foreground/60 pt-2">Customize every color in this pillar section. Leave empty to use defaults.</p>
            <div className="grid grid-cols-2 gap-3">
              {PILLAR_COLOR_FIELDS.map((cf) => (
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
