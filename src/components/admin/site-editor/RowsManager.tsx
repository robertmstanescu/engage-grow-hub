import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Type, Briefcase, LayoutGrid, Mail, Sparkles, Image, User, Grid3X3, Columns } from "lucide-react";
import { generateRowId, DEFAULT_CONTACT_FIELDS, DEFAULT_ROW_LAYOUT, type PageRow } from "@/types/rows";
import RowAlignmentSettings from "./RowAlignmentSettings";
import ColumnWidthControl from "./ColumnWidthControl";
import { SectionBox, Field, RichField, ArrayField, SelectField, TextArea, ColorField } from "./FieldComponents";
import ImagePickerField from "../ImagePickerField";
import TitleLineEditor from "./TitleLineEditor";
import PillarEditor from "./PillarEditor";
import SubtitleEditor from "./SubtitleEditor";
import ImageTextEditor from "./ImageTextEditor";
import ProfileEditor from "./ProfileEditor";
import GridEditor from "./GridEditor";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ROW_TYPES = [
  { type: "hero" as const, label: "Hero", icon: Sparkles, defaultContent: { label: "", title_lines: [], subtitle: "", subtitle_color: "", body: "", body_color: "", title_color: "", label_color: "", bg_type: "none", bg_url: "" } },
  { type: "text" as const, label: "Text", icon: Type, defaultContent: { title_lines: [], subtitle: "", subtitle_color: "", body: "" } },
  { type: "service" as const, label: "Service", icon: Briefcase, defaultContent: { eyebrow: "", title: "", description: "", services: [] } },
  { type: "boxed" as const, label: "Boxed (max 6)", icon: LayoutGrid, defaultContent: { title_lines: [], subtitle: "", subtitle_color: "", cards: [] } },
  { type: "contact" as const, label: "Contact", icon: Mail, defaultContent: { title_lines: [], body: "", button_text: "Request a discovery call", success_heading: "Message received.", success_body: "We respond within 24 hours.", success_button: "Send another message", show_social: false, fields: DEFAULT_CONTACT_FIELDS } },
  { type: "image_text" as const, label: "Image & Text", icon: Image, defaultContent: { eyebrow: "", title: "", description: "", image_url: "", image_position: "right", image_shape: "default", floating_caption: "", caption_position: "bottom-left", color_eyebrow: "", color_title: "", color_description: "", color_caption_bg: "", color_caption_text: "" } },
  { type: "profile" as const, label: "Profile Feature", icon: User, defaultContent: { eyebrow: "", image_url: "", name: "", role: "", credentials: [], body: "", color_eyebrow: "", color_name: "", color_role: "", color_credential_bg: "", color_credential_text: "", color_body: "" } },
  { type: "grid" as const, label: "Grid", icon: Grid3X3, defaultContent: { eyebrow: "", title: "", description: "", items: [], color_eyebrow: "", color_title: "", color_description: "", color_card_border: "", color_card_border_hover: "", color_card_title: "", color_card_description: "", color_stat_number: "", color_stat_label: "" } },
];

interface Props {
  rows: PageRow[];
  onChange: (rows: PageRow[]) => void;
}

