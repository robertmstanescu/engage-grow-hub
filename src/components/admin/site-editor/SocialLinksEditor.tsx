import { Field } from "./FieldComponents";

const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "threads", label: "Threads" },
];

interface Props {
  content: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

const SocialLinksEditor = ({ content, onChange }: Props) => (
  <div className="space-y-3">
    <p className="font-body text-xs text-muted-foreground">
      Enter the full URL for each platform. Leave blank to hide the icon in the footer.
    </p>
    {PLATFORMS.map((p) => (
      <Field key={p.key} label={p.label} value={content[p.key] || ""} onChange={(v) => onChange(p.key, v)} />
    ))}
  </div>
);

export default SocialLinksEditor;
