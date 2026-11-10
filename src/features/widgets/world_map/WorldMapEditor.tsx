import { EyebrowField, TextAreaField, SectionBox } from "@/features/admin/site-editor/FieldComponents";
import TitleLinesEditor from "@/features/admin/editors/TitleLinesEditor";
import { MAP_PLACES, parseCountryPaste } from "./resolve";
import type { WorldMapContent } from "./schema";

interface Props {
  content: WorldMapContent;
  onChange: (key: string, value: unknown) => void;
  bgColor?: string;
}

const CountryListField = ({ label, hint, value, onChange }: { label: string; hint: string; value: string[]; onChange: (v: string[]) => void }) => (
  <TextAreaField
    label={label}
    hint={hint}
    value={value.join("\n")}
    onChange={(v) => onChange(parseCountryPaste(v))}
    rows={4}
  />
);

const WorldMapEditor = ({ content, onChange, bgColor }: Props) => (
  <div className="space-y-4">
    <EyebrowField value={content.eyebrow || ""} color="" onChange={(v) => onChange("eyebrow", v)} onColorChange={() => {}} />
    <TitleLinesEditor titleLines={content.title_lines || []} onChange={(v) => onChange("title_lines", v)} bgColor={bgColor} />
    <TextAreaField label="Intro" value={content.lede || ""} onChange={(v) => onChange("lede", v)} rows={3} />
    <SectionBox group label="Countries">
      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        One country per line (or comma-separated). A country in several lists gets the last list's colour.
        A main market that is in neither of the first two lists is shaded but left out of the counters.
        Known places: {MAP_PLACES.map((c) => c.name).join(", ")}.
      </p>
      <CountryListField label="Internal comms" hint="Shaded gold." value={content.worked || []} onChange={(v) => onChange("worked", v)} />
      <CountryListField label="Internal comms and HR" hint="Shaded purple." value={content.hr || []} onChange={(v) => onChange("hr", v)} />
      <CountryListField label="Main markets today" hint="Shaded orange (Mars Yellow)." value={content.main || []} onChange={(v) => onChange("main", v)} />
    </SectionBox>
  </div>
);

export default WorldMapEditor;
