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
import VowsEditor from "../site-editor/VowsEditor";
import { ImageRowAdmin } from "@/features/site/rows/ImageRow";
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

const RowTypeEditor = ({
  type,
  content,
  onChange,
  onReplaceContent,
  bgColor,
  legacySplitWidths,
}: RowTypeEditorProps) => {
  switch (type) {
    case "hero":
      return <HeroRowFields content={content} onChange={onChange} bgColor={bgColor} />;
    case "service":
      return (
        <PillarEditor
          pillarContent={content}
          servicesContent={{ services: content.services || [] }}
          onPillarChange={onChange}
          onServicesChange={(svcs) => onChange("services", svcs)}
          bgColor={bgColor}
        />
      );
    case "contact":
      return <ContactAdmin content={content} onChange={onChange} />;
    case "image_text":
      return (
        <ImageTextEditor
          content={content}
          onChange={onChange}
          bgColor={bgColor}
          legacySplitWidths={legacySplitWidths}
        />
      );
    case "profile":
      return <ProfileEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "grid":
      return <GridEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "text":
      return <TextRowEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "boxed":
      return <BoxedRowEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "lead_magnet":
      return (
        <LeadMagnetEditor
          content={content}
          onChange={(next: Record<string, any>) =>
            onReplaceContent ? onReplaceContent(next) : Object.entries(next).forEach(([k, v]) => onChange(k, v))
          }
        />
      );
    case "logo_cloud":
      return <LogoCloudEditor content={content} onChange={onChange} />;
    case "vows":
      return <VowsEditor content={content} onChange={onChange} />;
    case "testimonial":
      return <TestimonialEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "faq":
      return <FaqEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "proof_band":
      return <ProofBandEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "process_steps":
      return <ProcessStepsEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "quote_band":
      return <QuoteBandEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "cta_band":
      return <CtaBandEditor content={content} onChange={onChange} bgColor={bgColor} />;
    case "image":
      return <ImageRowAdmin content={content as any} onChange={onChange} />;
    default:
      /* Unknown / future row types still get the standard header
         fields rather than a dead end. */
      return <BrandHeaderFields content={content} onChange={onChange} bgColor={bgColor} />;
  }
};

export default RowTypeEditor;
