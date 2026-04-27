/**
 * IconPicker — popover-based picker that lets admins choose either
 * a Lucide icon (searchable) or a custom uploaded icon. Includes
 * an inline upload form for adding new custom icons.
 *
 * Designed to slot into the admin properties panel as a
 * `<IconPickerField label="Icon" value={...} onChange={...} />`.
 */

import { useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Upload, X, Search } from "lucide-react";
import * as Lucide from "lucide-react";
import Icon, { type IconValue, parseIcon } from "./Icon";
import { COMMON_LUCIDE_ICONS } from "./lucideCatalog";
import { useIconLibrary, useUploadIcon, useDeleteIcon } from "./useIconLibrary";

interface PickerProps {
  value?: IconValue;
  onChange: (next: IconValue) => void;
}

const ALL_LUCIDE_NAMES = Object.keys(Lucide).filter(
  (k) => /^[A-Z]/.test(k) && typeof (Lucide as any)[k] === "object" && (Lucide as any)[k]?.$$typeof,
);

const IconPicker = ({ value, onChange }: PickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: customIcons = [], isLoading } = useIconLibrary();
  const uploadMut = useUploadIcon();
  const deleteMut = useDeleteIcon();

  const lucideResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const source = q ? ALL_LUCIDE_NAMES : COMMON_LUCIDE_ICONS;
    if (!q) return source.slice(0, 200);
    return source.filter((n) => n.toLowerCase().includes(q)).slice(0, 200);
  }, [search]);

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
      <PopoverContent className="w-[380px] p-3" align="start">
        <Tabs defaultValue="lucide">
          <TabsList className="w-full">
            <TabsTrigger value="lucide" className="flex-1">Lucide</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom ({customIcons.length})</TabsTrigger>
          </TabsList>

          <div className="relative my-2">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="pl-7 h-8 text-sm"
            />
          </div>

          <TabsContent value="lucide" className="m-0">
            <ScrollArea className="h-[280px]">
              <div className="grid grid-cols-8 gap-1 pr-2">
                {lucideResults.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => select(`lucide:${name}`)}
                    className={`aspect-square flex items-center justify-center rounded hover:bg-muted/60 transition-colors ${
                      value === `lucide:${name}` ? "bg-primary/10 ring-1 ring-primary" : ""
                    }`}
                  >
                    <Icon value={`lucide:${name}`} size={18} />
                  </button>
                ))}
                {lucideResults.length === 0 && (
                  <p className="col-span-8 text-center text-xs text-muted-foreground py-8">
                    No icons match “{search}”.
                  </p>
                )}
              </div>
            </ScrollArea>
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

            <ScrollArea className="h-[230px]">
              <div className="grid grid-cols-6 gap-2 pr-2">
                {isLoading && <p className="col-span-6 text-xs text-muted-foreground py-4 text-center">Loading…</p>}
                {!isLoading && customResults.length === 0 && (
                  <p className="col-span-6 text-xs text-muted-foreground py-4 text-center">
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
                        className={`w-full aspect-square flex items-center justify-center rounded border hover:bg-muted/60 ${
                          value === v ? "ring-1 ring-primary" : ""
                        }`}
                      >
                        <Icon value={v} size={22} />
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
