/**
 * Block families — the eight things an editor picks from the tray.
 *
 * Nineteen registered widget types is too many to scan. Each family
 * groups the types that mean the same thing to an editor ("Cards" is
 * boxed, grid, service, testimonials, logo cloud); the type itself is
 * the family's *variant*, chosen after picking the family. Nothing
 * about the registry or the stored data changes: a family is a label
 * over existing types.
 *
 * `blockFamilies.test.ts` fails if a registered type belongs to no
 * family or to two, or a family's default variant is not registered.
 */
import {
  AlignLeft, LayoutGrid, Image, Hash, ListOrdered, HelpCircle, Megaphone, Mail,
} from "lucide-react";

export interface BlockVariant { type: string; label: string; hint?: string; /** Only offered inside a blog post. */ postsOnly?: boolean }
export interface BlockFamily {
  key: string;
  label: string;
  icon: typeof AlignLeft;
  hint: string;
  /** First entry is the default variant (used by drag and single-click). */
  variants: BlockVariant[];
}

export const BLOCK_FAMILIES: BlockFamily[] = [
  {
    key: "text", label: "Text", icon: AlignLeft, hint: "A heading and copy",
    variants: [
      { type: "text", label: "Text", hint: "Heading, subtitle, copy" },
      { type: "hero", label: "Hero", hint: "Big page opener with the page background" },
      { type: "article", label: "Article", hint: "The post's own words, edited under Posts", postsOnly: true },
    ],
  },
  {
    key: "cards", label: "Cards", icon: LayoutGrid, hint: "Things side by side",
    variants: [
      { type: "boxed", label: "Boxed cards", hint: "Title and copy in a box, 2 to 4 across" },
      { type: "grid", label: "Grid with stats", hint: "Three numbers, achievements, a button" },
      { type: "service", label: "Services", hint: "Service cards with deliverables and price" },
      { type: "testimonial", label: "Testimonials", hint: "Quotes with names" },
      { type: "logo_cloud", label: "Logos", hint: "A row of client logos" },
    ],
  },
  {
    key: "media", label: "Media + Text", icon: Image, hint: "A picture beside copy",
    variants: [
      { type: "image_text", label: "Picture + text", hint: "Picture one side, copy the other" },
      { type: "profile", label: "Profile", hint: "Portrait, name, role, biography" },
      { type: "image", label: "Picture", hint: "Just a picture, full width" },
    ],
  },
  {
    key: "numbers", label: "Numbers", icon: Hash, hint: "Proof in figures",
    variants: [{ type: "proof_band", label: "Proof strip", hint: "Three figures with labels" }],
  },
  {
    key: "steps", label: "Steps", icon: ListOrdered, hint: "How something happens",
    variants: [{ type: "process_steps", label: "Steps", hint: "Numbered steps with copy" }],
  },
  {
    key: "questions", label: "Questions", icon: HelpCircle, hint: "Questions people ask",
    variants: [{ type: "faq", label: "FAQ", hint: "Expandable questions and answers" }],
  },
  {
    key: "banner", label: "Banner", icon: Megaphone, hint: "One line and a button",
    variants: [
      { type: "cta_band", label: "Call to action", hint: "Statement and a button on a band" },
      { type: "quote_band", label: "Quote", hint: "One quote with a name" },
      { type: "cta_button", label: "Button only", hint: "A single button" },
    ],
  },
  {
    key: "form", label: "Form", icon: Mail, hint: "Collect a message or an email",
    variants: [
      { type: "contact", label: "Contact form", hint: "Name, email, message" },
      { type: "subscribe", label: "Subscribe", hint: "Email sign-up" },
      { type: "lead_magnet", label: "Download", hint: "A file in exchange for an email" },
    ],
  },
];

/** The family a registered type belongs to, if any. */
export const familyOf = (type: string): BlockFamily | undefined =>
  BLOCK_FAMILIES.find((f) => f.variants.some((v) => v.type === type));

export const defaultVariant = (family: BlockFamily): BlockVariant => family.variants[0];
