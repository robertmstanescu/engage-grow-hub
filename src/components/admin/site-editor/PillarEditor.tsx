import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Field, TextArea, RichField, ArrayField, SelectField, SectionBox } from "./FieldComponents";

interface Service {
  tag: string;
  tagType: string;
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

const PillarEditor = ({ pillarContent, servicesContent, onPillarChange, onServicesChange }: Props) => {
  const [openCard, setOpenCard] = useState<number | null>(null);
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
                      onChange={(v) => updateService(i, "tagType", v)}
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
