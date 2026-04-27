/**
 * IconPicker — popover-based picker that lets admins choose either
 * a Lucide icon (browseable by category, searchable) or a custom
 * uploaded icon. Includes inline upload for new custom icons.
 */

import { useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Upload, X, Search, icons as lucideIcons } from "lucide-react";
import Icon, { type IconValue, parseIcon } from "./Icon";
import { ICON_CATEGORIES } from "./lucideCatalog";
import { useIconLibrary, useUploadIcon, useDeleteIcon } from "./useIconLibrary";

interface PickerProps {
  value?: IconValue;
  onChange: (next: IconValue) => void;
}

// Source of truth = the same map the <Icon /> renderer uses.
const ALL_LUCIDE_NAMES = Object.keys(lucideIcons).sort();
const ALL_LUCIDE_SET = new Set(ALL_LUCIDE_NAMES);

// Filter the curated category lists to only icons that actually exist
// in this lucide-react version (defends against catalog drift).
const SAFE_CATEGORIES = ICON_CATEGORIES.map((c) => ({
  ...c,
  icons: c.icons.filter((n) => ALL_LUCIDE_SET.has(n)),
})).filter((c) => c.icons.length > 0);

const IconPicker = ({ value, onChange }: PickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: customIcons = [], isLoading } = useIconLibrary();
  const uploadMut = useUploadIcon();
  const deleteMut = useDeleteIcon();

  const lucideResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return ALL_LUCIDE_NAMES.filter((n) => n.toLowerCase().includes(q));
    }
    if (activeCategory === "all") return ALL_LUCIDE_NAMES;
    const cat = SAFE_CATEGORIES.find((c) => c.id === activeCategory);
    return cat ? cat.icons : ALL_LUCIDE_NAMES;
  }, [search, activeCategory]);

  const customResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customIcons;
    return customIcons.filter((c) => c.name.toLowerCase().includes(q));
  }, [customIcons, search]);

  const select = (next: IconValue) => {
    onChange(next);
    setOpen(false);
  };

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    const item = await uploadMut.mutateAsync({ file });
    select(`custom:${item.public_url}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-left w-full hover:opacity-80"
          style={{ borderColor: "hsl(var(--border))", color: "#1a1a1a" }}
        >
          <span className="w-6 h-6 flex items-center justify-center rounded bg-muted/40">
            {value ? <Icon value={value} size={18} /> : <span className="text-xs text-muted-foreground">∅</span>}
          </span>
          <span className="font-body text-sm flex-1 truncate">
            {value ? (parseIcon(value)?.kind === "lucide" ? `Lucide · ${value.slice(7)}` : "Custom icon") : "No icon"}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); } }}
              className="p-1 hover:opacity-60"
              aria-label="Clear icon"
            >
              <X size={12} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[560px] p-3"
        align="start"
        /* Force light background + dark icon color so icons are always
           visible regardless of where the popover renders. */
        style={{ background: "#ffffff", color: "#1a1a1a" }}
      >
        <Tabs defaultValue="lucide">
          <TabsList className="w-full">
            <TabsTrigger value="lucide" className="flex-1">Lucide ({ALL_LUCIDE_NAMES.length})</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom ({customIcons.length})</TabsTrigger>
          </TabsList>

          <div className="relative my-2">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "#888" }} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 1500+ icons…"
              className="pl-7 h-8 text-sm"
              style={{ background: "#fff", color: "#1a1a1a", borderColor: "#e5e5e5" }}
            />
          </div>

          <TabsContent value="lucide" className="m-0">
            <div className="flex gap-2" style={{ height: 320 }}>
              {/* Category sidebar */}
              <ScrollArea className="w-[140px] shrink-0 border-r pr-1" style={{ borderColor: "#eee" }}>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className="text-left px-2 py-1.5 rounded text-xs hover:bg-black/5 transition-colors"
                    style={{
                      background: activeCategory === "all" && !search ? "rgba(0,0,0,0.06)" : "transparent",
                      color: "#1a1a1a",
                      fontWeight: activeCategory === "all" && !search ? 600 : 400,
                    }}
                  >
                    All <span style={{ color: "#888" }}>({ALL_LUCIDE_NAMES.length})</span>
                  </button>
                  {SAFE_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setActiveCategory(c.id); setSearch(""); }}
                      className="text-left px-2 py-1.5 rounded text-xs hover:bg-black/5 transition-colors"
                      style={{
                        background: activeCategory === c.id && !search ? "rgba(0,0,0,0.06)" : "transparent",
                        color: "#1a1a1a",
                        fontWeight: activeCategory === c.id && !search ? 600 : 400,
                      }}
                    >
                      {c.label} <span style={{ color: "#888" }}>({c.icons.length})</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Icon grid */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-8 gap-1 pr-2">
                  {lucideResults.map((name) => {
                    const selected = value === `lucide:${name}`;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => select(`lucide:${name}`)}
                        className="aspect-square flex items-center justify-center rounded transition-colors"
                        style={{
                          background: selected ? "rgba(124, 58, 237, 0.12)" : "transparent",
                          boxShadow: selected ? "inset 0 0 0 1px rgba(124, 58, 237, 0.6)" : "none",
                          color: "#1a1a1a",
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Icon value={`lucide:${name}`} size={18} color="#1a1a1a" />
                      </button>
                    );
                  })}
                  {lucideResults.length === 0 && (
                    <p className="col-span-8 text-center text-xs py-8" style={{ color: "#888" }}>
                      No icons match “{search}”.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="m-0 space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/svg+xml,image/png,image/webp,image/jpeg"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploadMut.isPending}
            >
              <Upload size={12} className="mr-1" />
              {uploadMut.isPending ? "Uploading…" : "Upload icon (SVG, PNG)"}
            </Button>

            <ScrollArea className="h-[270px]">
              <div className="grid grid-cols-6 gap-2 pr-2">
                {isLoading && <p className="col-span-6 text-xs py-4 text-center" style={{ color: "#888" }}>Loading…</p>}
                {!isLoading && customResults.length === 0 && (
                  <p className="col-span-6 text-xs py-4 text-center" style={{ color: "#888" }}>
                    No custom icons yet. Upload one above.
                  </p>
                )}
                {customResults.map((c) => {
                  const v = `custom:${c.public_url}`;
                  return (
                    <div key={c.id} className="relative group">
                      <button
                        type="button"
                        title={c.name}
                        onClick={() => select(v)}
                        className="w-full aspect-square flex items-center justify-center rounded border hover:bg-black/5"
                        style={{
                          borderColor: "#eee",
                          boxShadow: value === v ? "inset 0 0 0 1px rgba(124,58,237,0.6)" : "none",
                          color: "#1a1a1a",
                        }}
                      >
                        <Icon value={v} size={22} color="#1a1a1a" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMut.mutate(c)}
                        className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;

/**
 * Labelled wrapper matching the project's other admin field components.
 */
export const IconPickerField = ({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value?: IconValue;
  onChange: (v: IconValue) => void;
  hint?: string;
}) => (
  <div>
    <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
      {label}
    </label>
    <IconPicker value={value} onChange={onChange} />
    {hint && <p className="font-body text-[10px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);
