import { RichField } from "./FieldComponents";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const IntroEditor = ({ content, onChange }: Props) => (
  <div className="space-y-3">
    <RichField label="Intro Text" value={content.text || ""} onChange={(v) => onChange("text", v)} />
  </div>
);

export default IntroEditor;
