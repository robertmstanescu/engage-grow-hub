import { useId, useState, useEffect, useRef } from "react";

/**
 * Hard limit for image alt text — enforced in three places:
 *   1. <input maxLength> attribute (browser-level)
 *   2. The character counter UI below the input
 *   3. The database CHECK constraint on blog_posts.*_alt columns
 *
 * Why 100? Screen readers tend to announce alt text in one breath; longer
 * descriptions become noise. Search engines also prefer concise alt text.
 */
export const ALT_TEXT_MAX_LENGTH = 100;

/**
 * Validates an alt-text string against our 100-character cap.
 * Trim is intentional — leading/trailing whitespace shouldn't eat into
 * the user's allowance.
 */
export const isValidAltText = (value: string): boolean =>
  value.trim().length <= ALT_TEXT_MAX_LENGTH;

interface ImageAltInputProps {
  /** Current alt text value (controlled). */
  value: string;
  /** Called on every keystroke with the new value. */
  onChange: (value: string) => void;
  /** Called when the input loses focus — use this to persist to DB. */
  onBlur?: () => void;
  /** Optional override of the default label. */
  label?: string;
  /** Optional placeholder. */
  placeholder?: string;
}

/**
 * <ImageAltInput/> — single, reusable input for SEO/accessibility alt text
 * on any image in the admin panel.
 *
 * ## Why this component exists
 *
 * Alt text rules are the same everywhere: max 100 chars, show a counter,
 * indicate when the user is over the limit. Duplicating this UI in five
 * different image editors (BlogEditor cover, BlogEditor author, OG image,
 * row image, overlay) leads to inconsistencies — counter on some, missing
 * on others, different limits, etc. One component fixes all of that.
 *
 * ## How to use
 *
 * Pair it with the matching image picker. Save the value to the same
 * record/JSON field as the URL itself.
 *
 * ```tsx
 * <ImagePickerField label="Cover" value={form.cover_image} onChange={...} />
 * <ImageAltInput value={form.cover_image_alt} onChange={...} onBlur={save} />
 * ```
 */
const ImageAltInput = ({
  value,
  onChange,
  onBlur,
  label = "Image Alt Text (SEO)",
  placeholder = "Describe the image in 100 characters or less",
}: ImageAltInputProps) => {
  const id = useId();
  const length = value.length;
  const isOver = length > ALT_TEXT_MAX_LENGTH;
  const isNearLimit = length >= ALT_TEXT_MAX_LENGTH - 10 && !isOver;

  const counterColor = isOver
    ? "hsl(var(--destructive))"
    : isNearLimit
      ? "hsl(var(--accent))"
      : "hsl(var(--muted-foreground))";

  return (
    <div className="mt-2">
      <label
        htmlFor={id}
        className="font-body text-[10px] uppercase tracking-wider mb-1 block"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        maxLength={ALT_TEXT_MAX_LENGTH}
        placeholder={placeholder}
        aria-describedby={`${id}-counter`}
        aria-invalid={isOver}
        className="w-full px-3 py-1.5 rounded-lg font-body text-xs border"
        style={{
          borderColor: isOver ? "hsl(var(--destructive))" : "hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
        }}
      />
      <div
        id={`${id}-counter`}
        className="font-body text-[10px] mt-1 text-right"
        style={{ color: counterColor }}
        aria-live="polite"
      >
        {length}/{ALT_TEXT_MAX_LENGTH}
      </div>
    </div>
  );
};

export default ImageAltInput;
