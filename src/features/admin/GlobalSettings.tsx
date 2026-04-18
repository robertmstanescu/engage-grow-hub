import { useState, useEffect } from "react";
import { Save, Send, ChevronDown, ChevronUp } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import BrandingEditor from "./BrandingEditor";
import SocialLinksEditor from "./site-editor/SocialLinksEditor";
import { Field, ColorField } from "./site-editor/FieldComponents";
import { fetchSections, saveDraft as saveDraftSection, publishSection } from "@/services/siteContent";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";

interface SectionState {
  content: Record<string, any>;
  draft: Record<string, any>;
}

const SECTIONS = ["branding", "social_links", "footer", "theme"] as const;

const DEFAULT_FOOTER_COLUMNS = [
  { title: "Services", links: [{ label: "Internal Communications", href: "#internal-communications" }, { label: "Employee Experience", href: "#employee-experience" }] },
  { title: "Company", links: [{ label: "Our Vows", href: "#vows" }, { label: "Blog", href: "/blog/" }, { label: "Contact", href: "#contact" }] },
  { title: "Connect", links: [] },
];

const ALIGNMENT_OPTIONS = [
  { label: "Auto (alternate L/R)", value: "auto" },
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
];

const GlobalSettings = () => {
  const [data, setData] = useState<Record<string, SectionState>>({});
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isPublishingChanges, setIsPublishingChanges] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("branding");

  useEffect(() => {
    const load = async () => {
      const { data: rows } = await fetchSections([...SECTIONS]);
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

  const handleSaveAll = () =>
    runDbAction({
      action: async () => {
        // Sequential because we may need to insert before update
        for (const key of SECTIONS) {
          const draft = data[key]?.draft || {};
          const res = await saveDraftSection(key, draft);
          if ((res as any)?.error) throw (res as any).error;
        }
        return { error: null };
      },
      setLoading: setIsSavingChanges,
      successMessage: "Settings draft saved",
    });

  const handlePublishAll = () =>
    runDbAction({
      action: async () => {
        for (const key of SECTIONS) {
          const draft = data[key]?.draft || {};
          const res = await publishSection(key, draft);
          if ((res as any)?.error) throw (res as any).error;
        }
        return { error: null };
      },
      setLoading: setIsPublishingChanges,
      successMessage: "Settings published!",
      onSuccess: () => {
        for (const key of SECTIONS) invalidateSiteContent(key);
        setData((prev) => {
          const next = { ...prev };
          for (const key of SECTIONS) {
            next[key] = { ...next[key], content: next[key].draft };
          }
          return next;
        });
      },
    });

  const hasChanges = SECTIONS.some((k) => JSON.stringify(data[k]?.draft) !== JSON.stringify(data[k]?.content));

  const AccordionSection = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}>
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
          <SpinnerButton
            isLoading={isSavingChanges}
            loadingLabel="Saving…"
            icon={<Save size={13} />}
            onClick={handleSaveAll}
            className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            Save Draft
          </SpinnerButton>
          <SpinnerButton
            isLoading={isPublishingChanges}
            loadingLabel="Publishing…"
            icon={<Send size={13} />}
            disabled={!hasChanges}
            onClick={handlePublishAll}
            className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            Publish
          </SpinnerButton>
        </div>
      </div>

      <AccordionSection id="branding" label="Logo & Favicon">
        <BrandingEditor content={getDraft("branding")} onChange={(f, v) => updateField("branding", f, v)} />
      </AccordionSection>

      <AccordionSection id="footer" label="Footer">
        <Field
          label="Copyright Line"
          value={getDraft("footer").copyright || `© ${new Date().getFullYear()} The Magic Coffin for Silly Vampires`}
          onChange={(v) => updateField("footer", "copyright", v)}
        />
        <Field
          label="Tagline"
          value={getDraft("footer").tagline || "Based in Sweden 🇸🇪 · Operating globally"}
          onChange={(v) => updateField("footer", "tagline", v)}
        />

        <FooterColumnsEditor
          columns={getDraft("footer").columns || DEFAULT_FOOTER_COLUMNS}
          onChange={(cols) => updateField("footer", "columns", cols)}
        />
      </AccordionSection>

      <AccordionSection id="social" label="Social Media Links">
        <SocialLinksEditor content={getDraft("social_links")} onChange={(f, v) => updateField("social_links", f, v)} />
      </AccordionSection>

      <AccordionSection id="theme" label="Global Theme Defaults">
        <p className="font-body text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
          These defaults apply to all new rows. Existing rows keep their own settings.
        </p>

        {/* Default alignment */}
        <div className="mb-4">
          <label className="font-body text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: "hsl(var(--muted-foreground))" }}>Default Alignment</label>
          <div className="flex gap-1.5">
            {ALIGNMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("theme", "defaultAlignment", opt.value)}
                className="flex-1 py-1.5 rounded text-[10px] font-body font-medium transition-all"
                style={{
                  backgroundColor: (getDraft("theme").defaultAlignment || "auto") === opt.value ? "hsl(var(--primary))" : "hsl(var(--background))",
                  color: (getDraft("theme").defaultAlignment || "auto") === opt.value ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                  border: `1px solid ${(getDraft("theme").defaultAlignment || "auto") === opt.value ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Default Padding Top</label>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={200} step={4} value={getDraft("theme").defaultPaddingTop || 64} onChange={(e) => updateField("theme", "defaultPaddingTop", Number(e.target.value))} className="flex-1" style={{ accentColor: "hsl(var(--primary))" }} />
              <span className="font-body text-xs w-10 text-right" style={{ color: "hsl(var(--foreground))" }}>{getDraft("theme").defaultPaddingTop || 64}px</span>
            </div>
          </div>
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Default Padding Bottom</label>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={200} step={4} value={getDraft("theme").defaultPaddingBottom || 64} onChange={(e) => updateField("theme", "defaultPaddingBottom", Number(e.target.value))} className="flex-1" style={{ accentColor: "hsl(var(--primary))" }} />
              <span className="font-body text-xs w-10 text-right" style={{ color: "hsl(var(--foreground))" }}>{getDraft("theme").defaultPaddingBottom || 64}px</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Primary Brand Color</label>
            <div className="flex gap-1.5">
              <input type="color" value={getDraft("theme").primaryColor || "#4D1B5E"} onChange={(e) => updateField("theme", "primaryColor", e.target.value)} className="w-10 h-9 rounded border-0 cursor-pointer" />
              <input value={getDraft("theme").primaryColor || "#4D1B5E"} onChange={(e) => updateField("theme", "primaryColor", e.target.value)} placeholder="#HEX" className="flex-1 px-3 py-2 rounded-lg font-body text-sm border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} />
            </div>
          </div>
          <div>
            <label className="font-body text-[10px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Accent Color</label>
            <div className="flex gap-1.5">
              <input type="color" value={getDraft("theme").accentColor || "#E5C54F"} onChange={(e) => updateField("theme", "accentColor", e.target.value)} className="w-10 h-9 rounded border-0 cursor-pointer" />
              <input value={getDraft("theme").accentColor || "#E5C54F"} onChange={(e) => updateField("theme", "accentColor", e.target.value)} placeholder="#HEX" className="flex-1 px-3 py-2 rounded-lg font-body text-sm border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="font-body text-[10px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Default Font Family</label>
          <select value={getDraft("theme").fontFamily || "default"} onChange={(e) => updateField("theme", "fontFamily", e.target.value)} className="w-full px-3 py-2 rounded-lg font-body text-sm border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
            <option value="default">System Default</option>
            <option value="inter">Inter</option>
            <option value="bricolage">Bricolage Grotesque</option>
            <option value="playfair">Playfair Display</option>
            <option value="architects">Architects Daughter</option>
          </select>
        </div>
        <div className="mt-3">
          <ColorField label="Default Subtitle Color" description="Default color for subtitle text across all rows (can be overridden per row)" value={getDraft("theme").subtitleColor || ""} fallback="#E5C54F" onChange={(v) => updateField("theme", "subtitleColor", v)} />
        </div>
      </AccordionSection>
    </div>
  );
};

/* ── Footer Columns sub-editor ── */
const FooterColumnsEditor = ({ columns, onChange }: { columns: any[]; onChange: (cols: any[]) => void }) => {
  return (
    <div className="space-y-4 mt-4">
      <label className="font-body text-xs uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Footer Columns</label>
      {columns.map((col: any, ci: number) => (
        <div key={ci} className="rounded-lg border p-3 space-y-2" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2">
            <input type="text" value={col.title} placeholder="Column title"
              onChange={(e) => {
                const cols = [...columns];
                cols[ci] = { ...cols[ci], title: e.target.value };
                onChange(cols);
              }}
              className="flex-1 px-3 py-1.5 rounded font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} />
            <button onClick={() => onChange(columns.filter((_: any, i: number) => i !== ci))}
              className="text-xs px-2 py-1 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>Remove</button>
          </div>
          {(col.links || []).map((link: any, li: number) => (
            <div key={li} className="flex items-center gap-1.5 pl-2">
              <input type="text" value={link.label} placeholder="Label"
                onChange={(e) => {
                  const cols = [...columns];
                  const links = [...(cols[ci].links || [])];
                  links[li] = { ...links[li], label: e.target.value };
                  cols[ci] = { ...cols[ci], links };
                  onChange(cols);
                }}
                className="flex-1 px-2 py-1 rounded font-body text-xs border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} />
              <input type="text" value={link.href} placeholder="Link"
                onChange={(e) => {
                  const cols = [...columns];
                  const links = [...(cols[ci].links || [])];
                  links[li] = { ...links[li], href: e.target.value };
                  cols[ci] = { ...cols[ci], links };
                  onChange(cols);
                }}
                className="flex-1 px-2 py-1 rounded font-body text-xs border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} />
              <button onClick={() => {
                const cols = [...columns];
                cols[ci] = { ...cols[ci], links: (cols[ci].links || []).filter((_: any, i: number) => i !== li) };
                onChange(cols);
              }} className="text-xs" style={{ color: "hsl(var(--destructive))" }}>×</button>
            </div>
          ))}
          <button onClick={() => {
            const cols = [...columns];
            cols[ci] = { ...cols[ci], links: [...(cols[ci].links || []), { label: "", href: "#" }] };
            onChange(cols);
          }} className="font-body text-[10px] uppercase tracking-wider px-2 py-1 rounded border hover:opacity-80"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>+ Add Link</button>
        </div>
      ))}
      <button onClick={() => onChange([...columns, { title: "New Column", links: [] }])}
        className="font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-80"
        style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>+ Add Column</button>
    </div>
  );
};

export default GlobalSettings;
