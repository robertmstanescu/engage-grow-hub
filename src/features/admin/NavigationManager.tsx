import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Save, Send, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { fetchSection, saveDraft as saveDraftSection, publishSection } from "@/services/siteContent";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { invalidateSiteContent } from "@/hooks/useSiteContent";

interface NavLink {
  id: string;
  label: string;
  href: string;
}

interface NavContent {
  services_label?: string;
  sub_links?: NavLink[];
  links?: NavLink[];
  show_blog_link?: boolean;
  cta_text?: string;
  cta_href?: string;
}

const genId = () => crypto.randomUUID();

const ensureIds = (links: any[]): NavLink[] =>
  links.map((l) => ({ ...l, id: l.id || genId() }));

/* ── sortable link row ─────────────────────────── */
const SortableLinkRow = ({
  link,
  onUpdate,
  onRemove,
  cmsPages,
}: {
  link: NavLink;
  onUpdate: (field: string, value: string) => void;
  onRemove: () => void;
  cmsPages: { slug: string; title: string }[];
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1" style={{ color: "hsl(var(--muted-foreground))" }}>
        <GripVertical size={14} />
      </button>
      <input
        type="text"
        placeholder="Label"
        value={link.label}
        onChange={(e) => onUpdate("label", e.target.value)}
        className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
        style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
      />
      <div className="flex-1 relative">
        <select
          value={link.href}
          onChange={(e) => onUpdate("href", e.target.value)}
          className="w-full px-3 py-2 rounded-md font-body text-sm border appearance-none"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
          <option value="">— custom —</option>
          <optgroup label="Pages">
            <option value="/blog">Blog</option>
            {cmsPages.map((p) => (
              <option key={p.slug} value={`/p/${p.slug}`}>
                {p.title}
              </option>
            ))}
          </optgroup>
        </select>
        {!["/blog", ...cmsPages.map((p) => `/p/${p.slug}`)].includes(link.href) && link.href && (
          <input
            type="text"
            placeholder="Custom link (e.g. /p/about or #section)"
            value={link.href}
            onChange={(e) => onUpdate("href", e.target.value)}
            className="w-full px-3 py-2 rounded-md font-body text-sm border mt-1"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
          />
        )}
      </div>
      <button onClick={onRemove} className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};

/* ── main component ─────────────────────────── */
const NavigationManager = () => {
  const [content, setContent] = useState<NavContent>({});
  const [original, setOriginal] = useState<NavContent>({});
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isPublishingChanges, setIsPublishingChanges] = useState(false);
  const [cmsPages, setCmsPages] = useState<{ slug: string; title: string }[]>([]);
  const [openSection, setOpenSection] = useState<string | null>("links");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const load = async () => {
      const [navRes, pagesRes] = await Promise.all([
        supabase.from("site_content").select("content, draft_content").eq("section_key", "navbar").maybeSingle(),
        supabase.from("cms_pages").select("slug, title").eq("status", "published"),
      ]);
      if (navRes.data) {
        const draft = (navRes.data as any).draft_content || (navRes.data as any).content || {};
        const live = (navRes.data as any).content || {};
        // Ensure all links have IDs
        if (draft.sub_links) draft.sub_links = ensureIds(draft.sub_links);
        if (draft.links) draft.links = ensureIds(draft.links);
        if (live.sub_links) live.sub_links = ensureIds(live.sub_links);
        if (live.links) live.links = ensureIds(live.links);
        setContent(draft);
        setOriginal(live);
      }
      if (pagesRes.data) setCmsPages(pagesRes.data);
    };
    load();
  }, []);

  // No hardcoded brand-specific defaults — admins start from a blank
  // slate. The "Add Item" / "Add Link" buttons below let them build the
  // nav from scratch.
  const subLinks = content.sub_links || ensureIds([]);
  const links = content.links || ensureIds([]);

  const updateField = (field: string, value: any) => {
    setContent((prev) => ({ ...prev, [field]: value }));
  };

  const updateSubLink = (index: number, field: string, value: string) => {
    const updated = [...subLinks];
    updated[index] = { ...updated[index], [field]: value };
    updateField("sub_links", updated);
  };

  const updateLink = (index: number, field: string, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    updateField("links", updated);
  };

  const handleDragEnd = (list: "sub_links" | "links") => (event: DragEndEvent) => {
    const items = list === "sub_links" ? subLinks : links;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    updateField(list, arrayMove(items, oldIndex, newIndex));
  };

  const handleSaveDraft = () =>
    runDbAction({
      action: () => saveDraftSection("navbar", content),
      setLoading: setIsSavingChanges,
      successMessage: "Navigation draft saved",
    });

  const handlePublish = () =>
    runDbAction({
      action: () => publishSection("navbar", content),
      setLoading: setIsPublishingChanges,
      successMessage: "Navigation published!",
      onSuccess: () => {
        setOriginal(content);
        invalidateSiteContent("navbar");
      },
    });

  const hasChanges = JSON.stringify(content) !== JSON.stringify(original);

  const AccordionSection = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border) / 0.5)", backgroundColor: "hsl(var(--card))" }}>
      <button onClick={() => setOpenSection(openSection === id ? null : id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:opacity-80 transition-opacity" style={{ color: "hsl(var(--foreground))" }}>
        <span className="font-body text-sm font-medium">{label}</span>
        {openSection === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {openSection === id && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Navigation Manager</h2>
        <div className="flex items-center gap-2">
          <SpinnerButton
            isLoading={isSavingChanges}
            loadingLabel="Saving…"
            icon={<Save size={13} />}
            onClick={handleSaveDraft}
            className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            Save Draft
          </SpinnerButton>
          <SpinnerButton
            isLoading={isPublishingChanges}
            loadingLabel="Publishing…"
            icon={<Send size={13} />}
            disabled={!hasChanges}
            onClick={handlePublish}
            className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            Publish
          </SpinnerButton>
        </div>
      </div>

      {/* Services dropdown items */}
      <AccordionSection id="services" label="Services Dropdown">
        <div className="space-y-3">
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Dropdown Label</label>
            <input
              type="text"
              value={content.services_label || "Services"}
              onChange={(e) => updateField("services_label", e.target.value)}
              className="w-full px-3 py-2 rounded-md font-body text-sm border mt-1"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
            />
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd("sub_links")}>
            <SortableContext items={subLinks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {subLinks.map((link, i) => (
                <SortableLinkRow
                  key={link.id}
                  link={link}
                  onUpdate={(f, v) => updateSubLink(i, f, v)}
                  onRemove={() => updateField("sub_links", subLinks.filter((_, j) => j !== i))}
                  cmsPages={cmsPages}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button onClick={() => updateField("sub_links", [...subLinks, { id: genId(), label: "", href: "#" }])} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-80" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            <Plus size={12} /> Add Item
          </button>
        </div>
      </AccordionSection>

      {/* Main nav links */}
      <AccordionSection id="links" label="Navigation Links">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd("links")}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {links.map((link, i) => (
              <SortableLinkRow
                key={link.id}
                link={link}
                onUpdate={(f, v) => updateLink(i, f, v)}
                onRemove={() => updateField("links", links.filter((_, j) => j !== i))}
                cmsPages={cmsPages}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button onClick={() => updateField("links", [...links, { id: genId(), label: "", href: "#" }])} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-80" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
          <Plus size={12} /> Add Link
        </button>
      </AccordionSection>

      {/* Settings */}
      <AccordionSection id="settings" label="Settings">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={content.show_blog_link !== false}
            onChange={(e) => updateField("show_blog_link", e.target.checked)}
            className="rounded"
          />
          <label className="font-body text-sm" style={{ color: "hsl(var(--foreground))" }}>Show Blog link in navigation</label>
        </div>
        <div className="space-y-2 mt-3">
          <label className="font-body text-[10px] uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Call-to-Action Button</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Button text"
              value={content.cta_text || "Book a consultation"}
              onChange={(e) => updateField("cta_text", e.target.value)}
              className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
            />
            <div className="flex-1 relative">
              <select
                value={content.cta_href || "#contact"}
                onChange={(e) => updateField("cta_href", e.target.value)}
                className="w-full px-3 py-2 rounded-md font-body text-sm border appearance-none"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
                <option value="#contact">↳ Contact</option>
                <option value="#internal-communications">↳ Internal Communications</option>
                <option value="#employee-experience">↳ Employee Experience</option>
                <option value="/blog">Blog</option>
                {cmsPages.map((p) => (
                  <option key={p.slug} value={`/p/${p.slug}`}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
};

export default NavigationManager;
