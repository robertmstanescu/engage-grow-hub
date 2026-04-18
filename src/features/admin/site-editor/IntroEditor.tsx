import { RichField } from "./FieldComponents";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
  /** Live row background — forwarded to RichField so light text stays legible. */
  bgColor?: string;
}

const IntroEditor = ({ content, onChange, bgColor }: Props) => (
  <div className="space-y-3">
    <RichField label="Intro Text" value={content.text || ""} onChange={(v) => onChange("text", v)} bgColor={bgColor} />
  </div>
);

export default IntroEditor;