const RowsManager = ({ rows, onChange }: Props) => {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addRow = (type: PageRow["type"]) => {
    const template = ROW_TYPES.find((t) => t.type === type)!;
    const newRow: PageRow = {
      id: generateRowId(),
      type,
      strip_title: `New ${template.label} Row`,
      bg_color: type === "boxed" ? "#2A0E33" : "#FFFFFF",
      content: { ...template.defaultContent },
    };
    onChange([...rows, newRow]);
    setOpenRow(newRow.id);
    setShowAddMenu(false);
  };

  const updateRow = (id: string, updates: Partial<PageRow>) => {
    onChange(rows.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const updateRowContent = (id: string, field: string, value: any) => {
    onChange(rows.map((r) => r.id === id ? { ...r, content: { ...r.content, [field]: value } } : r));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
    if (openRow === id) setOpenRow(null);
  };

  /* ── Column management ── */
  const addColumn = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const template = ROW_TYPES.find((t) => t.type === row.type)!;
    const newColContent = { ...template.defaultContent };
    const existingExtra = row.columns_data || [];
    const newColumnsData = [...existingExtra, newColContent];
    const colCount = 1 + newColumnsData.length;
    const equalWidth = Math.round(100 / colCount);
    const widths = Array(colCount).fill(equalWidth);
    widths[widths.length - 1] = 100 - equalWidth * (colCount - 1);
    onChange(rows.map((r) =>
      r.id === rowId
        ? { ...r, columns_data: newColumnsData, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r
    ));
  };

  const removeColumn = (rowId: string, colIndex: number) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    if (colIndex === 0 && row.columns_data && row.columns_data.length > 0) {
      const [promoted, ...rest] = row.columns_data;
      const colCount = 1 + rest.length;
      const widths = colCount > 1 ? Array(colCount).fill(Math.round(100 / colCount)) : undefined;
      onChange(rows.map((r) =>
        r.id === rowId
          ? { ...r, content: promoted, columns_data: rest.length > 0 ? rest : undefined, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
          : r
      ));
    } else if (colIndex > 0 && row.columns_data) {
      const newExtra = row.columns_data.filter((_, i) => i !== colIndex - 1);
      const colCount = 1 + newExtra.length;
      const widths = colCount > 1 ? Array(colCount).fill(Math.round(100 / colCount)) : undefined;
      onChange(rows.map((r) =>
        r.id === rowId
          ? { ...r, columns_data: newExtra.length > 0 ? newExtra : undefined, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
          : r
      ));
    }
  };

  const updateColumnContent = (rowId: string, colDataIndex: number, field: string, value: any) => {
    onChange(rows.map((r) => {
      if (r.id !== rowId || !r.columns_data) return r;
      const next = [...r.columns_data];
      next[colDataIndex] = { ...next[colDataIndex], [field]: value };
      return { ...r, columns_data: next };
    }));
  };

  const updateColumnWidths = (rowId: string, widths: number[]) => {
    onChange(rows.map((r) =>
      r.id === rowId
        ? { ...r, layout: { ...(r.layout || DEFAULT_ROW_LAYOUT), column_widths: widths } }
        : r
    ));
  };

  const renderRowEditorForContent = (row: PageRow, content: Record<string, any>, onContentChange: (field: string, value: any) => void) => {
    switch (row.type) {
      case "hero":
        return <HeroRowFields content={content} onChange={onContentChange} />;
      case "text":
        return <TextRowFields content={content} onChange={onContentChange} />;
      case "service":
        return (
          <PillarEditor
            pillarContent={content}
            servicesContent={{ services: content.services || [] }}
            onPillarChange={onContentChange}
            onServicesChange={(svcs) => onContentChange("services", svcs)}
          />
        );
      case "boxed":
        return <BoxedRowFields content={content} onChange={onContentChange} />;
      case "contact":
        return <ContactRowFields content={content} onChange={onContentChange} />;
      case "image_text":
        return <ImageTextEditor content={content} onChange={onContentChange} />;
      case "profile":
        return <ProfileEditor content={content} onChange={onContentChange} />;
      case "grid":
        return <GridEditor content={content} onChange={onContentChange} />;
      default:
        return null;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rows.findIndex((r) => r.id === active.id);
      const newIndex = rows.findIndex((r) => r.id === over.id);
      onChange(arrayMove(rows, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Page Rows</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1 rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Row
          </button>
          {showAddMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-lg border shadow-lg overflow-hidden"
              style={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
              {ROW_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => addRow(t.type)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:opacity-80 transition-opacity font-body text-xs"
                  style={{ color: "hsl(var(--foreground))" }}>
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row) => {
            const TypeIcon = ROW_TYPES.find((t) => t.type === row.type)?.icon || Type;
            return (
              <SortableRowItem
                key={row.id}
                row={row}
                TypeIcon={TypeIcon}
                isOpen={openRow === row.id}
                onToggle={() => setOpenRow(openRow === row.id ? null : row.id)}
                onRemove={() => removeRow(row.id)}
                onUpdateRow={(updates) => updateRow(row.id, updates)}
                onUpdateContent={(field, value) => updateRowContent(row.id, field, value)}
                onAddColumn={() => addColumn(row.id)}
                onRemoveColumn={(colIndex) => removeColumn(row.id, colIndex)}
                onUpdateColumnContent={(colDataIdx, field, value) => updateColumnContent(row.id, colDataIdx, field, value)}
                onUpdateColumnWidths={(widths) => updateColumnWidths(row.id, widths)}
                renderEditorForContent={(content, onContentChange) => renderRowEditorForContent(row, content, onContentChange)}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
};

/* ── Sortable Row Item ── */

interface SortableRowItemProps {
  row: PageRow;
  TypeIcon: any;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateRow: (updates: Partial<PageRow>) => void;
  onUpdateContent: (field: string, value: any) => void;
  onAddColumn: () => void;
  onRemoveColumn: (colIndex: number) => void;
  onUpdateColumnContent: (colDataIndex: number, field: string, value: any) => void;
  onUpdateColumnWidths: (widths: number[]) => void;
  renderEditorForContent: (content: Record<string, any>, onContentChange: (field: string, value: any) => void) => React.ReactNode;
}

const SortableRowItem = ({
  row, TypeIcon, isOpen, onToggle, onRemove, onUpdateRow, onUpdateContent,
  onAddColumn, onRemoveColumn, onUpdateColumnContent, onUpdateColumnWidths,
  renderEditorForContent,
}: SortableRowItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const [activeCol, setActiveCol] = useState(0);

  const colCount = 1 + (row.columns_data?.length || 0);
  const hasInherentSplit = row.type === "image_text" || row.type === "profile";
  const showWidthControl = colCount > 1 || hasInherentSplit;
  const widthColCount = hasInherentSplit && colCount === 1 ? 2 : colCount;
  const columnWidths = row.layout?.column_widths || Array(widthColCount).fill(Math.round(100 / widthColCount));

  // Get content and onChange for the active column
  const getColContent = (col: number) => col === 0 ? row.content : (row.columns_data?.[col - 1] || {});
  const getColOnChange = (col: number): ((field: string, value: any) => void) =>
    col === 0 ? onUpdateContent : (field, value) => onUpdateColumnContent(col - 1, field, value);

  // Clamp activeCol if columns were removed
  const safeActiveCol = Math.min(activeCol, colCount - 1);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderColor: "hsl(var(--border) / 0.5)",
    backgroundColor: "hsl(var(--card))",
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5" style={{ color: "hsl(var(--foreground))" }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:opacity-70 touch-none"
            style={{ color: "hsl(var(--muted-foreground))" }}
            {...attributes}
            {...listeners}>
            <GripVertical size={14} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity min-w-0">
            <TypeIcon size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
            <span className="font-body text-xs font-medium truncate">{row.strip_title}</span>
            <span className="font-body text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--muted) / 0.4)", color: "hsl(var(--muted-foreground))" }}>
              {row.type}
            </span>
            {colCount > 1 && (
              <span className="font-body text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                {colCount} cols
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          {colCount < 4 && (
            <button type="button" onClick={onAddColumn} className="p-1 rounded hover:opacity-70" style={{ color: "hsl(var(--primary))" }} title="Add Column">
              <Columns size={13} />
            </button>
          )}
          <button type="button" onClick={onRemove} className="p-1 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
            <Trash2 size={13} />
          </button>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Field label="Strip Title" value={row.strip_title} onChange={(v) => onUpdateRow({ strip_title: v })} />
            <div>
              <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Background Color</label>
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={row.bg_color || "#FFFFFF"}
                  onChange={(e) => onUpdateRow({ bg_color: e.target.value })}
                  className="w-10 h-9 rounded border cursor-pointer"
                  style={{ borderColor: "hsl(var(--border))" }}
                />
                <input
                  value={row.bg_color || ""}
                  onChange={(e) => onUpdateRow({ bg_color: e.target.value })}
                  placeholder="#FFFFFF"
                  className="flex-1 px-3 py-2 rounded-lg font-body text-sm border"
                  style={{ borderColor: "hsl(var(--border))", backgroundColor: "#FFFFFF", color: "#1a1a1a" }}
                />
              </div>
            </div>
          </div>
          {row.type !== "hero" && (
            <RowAlignmentSettings
              layout={row.layout || DEFAULT_ROW_LAYOUT}
              onChange={(layout) => onUpdateRow({ layout })}
            />
          )}

          {/* Column width control */}
          {showWidthControl && (
            <ColumnWidthControl
              columnCount={widthColCount}
              widths={columnWidths}
              onChange={onUpdateColumnWidths}
            />
          )}

          {/* Column tabs */}
          {colCount > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: colCount }).map((_, i) => (
                <div key={i} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveCol(i)}
                    className="px-3 py-1.5 rounded-t text-[10px] font-body font-medium transition-all"
                    style={{
                      backgroundColor: safeActiveCol === i ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.3)",
                      color: safeActiveCol === i ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    }}
                  >
                    Column {i + 1}
                  </button>
                  {colCount > 1 && (
                    <button
                      type="button"
                      onClick={() => { onRemoveColumn(i); if (safeActiveCol >= colCount - 1) setActiveCol(Math.max(0, colCount - 2)); }}
                      className="p-0.5 rounded hover:opacity-70 -ml-1"
                      style={{ color: "hsl(var(--destructive) / 0.7)" }}
                      title={`Remove Column ${i + 1}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={getColContent(safeActiveCol).show_subscribe || false}
              onChange={(e) => getColOnChange(safeActiveCol)("show_subscribe", e.target.checked)}
              className="rounded"
              style={{ accentColor: "hsl(var(--primary))" }}
            />
            <span className="font-body text-xs" style={{ color: "hsl(var(--foreground))" }}>Show Subscribe widget</span>
          </label>
          {renderEditorForContent(getColContent(safeActiveCol), getColOnChange(safeActiveCol))}
        </div>
      )}
    </div>
  );
};

/* ── Inline sub-editors ── */

const TitleLinesEditor = ({ titleLines, onChange }: { titleLines: string[]; onChange: (lines: string[]) => void }) => {
  const updateLine = (idx: number, html: string) => {
    const next = [...titleLines];
    next[idx] = html;
    onChange(next);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Title Lines</label>
        <button type="button" onClick={() => onChange([...titleLines, "<p></p>"])} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {titleLines.map((line, i) => (
          <SectionBox key={i} label={`Line ${i + 1}`}>
            <div className="flex gap-2">
              <div className="flex-1"><TitleLineEditor value={line} onChange={(v) => updateLine(i, v)} /></div>
              <button type="button" onClick={() => onChange(titleLines.filter((_, j) => j !== i))} className="self-end p-2 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </SectionBox>
        ))}
      </div>
    </div>
  );
};

const HeroRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const BG_TYPES = [
    { label: "None", value: "none" },
    { label: "Image", value: "image" },
    { label: "Video", value: "video" },
  ];
  return (
    <div className="space-y-3">
      <Field label="Eyebrow (small text above title)" value={content.label || ""} onChange={(v) => onChange("label", v)} />
      <ColorField label="Eyebrow Color" description="Color of the small eyebrow text above the title" value={content.color_label || ""} fallback="" onChange={(v) => onChange("color_label", v)} />
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <Field label="Tagline (small text below title)" value={content.tagline || ""} onChange={(v) => onChange("tagline", v)} />
      <ColorField label="Tagline Color" description="Color of the small tagline text below the title" value={content.color_tagline || ""} fallback="" onChange={(v) => onChange("color_tagline", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
      <SectionBox label="Background">
        <SelectField label="Type" value={content.bg_type || "none"} options={BG_TYPES} onChange={(v) => onChange("bg_type", v)} />
        {content.bg_type === "image" && (
          <ImagePickerField label="Background Image" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />
        )}
        {content.bg_type === "video" && (
          <Field label="Video URL" value={content.bg_url || ""} onChange={(v) => onChange("bg_url", v)} />
        )}
      </SectionBox>
    </div>
  );
};

const TextRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
    </div>
  );
};

const BoxedRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const cards: { title: string; body: string }[] = content.cards || [];

  const updateCard = (idx: number, field: string, value: string) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    onChange("cards", next);
  };

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <SubtitleEditor
        subtitle={content.subtitle || ""}
        subtitleColor={content.subtitle_color || ""}
        onSubtitleChange={(v) => onChange("subtitle", v)}
        onColorChange={(v) => onChange("subtitle_color", v)}
      />
      <ColorField label="Card Title Color" description="Color of card titles in this section" value={content.color_card_title || ""} fallback="" onChange={(v) => onChange("color_card_title", v)} />
      <ColorField label="Card Body Color" description="Color of card body text" value={content.color_card_body || ""} fallback="" onChange={(v) => onChange("color_card_body", v)} />
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-body text-[10px] uppercase tracking-wider text-muted-foreground">Cards (max 6)</label>
          <button type="button" onClick={() => onChange("cards", [...cards, { title: "", body: "" }])} disabled={cards.length >= 6} className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full hover:opacity-70 disabled:opacity-30" style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Plus size={10} /> Add Card
          </button>
        </div>
        <div className="space-y-2">
          {cards.map((card, i) => (
            <SectionBox key={i} label={`Card ${i + 1}`}>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Field label="Title" value={card.title} onChange={(v) => updateCard(i, "title", v)} />
                  </div>
                  <button type="button" onClick={() => onChange("cards", cards.filter((_, j) => j !== i))} className="self-start p-2 rounded hover:opacity-70 mt-5" style={{ color: "hsl(var(--destructive))" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <RichField label="Body" value={card.body} onChange={(v) => updateCard(i, "body", v)} />
              </div>
            </SectionBox>
          ))}
        </div>
      </div>
    </div>
  );
};

const ContactRowFields = ({ content, onChange }: { content: Record<string, any>; onChange: (field: string, value: any) => void }) => {
  const titleLines: string[] = (content.title_lines || []).map((l: any) =>
    typeof l === "string" ? (l.startsWith("<") ? l : `<p>${l}</p>`) : `<p>${l}</p>`
  );
  const fields = content.fields || DEFAULT_CONTACT_FIELDS;

  const updateFieldConfig = (idx: number, key: string, value: any) => {
    const next = [...fields];
    next[idx] = { ...next[idx], [key]: value };
    onChange("fields", next);
  };

  const addField = () => {
    const key = `custom_${Date.now()}`;
    onChange("fields", [...fields, { key, label: "New field", type: "text", required: false, visible: true }]);
  };

  const removeField = (idx: number) => {
    onChange("fields", fields.filter((_: any, i: number) => i !== idx));
  };

  const FIELD_TYPES = [
    { label: "Text", value: "text" },
    { label: "Email", value: "email" },
    { label: "Textarea", value: "textarea" },
    { label: "Checkbox", value: "checkbox" },
    { label: "Phone", value: "tel" },
    { label: "URL", value: "url" },
  ];

  return (
    <div className="space-y-3">
      <TitleLinesEditor titleLines={titleLines} onChange={(v) => onChange("title_lines", v)} />
      <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
      <Field label="Button Text" value={content.button_text || ""} onChange={(v) => onChange("button_text", v)} />

      <SectionBox label="Form Fields">
        <div className="space-y-2">
          {fields.map((f: any, i: number) => (
            <div key={f.key || i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--background))" }}>
              <input
                type="checkbox"
                checked={f.visible}
                onChange={(e) => updateFieldConfig(i, "visible", e.target.checked)}
                className="rounded"
                style={{ accentColor: "hsl(var(--primary))" }}
              />
              <input
                value={f.label}
                onChange={(e) => updateFieldConfig(i, "label", e.target.value)}
                className="flex-1 px-2 py-1 rounded font-body text-xs border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "transparent" }}
              />
              <select
                value={f.type}
                onChange={(e) => updateFieldConfig(i, "type", e.target.value)}
                className="px-2 py-1 rounded font-body text-[10px] border"
                style={{ borderColor: "hsl(var(--border))", backgroundColor: "transparent" }}>
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1 font-body text-[9px] uppercase tracking-wider text-muted-foreground">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => updateFieldConfig(i, "required", e.target.checked)}
                  className="rounded"
                  style={{ accentColor: "hsl(var(--primary))" }}
                />
                Req
              </label>
              <button type="button" onClick={() => removeField(i)} className="p-1 rounded hover:opacity-70" style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1 font-body text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full hover:opacity-70 transition-opacity mt-2"
          style={{ color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <Plus size={10} /> Add Field
        </button>
      </SectionBox>

      <SectionBox label="Success State">
        <Field label="Heading" value={content.success_heading || ""} onChange={(v) => onChange("success_heading", v)} />
        <Field label="Body" value={content.success_body || ""} onChange={(v) => onChange("success_body", v)} />
        <Field label="Button Text" value={content.success_button || ""} onChange={(v) => onChange("success_button", v)} />
      </SectionBox>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={content.show_social || false}
          onChange={(e) => onChange("show_social", e.target.checked)}
          className="rounded"
          style={{ accentColor: "hsl(var(--primary))" }}
        />
        <span className="font-body text-xs text-muted-foreground">Show social media links below form</span>
      </label>
    </div>
  );
};

export default RowsManager;
