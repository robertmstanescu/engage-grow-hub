/**
 * ─────────────────────────────────────────────────────────────────────────
 * RowContentEditor.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * The "Content" sub-tab in the Properties panel. Given the currently
 * selected page row, it renders the right field-set for that row's type.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UI HIERARCHY — ACCORDION ORGANIZATION (Junior-Engineer Guide)
 * ─────────────────────────────────────────────────────────────────────────
 * Previously this editor rendered every field in one long vertical wall,
 * which created cognitive overload — a non-technical editor would scan
 * past 10–20 inputs trying to find the one field they wanted to change.
 *
 * We now group fields into 2 (or 3) collapsible Accordion sections:
 *
 *   1. "Text & Content"        ← OPEN BY DEFAULT (most-edited)
 *      ─ Eyebrow, title lines, subtitle, body, descriptions, copy,
 *        button LABELS (because labels are copy).
 *
 *   2. "Media & Interactive"    ← Collapsed by default
 *      ─ Images, icons, image alt text, button URLs, link URLs,
 *        media-related arrays (services, items, logos, faqs cards).
 *
 *   3. "Design & Background"    ← (Not used here — that's RowStyleTab)
 *      ─ Card colors, eyebrow color, subtitle color and any per-content
 *        color overrides that don't belong on the row-level Style tab.
 *
 * WHERE TO ADD A NEW FIELD
 * ────────────────────────
 *   • Plain text the user reads on the page → "Text & Content"
 *   • An image, file, icon, link, button URL → "Media & Interactive"
 *   • A color / typography override scoped to this content (NOT the row
 *     background) → "Design & Background"
 *   • Anything that controls row-level layout / background / overlays /
 *     gradients → put it in `RowStyleTab.tsx` instead, NOT here.
 *
 * Each row-type case below has its own `<Accordion>` block. When you add
 * a new field, locate the matching `case "<type>":` and drop it into the
 * appropriate `<AccordionItem>` so the grouping stays consistent.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PROPS
 * ─────
 *   row              : PageRow
 *   onContentChange  : (field, value) => void   — writes to the active column
 *   onRowMetaChange  : (updates) => void        — writes to row-level meta
 *   onDelete?        : () => void               — reserved for future use
 * ─────────────────────────────────────────────────────────────────────────
 */

import { Field, RichField, ColorField, SectionBox } from "../site-editor/FieldComponents";
import { resolveRowBgColor } from "@/lib/rowForeground";
import SubtitleEditor from "../site-editor/SubtitleEditor";
import PillarEditor from "../site-editor/PillarEditor";
import ImageTextEditor from "../site-editor/ImageTextEditor";
import ProfileEditor from "../site-editor/ProfileEditor";
import GridEditor from "../site-editor/GridEditor";
import LeadMagnetEditor from "../site-editor/LeadMagnetEditor";
import TitleLinesEditor from "./TitleLinesEditor";
import HeroRowFieldsInline from "./HeroRowFieldsInline";
import BoxedArrayField from "./BoxedArrayField";
import SubscribeToggle from "./SubscribeToggle";
import { TestimonialEditor, LogoCloudEditor, FaqEditor } from "./NewRowEditors";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PageRow } from "@/types/rows";

interface Props {
  row: PageRow;
  onContentChange: (field: string, value: any) => void;
  onRowMetaChange: (updates: Partial<PageRow>) => void;
  /** Reserved for future per-row delete UIs; not consumed today. */
  onDelete?: () => void;
}

/**
 * Shared accordion-trigger styling. Kept in one place so every section
 * in this file looks identical and so a junior engineer can re-skin all
 * triggers at once if the visual design ever changes.
 */
const TRIGGER_CLASS =
  "py-2.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 hover:no-underline " +
  "font-body text-[10px] uppercase tracking-[0.12em] text-foreground";

const CONTENT_CLASS = "pt-3 pb-1 space-y-3";

