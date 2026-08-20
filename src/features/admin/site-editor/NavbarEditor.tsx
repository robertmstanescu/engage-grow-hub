import { Plus, Trash2, GripVertical } from "lucide-react";
import { DeferredInput } from "./DeferredInput";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarContent {
  services_label?: string;
  services_href?: string;
  services_index?: number;
  sub_links?: NavLink[];
  links?: NavLink[];
  show_blog_link?: boolean;
  cta_text?: string;
  cta_href?: string;
}


interface Props {
  content: NavbarContent;
  onChange: (field: string, value: any) => void;
}

const NavbarEditor = ({ content, onChange }: Props) => {
  // No hardcoded brand-specific defaults — admins build nav from scratch.
  const subLinks = content.sub_links || [];
  const links = content.links || [];

  const updateSubLink = (index: number, field: string, value: string) => {
    const updated = [...subLinks];
    updated[index] = { ...updated[index], [field]: value };
    onChange("sub_links", updated);
  };

  const addSubLink = () => {
    onChange("sub_links", [...subLinks, { label: "", href: "#" }]);
  };

  const removeSubLink = (index: number) => {
    onChange("sub_links", subLinks.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: string, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onChange("links", updated);
  };

  const addLink = () => {
    onChange("links", [...links, { label: "", href: "#" }]);
  };

  const removeLink = (index: number) => {
    onChange("links", links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Services dropdown */}
      <div className="space-y-3">
        <label className="font-body text-xs uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
          Services Dropdown Label
        </label>
        <DeferredInput
          type="text"
          value={content.services_label || "Services"}
          onChange={(v) => onChange("services_label", v)}
          className="w-full px-3 py-2 rounded-md font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
        />
        <label className="font-body text-xs uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
          Dropdown Link (page the label opens)
        </label>
        <DeferredInput
          type="text"
          placeholder="/services/"
          value={content.services_href || ""}
          onChange={(v) => onChange("services_href", v)}
          className="w-full px-3 py-2 rounded-md font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
        />
        <label className="font-body text-xs uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
          Position in navigation
        </label>
        <select
          value={String(content.services_index ?? 0)}
          onChange={(e) => onChange("services_index", Number(e.target.value))}
          className="w-full px-3 py-2 rounded-md font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
        >
          {Array.from({ length: links.length + 1 }).map((_, i) => (
            <option key={i} value={i}>
              {i === 0 ? "First" : i === links.length ? "Last" : `After “${links[i - 1]?.label || `link ${i}`}”`}
            </option>
          ))}
        </select>
      </div>


      {/* Sub links (services dropdown items) */}
      <div className="space-y-3">
        <label className="font-body text-xs uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
          Services Dropdown Items
        </label>
        {subLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
            <DeferredInput
              type="text"
              placeholder="Label"
              value={link.label}
              onChange={(v) => updateSubLink(i, "label", v)}
              className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
            />
            <DeferredInput
              type="text"
              placeholder="Link (e.g. #section-id)"
              value={link.href}
              onChange={(v) => updateSubLink(i, "href", v)}
              className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
            />
            <button onClick={() => removeSubLink(i)} className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={addSubLink} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-80" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
          <Plus size={12} /> Add Item
        </button>
      </div>

      {/* Main nav links */}
      <div className="space-y-3">
        <label className="font-body text-xs uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
          Navigation Links
        </label>
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
            <DeferredInput
              type="text"
              placeholder="Label"
              value={link.label}
              onChange={(v) => updateLink(i, "label", v)}
              className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
            />
            <DeferredInput
              type="text"
              placeholder="Link (e.g. #vows or /page)"
              value={link.href}
              onChange={(v) => updateLink(i, "href", v)}
              className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
              style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
            />
            <button onClick={() => removeLink(i)} className="p-1.5 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={addLink} className="flex items-center gap-1.5 font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border hover:opacity-80" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
          <Plus size={12} /> Add Link
        </button>
      </div>

      {/* Blog is a normal nav link (/blog/) — no separate toggle. */}


      {/* CTA button */}
      <div className="space-y-3">
        <label className="font-body text-xs uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
          Call-to-Action Button
        </label>
        <div className="flex gap-2">
          <DeferredInput
            type="text"
            placeholder="Button text"
            value={content.cta_text || ""}
            onChange={(v) => onChange("cta_text", v)}
            className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
          />
          <DeferredInput
            type="text"
            placeholder="Link (e.g. #contact)"
            value={content.cta_href || ""}
            onChange={(v) => onChange("cta_href", v)}
            className="flex-1 px-3 py-2 rounded-md font-body text-sm border"
            style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
          />
        </div>
      </div>
    </div>
  );
};

export default NavbarEditor;
