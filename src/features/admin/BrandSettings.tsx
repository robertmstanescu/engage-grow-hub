import { useState, useEffect } from "react";
import { Save, Send, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { invalidateSiteContent } from "@/hooks/useSiteContent";
import { applyBrandCSSVars, DEFAULT_BRAND, type BrandSettings as BrandSettingsType, type BrandColor, type TypographyLevel } from "@/hooks/useBrandSettings";
import { SectionBox } from "./site-editor/FieldComponents";
import { fetchSection, fetchSections, saveDraft as saveDraftSection, publishSection } from "@/services/siteContent";
import { runDbAction } from "@/services/db-helpers";
import { SpinnerButton } from "@/components/ui/spinner-button";
import BrandingEditor from "./BrandingEditor";

/* ── WCAG Contrast helpers ── */
const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number];
};

const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const contrastRatio = (hex1: string, hex2: string) => {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const INPUT_STYLE: React.CSSProperties = { backgroundColor: "#FFFFFF", color: "#1a1a1a", borderColor: "hsl(var(--border))" };

const FONT_OPTIONS = [
  { label: "Unbounded", value: "'Unbounded', sans-serif" },
  { label: "Bricolage Grotesque", value: "'Bricolage Grotesque', sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Architects Daughter", value: "'Architects Daughter', cursive" },
];

const WEIGHT_OPTIONS = ["300", "400", "500", "600", "700", "800", "900"];

const BrandSettings = () => {
  const [brand, setBrand] = useState<BrandSettingsType>(DEFAULT_BRAND);
  const [published, setPublished] = useState<BrandSettingsType>(DEFAULT_BRAND);
  /* Logos & favicons live in the legacy `branding` section_key so that
   * downstream consumers (Navbar, Footer, FaviconManager, AdminDashboard)
   * keep working unchanged. We co-load and co-save them here so the admin
   * gets a single Brand Hub experience as required by Epic 1. */
  const [branding, setBranding] = useState<Record<string, any>>({});
  const [publishedBranding, setPublishedBranding] = useState<Record<string, any>>({});
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isPublishingChanges, setIsPublishingChanges] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("branding");
  const [contrastFg, setContrastFg] = useState("#FFFFFF");
  const [contrastBg, setContrastBg] = useState("#2A0E33");

  useEffect(() => {
    /* Pull both sections in one round-trip. brand_settings drives colours
     * & typography; branding drives logos & favicons. */
    fetchSections(["brand_settings", "branding"]).then(({ data }) => {
      const bs = data?.find((r: any) => r.section_key === "brand_settings");
      const br = data?.find((r: any) => r.section_key === "branding");

      if (bs) {
        const live = { ...DEFAULT_BRAND, ...bs.content, typography: { ...DEFAULT_BRAND.typography, ...(bs.content?.typography || {}) } };
        const draft = bs.draft_content
          ? { ...DEFAULT_BRAND, ...bs.draft_content, typography: { ...DEFAULT_BRAND.typography, ...(bs.draft_content?.typography || {}) } }
          : live;
        setBrand(draft);
        setPublished(live);
      }

      const liveBranding = br?.content || {};
      const draftBranding = br?.draft_content || liveBranding;
      setBranding(draftBranding);
      setPublishedBranding(liveBranding);
    });
  }, []);

  const updateBrandingField = (field: string, value: any) =>
    setBranding((prev) => ({ ...prev, [field]: value }));

  const updateColor = (idx: number, field: keyof BrandColor, value: string) => {
    setBrand((prev) => {
      const next = [...prev.colors];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, colors: next };
    });
  };

  const addColor = () => {
    setBrand((prev) => ({
      ...prev,
      colors: [...prev.colors, { id: crypto.randomUUID(), name: "New Color", hex: "#888888" }],
    }));
  };

  const removeColor = (idx: number) => {
    setBrand((prev) => ({ ...prev, colors: prev.colors.filter((_, i) => i !== idx) }));
  };

  const updateTypography = (level: keyof BrandSettingsType["typography"], field: keyof TypographyLevel, value: string) => {
    setBrand((prev) => ({
      ...prev,
      typography: { ...prev.typography, [level]: { ...prev.typography[level], [field]: value } },
    }));
  };

  /* Save / publish operate on BOTH sections atomically from the user's
   * point of view (one click). We run them sequentially because if the
   * branding upsert fails we still want the brand_settings error to be
   * surfaced — runDbAction will throw on the first error. */
  const handleSaveDraft = () =>
    runDbAction({
      action: async () => {
        const r1 = await saveDraftSection("brand_settings", brand);
        if ((r1 as any)?.error) throw (r1 as any).error;
        const r2 = await saveDraftSection("branding", branding);
        if ((r2 as any)?.error) throw (r2 as any).error;
        return { error: null };
      },
      setLoading: setIsSavingChanges,
      successMessage: "Brand settings draft saved",
    });

  const handlePublish = () =>
    runDbAction({
      action: async () => {
        const r1 = await publishSection("brand_settings", brand);
        if ((r1 as any)?.error) throw (r1 as any).error;
        const r2 = await publishSection("branding", branding);
        if ((r2 as any)?.error) throw (r2 as any).error;
        return { error: null };
      },
      setLoading: setIsPublishingChanges,
      successMessage: "Brand settings published!",
      onSuccess: () => {
        invalidateSiteContent("brand_settings");
        invalidateSiteContent("branding");
        applyBrandCSSVars(brand);
        setPublished(brand);
        setPublishedBranding(branding);
      },
    });

  const hasChanges =
    JSON.stringify(brand) !== JSON.stringify(published) ||
    JSON.stringify(branding) !== JSON.stringify(publishedBranding);
  const ratio = contrastRatio(contrastFg, contrastBg);
  const passAA = ratio >= 4.5;
  const passAALarge = ratio >= 3;
  const passAAA = ratio >= 7;
  const passAAALarge = ratio >= 4.5;

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
        <h2 className="font-display text-lg font-bold" style={{ color: "hsl(var(--secondary))" }}>Brand Settings</h2>
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

      {/* ──────────────────────────────────────────────────────────────
       *  BRAND PREVIEW BOARD (US 1.2)
       *  ──────────────────────────────────────────────────────────────
       *  Live, unsaved preview of how the brand kit renders together:
       *  the uploaded logo on top of the Primary Brand Colour, with H1
       *  / H2 / body type rendered using the typography currently in
       *  local state. No DB write needed — purely reads `brand` and
       *  `branding` so admins see changes the instant they edit a
       *  font, weight, colour, or upload a new logo.
       *
       *  Contrast: we test the primary colour against #FFFFFF and
       *  #1A1A1A using the existing WCAG `contrastRatio` helper and
       *  pick whichever ratio is higher. This guarantees text never
       *  becomes invisible if the admin chooses, e.g., a pale yellow.
       *  ────────────────────────────────────────────────────────── */}
      {(() => {
        const primaryHex = brand.colors[0]?.hex || "#1a1a1a";
        const fg =
          contrastRatio(primaryHex, "#FFFFFF") >= contrastRatio(primaryHex, "#1A1A1A")
            ? "#FFFFFF"
            : "#1A1A1A";
        const subtleFg = fg === "#FFFFFF" ? "rgba(255,255,255,0.72)" : "rgba(26,26,26,0.72)";
        const dividerFg = fg === "#FFFFFF" ? "rgba(255,255,255,0.18)" : "rgba(26,26,26,0.15)";
        const logo = branding.logo_url || branding.emblem_logo_url || "";
        const t = brand.typography;
        return (
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: primaryHex }}
            aria-label="Live brand preview"
          >
            <div className="px-6 py-7 md:px-8 md:py-9">
              <div
                className="flex items-center justify-between gap-4 pb-5 border-b"
                style={{ borderColor: dividerFg }}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt="Brand logo preview"
                    className="max-h-10 md:max-h-12 max-w-[180px] object-contain"
                  />
                ) : (
                  <span
                    className="font-body text-xs uppercase tracking-[0.25em]"
                    style={{ color: subtleFg }}
                  >
                    No logo uploaded
                  </span>
                )}
                <span
                  className="font-body text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: subtleFg }}
                >
                  Brand Preview · Live
                </span>
              </div>

              <div className="pt-5 space-y-3">
                <h1
                  style={{
                    fontFamily: t.h1.fontFamily,
                    fontSize: t.h1.fontSize,
                    lineHeight: t.h1.lineHeight,
                    fontWeight: Number(t.h1.fontWeight),
                    color: fg,
                    margin: 0,
                  }}
                >
                  Building unforgettable brands.
                </h1>
                <h2
                  style={{
                    fontFamily: t.h2.fontFamily,
                    fontSize: t.h2.fontSize,
                    lineHeight: t.h2.lineHeight,
                    fontWeight: Number(t.h2.fontWeight),
                    color: fg,
                    margin: 0,
                  }}
                >
                  A subhead in your H2 style
                </h2>
                <p
                  style={{
                    fontFamily: t.body.fontFamily,
                    fontSize: t.body.fontSize,
                    lineHeight: t.body.lineHeight,
                    fontWeight: Number(t.body.fontWeight),
                    color: subtleFg,
                    margin: 0,
                    maxWidth: "60ch",
                  }}
                >
                  Body text rendered with your selected font family, size, weight, and
                  line-height — paired against the Primary brand colour and a contrast-safe
                  foreground so you can judge legibility before publishing.
                </p>
              </div>

              {brand.colors.length > 1 && (
                <div
                  className="pt-5 mt-5 border-t flex flex-wrap items-center gap-2"
                  style={{ borderColor: dividerFg }}
                >
                  <span
                    className="font-body text-[10px] uppercase tracking-[0.25em]"
                    style={{ color: subtleFg }}
                  >
                    Palette
                  </span>
                  {brand.colors.map((c) => (
                    <div
                      key={c.id}
                      title={`${c.name} · ${c.hex}`}
                      className="w-6 h-6 rounded-full border"
                      style={{ backgroundColor: c.hex, borderColor: dividerFg }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Brand Identity (name / tagline / canonical origin) ── */}
      <AccordionSection id="identity" label="Brand Identity">
        <p className="font-body text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
          These values feed every page's <code>&lt;title&gt;</code>, canonical URL, JSON-LD, sitemap and the <code>llms.txt</code> manifest. Leave the canonical origin blank to use the current domain.
        </p>
        <div className="space-y-3">
          <div>
            <label className="font-body text-[9px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Brand Name</label>
            <input
              value={brand.identity?.brandName || ""}
              onChange={(e) => setBrand((prev) => ({ ...prev, identity: { ...prev.identity, brandName: e.target.value } }))}
              placeholder="My Site"
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label className="font-body text-[9px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Tagline</label>
            <input
              value={brand.identity?.tagline || ""}
              onChange={(e) => setBrand((prev) => ({ ...prev, identity: { ...prev.identity, tagline: e.target.value } }))}
              placeholder="Optional one-line tagline"
              className="w-full px-3 py-2 rounded-lg font-body text-sm border"
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label className="font-body text-[9px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Canonical Origin</label>
            <input
              value={brand.identity?.canonicalOrigin || ""}
              onChange={(e) => setBrand((prev) => ({ ...prev, identity: { ...prev.identity, canonicalOrigin: e.target.value } }))}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg font-body text-sm border font-mono"
              style={INPUT_STYLE}
            />
            <p className="font-body text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Used in <code>&lt;link rel="canonical"&gt;</code>, sitemap, JSON-LD. No trailing slash.
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* ── Logos & Favicons (moved from GlobalSettings as part of
       *  Epic 1: The Unified Brand Hub) ── */}
      <AccordionSection id="branding" label="Logos & Favicon">
        <BrandingEditor content={branding} onChange={updateBrandingField} />
      </AccordionSection>

      {/* ── Colour Palette ── */}
      <AccordionSection id="palette" label="Colour Palette">
        <p className="font-body text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
          Define your brand colours. These appear as quick-select presets in every colour picker across the admin.
        </p>
        <div className="space-y-2">
          {brand.colors.map((color, i) => (
            <div key={color.id} className="flex items-center gap-2">
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(i, "hex", e.target.value)}
                className="w-9 h-9 rounded border cursor-pointer shrink-0"
                style={{ borderColor: "hsl(var(--border))" }}
              />
              <input
                value={color.name}
                onChange={(e) => updateColor(i, "name", e.target.value)}
                placeholder="Color name"
                className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
                style={INPUT_STYLE}
              />
              <input
                value={color.hex}
                onChange={(e) => updateColor(i, "hex", e.target.value)}
                placeholder="#HEX"
                className="w-24 px-3 py-2 rounded-lg font-body text-sm border font-mono"
                style={INPUT_STYLE}
              />
              <button type="button" onClick={() => removeColor(i)} className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addColor} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 mt-2" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add Colour
        </button>
      </AccordionSection>

      {/* ── Typography ── */}
      <AccordionSection id="typography" label="Typography">
        <p className="font-body text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
          Set default typography for each heading level and body text. These serve as site-wide defaults.
        </p>
        {(["h1", "h2", "h3", "body"] as const).map((level) => {
          const t = brand.typography[level];
          return (
            <SectionBox key={level} label={level.toUpperCase()}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-body text-[9px] uppercase tracking-wider block mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Font Family</label>
                  <select value={t.fontFamily} onChange={(e) => updateTypography(level, "fontFamily", e.target.value)} className="w-full px-2 py-1.5 rounded font-body text-xs border" style={INPUT_STYLE}>
                    {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-body text-[9px] uppercase tracking-wider block mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Font Size</label>
                  <input value={t.fontSize} onChange={(e) => updateTypography(level, "fontSize", e.target.value)} className="w-full px-2 py-1.5 rounded font-body text-xs border" style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="font-body text-[9px] uppercase tracking-wider block mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Line Height</label>
                  <input value={t.lineHeight} onChange={(e) => updateTypography(level, "lineHeight", e.target.value)} className="w-full px-2 py-1.5 rounded font-body text-xs border" style={INPUT_STYLE} />
                </div>
                <div>
                  <label className="font-body text-[9px] uppercase tracking-wider block mb-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Font Weight</label>
                  <select value={t.fontWeight} onChange={(e) => updateTypography(level, "fontWeight", e.target.value)} className="w-full px-2 py-1.5 rounded font-body text-xs border" style={INPUT_STYLE}>
                    {WEIGHT_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-2 px-3 py-2 rounded border" style={{ borderColor: "hsl(var(--border))", backgroundColor: "#1a1a1a" }}>
                <span style={{ fontFamily: t.fontFamily, fontSize: level === "body" ? t.fontSize : "clamp(14px, 2vw, 20px)", lineHeight: t.lineHeight, fontWeight: Number(t.fontWeight), color: "#F4F0EC" }}>
                  The quick brown fox jumps over the lazy dog
                </span>
              </div>
            </SectionBox>
          );
        })}
      </AccordionSection>

      {/* ── Contrast Checker ── */}
      <AccordionSection id="contrast" label="Accessibility Contrast Checker">
        <p className="font-body text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
          Test text/background colour pairs against WCAG 2.1 standards. Click a brand colour below to apply it.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-[9px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Text Colour</label>
            <div className="flex gap-1.5">
              <input type="color" value={contrastFg} onChange={(e) => setContrastFg(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
              <input value={contrastFg} onChange={(e) => setContrastFg(e.target.value)} className="flex-1 px-2 py-1.5 rounded font-body text-xs border font-mono" style={INPUT_STYLE} />
            </div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {brand.colors.map((c) => (
                <button key={c.id} type="button" title={c.name} onClick={() => setContrastFg(c.hex)} className="w-5 h-5 rounded-full border hover:scale-110 transition-transform" style={{ backgroundColor: c.hex, borderColor: "hsl(var(--border))" }} />
              ))}
            </div>
          </div>
          <div>
            <label className="font-body text-[9px] uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Background Colour</label>
            <div className="flex gap-1.5">
              <input type="color" value={contrastBg} onChange={(e) => setContrastBg(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
              <input value={contrastBg} onChange={(e) => setContrastBg(e.target.value)} className="flex-1 px-2 py-1.5 rounded font-body text-xs border font-mono" style={INPUT_STYLE} />
            </div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {brand.colors.map((c) => (
                <button key={c.id} type="button" title={c.name} onClick={() => setContrastBg(c.hex)} className="w-5 h-5 rounded-full border hover:scale-110 transition-transform" style={{ backgroundColor: c.hex, borderColor: "hsl(var(--border))" }} />
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg overflow-hidden mt-3 border" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="px-6 py-8 text-center" style={{ backgroundColor: contrastBg }}>
            <p className="font-display font-bold text-2xl mb-1" style={{ color: contrastFg }}>Heading Preview</p>
            <p className="font-body text-sm" style={{ color: contrastFg }}>Body text preview — The quick brown fox jumps over the lazy dog.</p>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.15)" }}>
            <p className="font-body text-[9px] uppercase tracking-wider mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Contrast Ratio</p>
            <p className="font-display text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{ratio.toFixed(2)}:1</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1.5" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.15)" }}>
            {[
              { label: "AA Normal", pass: passAA },
              { label: "AA Large", pass: passAALarge },
              { label: "AAA Normal", pass: passAAA },
              { label: "AAA Large", pass: passAAALarge },
            ].map(({ label, pass }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-body text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
                <span className="font-body text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                  backgroundColor: pass ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)",
                  color: "#FFFFFF",
                }}>{pass ? "PASS" : "FAIL"}</span>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>
    </div>
  );
};

export default BrandSettings;
