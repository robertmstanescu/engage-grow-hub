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
import ContactAdmin from "@/features/widgets/contact/ContactAdmin";
import TextRowEditor from "../site-editor/TextRowEditor";
import BoxedRowEditor from "../site-editor/BoxedRowEditor";
import LeadMagnetEditor from "../site-editor/LeadMagnetEditor";
import { ImageRowAdmin } from "@/features/site/rows/ImageRow";
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
 * One editor per row type, keyed by `RowType`.
 *
 * A `Record<RowType, …>` rather than a `switch` so that (a) forgetting
 * a type is a compile error, (b) a key that is not a real row type is a
 * compile error (a stale `"vows"` case lived here for months with no
 * such row type), and (c) `rowRegistry.test.ts` can compare these keys
 * against the renderer registry without parsing source.
 */
export const ROW_TYPE_EDITORS: Record<RowType, (p: RowTypeEditorProps) => JSX.Element> = {
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
  contact: ({ content, onChange }) => <ContactAdmin content={content} onChange={onChange} />,
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
  boxed: ({ content, onChange, bgColor }) => (
    <BoxedRowEditor content={content} onChange={onChange} bgColor={bgColor} />
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
  image: ({ content, onChange }) => <ImageRowAdmin content={content as any} onChange={onChange} />,
};

const RowTypeEditor = (props: RowTypeEditorProps) => {
  const editor = (ROW_TYPE_EDITORS as Record<string, (p: RowTypeEditorProps) => JSX.Element>)[props.type];
  if (editor) return editor(props);
  /* Unknown / future row types still get the standard header fields
     rather than a dead end. */
  return <BrandHeaderFields content={props.content} onChange={props.onChange} bgColor={props.bgColor} />;
};

export default RowTypeEditor;