const RowContentEditor = ({ row, onContentChange, onRowMetaChange }: Props) => {
  const content = row.content;
  // Resolve the row's *effective* background — bg_color first, then
  // custom-gradient first stop, then the row-type default. This is what
  // RichTextEditor reads to flip its preview surface so the editor body
  // text always contrasts the rendered row, not the admin app shell.
  const bg = resolveRowBgColor(row);

  /** Always-rendered top-of-form block: Strip Title + universal Subscribe
   *  toggle. Lives ABOVE the accordions because:
   *    • Strip Title identifies the row in the rail — needed regardless
   *      of which accordion the user has open.
   *    • The subscribe toggle is a global per-row capability we want
   *      visible at a glance, not buried inside an accordion.
   *  Both edits write through the same handlers used by the field
   *  blocks below — see `onContentChange` / `onRowMetaChange`. */
  const commonMeta = (
    <div className="space-y-2 mb-4">
      <Field
        label="Strip Title"
        value={row.strip_title}
        onChange={(v) => onRowMetaChange({ strip_title: v })}
      />
      <SubscribeToggle
        value={!!content.show_subscribe}
        onChange={(v) => onContentChange("show_subscribe", v)}
      />
      {/* ── Advanced · Custom CSS (Epic 2 — US 2.2) ────────────────
       *  Row-level scoped CSS. The `&` token is rewritten to
       *  `#row-<row.id>` by `RowSection`, so rules cannot leak to
       *  other rows. We render this collapsed by default to keep
       *  the form light for non-technical editors. */}
      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="row-advanced" className="border-none">
          <AccordionTrigger className={TRIGGER_CLASS}>Advanced · Custom CSS</AccordionTrigger>
          <AccordionContent className={CONTENT_CLASS}>
            <textarea
              value={row.customCss || ""}
              onChange={(e) => onRowMetaChange({ customCss: e.target.value } as any)}
              spellCheck={false}
              rows={8}
              placeholder={"& { border: 10px solid pink !important; }\n& h1 { font-size: 50px; }"}
              className="w-full px-3 py-2 rounded-md font-mono text-xs leading-relaxed border resize-y"
              style={{
                backgroundColor: "#0f172a",
                color: "#e2e8f0",
                borderColor: "hsl(var(--border))",
                tabSize: 2,
              }}
            />
            <p className="font-body text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              Use <code className="font-mono">&amp;</code> to target this specific row.
              Example: <code className="font-mono">&amp; {`{ background: red; }`}</code>{" "}
              <code className="font-mono">&amp; h1 {`{ font-size: 50px; }`}</code>
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  /** Older rows may have stored title lines as plain text. Normalise. */
  const titleLines = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`,
  );

  /**
   * Reusable accordion shell. `defaultOpen` lists the values that should
   * be expanded on first render — we always keep "text" open because copy
   * editing is by far the most-frequent task.
   */
  const Shell = ({
    children,
    defaultOpen = ["text"],
  }: {
    children: React.ReactNode;
    defaultOpen?: string[];
  }) => (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
      {children}
    </Accordion>
  );

  switch (row.type) {
    case "hero":
      // Hero has its own dense inline editor that already groups fields
      // internally — we wrap it in a single accordion item so the
      // experience stays consistent with other row types.
      return (
        <>
          {commonMeta}
          <Shell defaultOpen={["text"]}>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <HeroRowFieldsInline content={content} onChange={onContentChange} bgColor={bg} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "text":
      return (
        <>
          {commonMeta}
          <Shell>
            {/* GROUP 1 — Copy the visitor reads. */}
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onContentChange("eyebrow", v)} />
                <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} bgColor={bg} />
                <SubtitleEditor
                  subtitle={content.subtitle || ""}
                  subtitleColor={content.subtitle_color || ""}
                  onSubtitleChange={(v) => onContentChange("subtitle", v)}
                  onColorChange={(v) => onContentChange("subtitle_color", v)}
                  bgColor={bg}
                />
                <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} bgColor={bg} />
                <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onContentChange("note", v)} />
              </AccordionContent>
            </AccordionItem>

            {/* Row-level CTA fields (cta_label/cta_url) were retired
                from this editor: a standalone "CTA Button" widget now
                lives in the Elements tray and can be dropped into any
                cell. Existing pages keep working — the renderer still
                reads the legacy fields for backwards compatibility. */}
          </Shell>
        </>
      );

    case "service":
      // Services row delegates to a complex composite editor; surface it
      // under a single "Text & Content" accordion for now. (Internal
      // service-card colors and images are handled inside PillarEditor.)
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <PillarEditor
                  pillarContent={content}
                  servicesContent={{ services: content.services || [] }}
                  onPillarChange={onContentChange}
                  onServicesChange={(svcs) => onContentChange("services", svcs)}
                  bgColor={bg}
                />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "boxed":
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} bgColor={bg} />
                <SubtitleEditor
                  subtitle={content.subtitle || ""}
                  subtitleColor={content.subtitle_color || ""}
                  onSubtitleChange={(v) => onContentChange("subtitle", v)}
                  onColorChange={(v) => onContentChange("subtitle_color", v)}
                  bgColor={bg}
                />
                <BoxedArrayField content={content} onChange={onContentChange} bgColor={bg} />
                <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onContentChange("eyebrow", v)} />
                <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onContentChange("note", v)} />
              </AccordionContent>
            </AccordionItem>

            {/* Row-level CTA fields removed — see "CTA Button" widget
                in the Elements tray. Legacy values still render. */}

            {/* GROUP 3 — Color overrides specific to this content
                (NOT the row background — that lives in RowStyleTab). */}
            <AccordionItem value="design" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Design &amp; Background</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <ColorField label="Card Title Color" value={content.color_card_title || ""} fallback="" onChange={(v) => onContentChange("color_card_title", v)} />
                <ColorField label="Card Body Color" value={content.color_card_body || ""} fallback="" onChange={(v) => onContentChange("color_card_body", v)} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "contact":
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <Field label="Eyebrow" value={content.eyebrow || ""} onChange={(v) => onContentChange("eyebrow", v)} />
                <TitleLinesEditor titleLines={titleLines} onChange={(v) => onContentChange("title_lines", v)} bgColor={bg} />
                <SubtitleEditor
                  subtitle={content.subtitle || ""}
                  subtitleColor={content.subtitle_color || ""}
                  onSubtitleChange={(v) => onContentChange("subtitle", v)}
                  onColorChange={(v) => onContentChange("subtitle_color", v)}
                  bgColor={bg}
                />
                <RichField label="Body" value={content.body || ""} onChange={(v) => onContentChange("body", v)} bgColor={bg} />
                <Field label="Button Text" value={content.button_text || ""} onChange={(v) => onContentChange("button_text", v)} />
                <Field label="Note (optional)" value={content.note || ""} onChange={(v) => onContentChange("note", v)} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="design" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Design &amp; Background</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <SectionBox label="Colors">
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField label="Eyebrow" value={content.color_eyebrow || ""} fallback="#7B3A91" onChange={(v) => onContentChange("color_eyebrow", v)} />
                  </div>
                </SectionBox>
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "image_text":
      // Composite editor handles its own internal grouping (image, text,
      // shape selector). Surface as one Text & Content item — interactive
      // controls inside the editor are still grouped together visually.
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <ImageTextEditor content={content} onChange={onContentChange} bgColor={bg} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "profile":
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <ProfileEditor content={content} onChange={onContentChange} bgColor={bg} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "grid":
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <GridEditor content={content} onChange={onContentChange} bgColor={bg} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "lead_magnet":
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <LeadMagnetEditor
                  content={content}
                  onChange={(next) => Object.entries(next).forEach(([k, v]) => onContentChange(k, v))}
                />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    /* ── NEW ROW TYPES ───────────────────────────────────────────────
     * For a junior engineer: each new row type should mirror the
     * pattern above. Wrap the dedicated editor in a `<Shell>` and put
     * its content inside `<AccordionItem value="text">`. If your
     * editor introduces images / URLs / color overrides that are
     * visually distinct, split them into their own AccordionItem
     * with `value="media"` or `value="design"` respectively. */
    case "testimonial":
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <TestimonialEditor content={content} onChange={onContentChange} bgColor={bg} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "logo_cloud":
      // Logo cloud is intrinsically media — open Media group by default.
      return (
        <>
          {commonMeta}
          <Shell defaultOpen={["media"]}>
            <AccordionItem value="media" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Media &amp; Interactive</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <LogoCloudEditor content={content} onChange={onContentChange} bgColor={bg} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    case "faq":
      return (
        <>
          {commonMeta}
          <Shell>
            <AccordionItem value="text" className="border-none">
              <AccordionTrigger className={TRIGGER_CLASS}>Text &amp; Content</AccordionTrigger>
              <AccordionContent className={CONTENT_CLASS}>
                <FaqEditor content={content} onChange={onContentChange} bgColor={bg} />
              </AccordionContent>
            </AccordionItem>
          </Shell>
        </>
      );

    default:
      return commonMeta;
  }
};

export default RowContentEditor;
