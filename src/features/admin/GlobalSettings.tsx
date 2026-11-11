import { useState, useEffect } from "react";
import { Save, Send, ChevronDown, ChevronUp } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import SocialLinksEditor from "./site-editor/SocialLinksEditor";
import { Field } from "./site-editor/FieldComponents";
import { fetchSections, saveDraft as saveDraftSection, publishSection } from "@/services/siteContent";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";

interface SectionState {
  content: Record<string, any>;
  draft: Record<string, any>;
}

const SECTIONS = ["social_links", "footer"] as const;

// No hardcoded brand-specific footer columns. Admins start from a blank
// slate; the SocialLinksEditor will auto-inject a "Connect" column the
// first time any social URL is entered.
const DEFAULT_FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [];

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
  const [openSection, setOpenSection] = useState<string | null>("footer");

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
            className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
            Save Draft
          </SpinnerButton>
          <SpinnerButton
            isLoading={isPublishingChanges}
            loadingLabel="Publishing…"
            icon={<Send size={13} />}
            disabled={!hasChanges}
            onClick={handlePublishAll}
            className="font-body text-xs uppercase tracking-wider px-4 py-2 rounded-md hover:opacity-80 transition-opacity"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            Publish
          </SpinnerButton>
        </div>
      </div>

      {/* Logo & Favicon moved to Brand Settings (Epic 1: Unified Brand Hub).
       *  See src/features/admin/BrandSettings.tsx — the BrandingEditor now
       *  renders there alongside colours and typography. */}


      <AccordionSection id="footer" label="Footer">
        <Field
          label="Copyright Line"
          value={getDraft("footer").copyright || ""}
          onChange={(v) => updateField("footer", "copyright", v)}
        />
        <Field
          label="Tagline"
          value={getDraft("footer").tagline || ""}
          onChange={(v) => updateField("footer", "tagline", v)}
        />

        <FooterColumnsEditor
          columns={getDraft("footer").columns || DEFAULT_FOOTER_COLUMNS}
          onChange={(cols) => updateField("footer", "columns", cols)}
        />
      </AccordionSection>

      <AccordionSection id="social" label="Social Media Links">
        <SocialLinksEditor
          content={getDraft("social_links")}
          onChange={(f, v) => updateField("social_links", f, v)}
          onEnsureConnectColumn={() => {
            // Idempotent: only inject if no column is already titled "Connect"
            // (case-insensitive). Preserves any custom ordering admins set up.
            const cols = (getDraft("footer").columns as any[]) || [];
            const hasConnect = cols.some(
              (c) => typeof c?.title === "string" && c.title.trim().toLowerCase() === "connect",
            );
            if (hasConnect) return;
            updateField("footer", "columns", [...cols, { title: "Connect", links: [] }]);
          }}
        />
      </AccordionSection>

      {/* "Global Theme Defaults" (alignment, padding, colours, font) was
          removed in the admin sweep of 11 Nov 2026: no page read it. Row
          spacing, colours and faces are set per row and by the brand tokens. */}
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
                className="flex-1 px-2 py-1 rounded font-body text-xs border text-foreground"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} />
              <input type="text" value={link.href} placeholder="Link"
                onChange={(e) => {
                  const cols = [...columns];
                  const links = [...(cols[ci].links || [])];
                  links[li] = { ...links[li], href: e.target.value };
                  cols[ci] = { ...cols[ci], links };
                  onChange(cols);
                }}
                className="flex-1 px-2 py-1 rounded font-body text-xs border text-foreground"
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
        className="font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border hover:opacity-80"
        style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>+ Add Column</button>
    </div>
  );
};

export default GlobalSettings;
