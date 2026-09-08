/**
 * RowTypeEditor — ONE shared per-row-type content-editor dispatch.
 *
 * Previously this switch existed only inside InspectorPanel (the
 * click-on-the-canvas editor), while the list-style RowsManager kept a
 * smaller, drifting copy that returned `null` for half the row types
 * (testimonial, logo_cloud, faq, proof_band, process_steps, quote_band,
 * cta_band, lead_magnet got NO editor at all there). Both surfaces now
 * render through this component, so adding a field to one editor
 * reaches every admin surface at once.
 */
import HeroRowFields from "../site-editor/HeroEditor";
import PillarEditor from "../site-editor/PillarEditor";
import ImageTextEditor from "../site-editor/ImageTextEditor";
import ProfileEditor from "../site-editor/ProfileEditor";
import GridEditor from "../site-editor/GridEditor";
import TextRowEditor from "../site-editor/TextRowEditor";
import LeadMagnetEditor from "../site-editor/LeadMagnetEditor";
import { Suspense } from "react";
import { getWidget } from "@/lib/WidgetRegistry";
import type { RowType } from "@/types/rows";
import {
  BrandHeaderFields,
  TestimonialEditor,
  LogoCloudEditor,
  FaqEditor,
  ProofBandEditor,
  ProcessStepsEditor,
  QuoteBandEditor,
  CtaBandEditor,
} from "./NewRowEditors";

interface RowTypeEditorProps {
  /** Row/widget type (v1 row type or v3 widget type). */
  type: string;
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  /** Whole-content replace — LeadMagnetEditor's historical signature. */
  onReplaceContent?: (next: Record<string, any>) => void;
  /** Live row background, forwarded for legible rich-text contrast. */
  bgColor?: string;
  /** v1 rows store split widths on layout — ImageTextEditor's fallback. */
  legacySplitWidths?: number[];
}

/**
 * Editors for the row types NOT yet migrated to a self-registering
 * widget module (src/features/widgets/<type>/index.tsx). A migrated
 * type registers its editor as `adminComponent` and must not appear
 * here; `RowTypeEditor` looks the registry up first.
 *
 * Keyed by `RowType` so a key that is not a real row type is a compile
 * error (a stale `"vows"` case lived here for months with no such row
 * type). `rowRegistry.test.ts` asserts every row type has exactly one
 * editor between this map and the registry.
 */
export const ROW_TYPE_EDITORS: Partial<Record<RowType, (p: RowTypeEditorProps) => JSX.Element>> = {
  hero: ({ content, onChange, bgColor }) => (
    <HeroRowFields content={content} onChange={onChange} bgColor={bgColor} />
  ),
  service: ({ content, onChange, bgColor }) => (
    <PillarEditor
      pillarContent={content}
      servicesContent={{ services: content.services || [] }}
      onPillarChange={onChange}
      onServicesChange={(svcs) => onChange("services", svcs)}
      bgColor={bgColor}
    />
  ),
  image_text: ({ content, onChange, bgColor, legacySplitWidths }) => (
    <ImageTextEditor
      content={content}
      onChange={onChange}
      bgColor={bgColor}
      legacySplitWidths={legacySplitWidths}
    />
  ),
  profile: ({ content, onChange, bgColor }) => (
    <ProfileEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  grid: ({ content, onChange, bgColor }) => (
    <GridEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  text: ({ content, onChange, bgColor }) => (
    <TextRowEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  lead_magnet: ({ content, onChange, onReplaceContent }) => (
    <LeadMagnetEditor
      content={content}
      onChange={(next: Record<string, any>) =>
        onReplaceContent ? onReplaceContent(next) : Object.entries(next).forEach(([k, v]) => onChange(k, v))
      }
    />
  ),
  logo_cloud: ({ content, onChange }) => <LogoCloudEditor content={content} onChange={onChange} />,
  testimonial: ({ content, onChange, bgColor }) => (
    <TestimonialEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  faq: ({ content, onChange, bgColor }) => (
    <FaqEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  proof_band: ({ content, onChange, bgColor }) => (
    <ProofBandEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  process_steps: ({ content, onChange, bgColor }) => (
    <ProcessStepsEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  quote_band: ({ content, onChange, bgColor }) => (
    <QuoteBandEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
  cta_band: ({ content, onChange, bgColor }) => (
    <CtaBandEditor content={content} onChange={onChange} bgColor={bgColor} />
  ),
};

const RowTypeEditor = (props: RowTypeEditorProps) => {
  // Registry first: a migrated widget module owns its editor.
  const Admin = getWidget(props.type)?.adminComponent as
    | React.ComponentType<{ content: Record<string, any>; onChange: (field: string, value: any) => void; bgColor?: string }>
    | undefined;
  if (Admin) {
    // Migrated editors are `lazy()` (kept out of the public bundle).
    return (
      <Suspense fallback={null}>
        <Admin content={props.content} onChange={props.onChange} bgColor={props.bgColor} />
      </Suspense>
    );
  }
  const editor = (ROW_TYPE_EDITORS as Record<string, (p: RowTypeEditorProps) => JSX.Element>)[props.type];
  if (editor) return editor(props);
  /* Unknown / future row types still get the standard header fields
     rather than a dead end. */
  return <BrandHeaderFields content={props.content} onChange={props.onChange} bgColor={props.bgColor} />;
};

export default RowTypeEditor;
