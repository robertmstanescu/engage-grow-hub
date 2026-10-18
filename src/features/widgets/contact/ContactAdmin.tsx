/**
 * ContactAdmin — editor for the Contact block, which books calls through
 * Google Calendar appointment scheduling (embedded calendar + button).
 */

import { MoreFields, Field, RichField } from "@/features/admin/site-editor/FieldComponents";
import TitleLinesEditor from "@/features/admin/editors/TitleLinesEditor";
import ImagePickerField from "@/features/admin/ImagePickerField";
import { DEFAULT_BOOKING_URL, DEFAULT_CALENDAR_EMBED_URL } from "@/features/site/rows/ContactRow";

interface Props {
  content: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const ContactAdmin = ({ content, onChange }: Props) => (
  <div className="space-y-3">
    <TitleLinesEditor titleLines={content.title_lines || []} onChange={(v) => onChange("title_lines", v)} />
    <RichField label="Body" value={content.body || ""} onChange={(v) => onChange("body", v)} />
    <Field
      label="Button text"
      value={content.booking_button_text || "Book a discovery call"}
      onChange={(v) => onChange("booking_button_text", v)}
    />
    <Field
      label="Booking page link"
      value={content.booking_url || DEFAULT_BOOKING_URL}
      onChange={(v) => onChange("booking_url", v)}
    />
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={content.show_calendar !== false}
        onChange={(e) => onChange("show_calendar", e.target.checked)}
        className="rounded"
      />
      <span className="font-body text-xs text-muted-foreground">Show the calendar on the page</span>
    </label>

    <MoreFields>
      <Field
        label="Calendar embed link (Google Calendar)"
        value={content.calendar_embed_url || DEFAULT_CALENDAR_EMBED_URL}
        onChange={(v) => onChange("calendar_embed_url", v)}
      />
      <ImagePickerField
        label="Cover Image (optional)"
        value={content.cover_image || ""}
        onChange={(v) => onChange("cover_image", v)}
        altValue={content.cover_image_alt || ""}
        onAltChange={(v) => onChange("cover_image_alt", v)}
      />
    </MoreFields>
  </div>
);

export default ContactAdmin;
