/**
 * Section library — pre-designed rows so nobody starts from an empty
 * one. Each section is a v3 row built from a widget's registry
 * defaults plus real copy and a Look (see editors/rowLooks.ts). They
 * live in code, not in the snippets table, so they version with the
 * product and never depend on a database write; an editor's own saved
 * rows still appear under "My snippets".
 *
 * Inserting one goes through the same path as a snippet
 * (`insertPrebuiltRow`), which clones every id, so a section can be
 * dropped twice on one page without collisions.
 */
import type { PageRowV3, PageWidget, RowLayout } from "@/types/rows";
import { buildEmptyV3Row, generateRowId } from "@/lib/constants/rowDefaults";
import { getWidget } from "@/lib/WidgetRegistry";

export interface LibrarySection {
  key: string;
  name: string;
  /** Family label shown beside the name. */
  family: string;
  build: () => PageRowV3;
}

type RowExtras = { strip_title: string; bg_color?: string; layout?: Record<string, unknown> };

/** One-widget row: the widget's registry defaults merged with `data`. */
const rowWith = (type: string, data: Record<string, unknown>, extras: RowExtras): PageRowV3 => {
  const base = (getWidget(type)?.defaultData ?? {}) as Record<string, unknown>;
  const row = buildEmptyV3Row(1);
  const widget: PageWidget = { id: generateRowId(), type: type as PageWidget["type"], data: { ...base, ...data } };
  const cell = row.columns[0]?.cells?.[0];
  if (cell) cell.widgets = [widget];
  row.strip_title = extras.strip_title;
  if (extras.bg_color !== undefined) row.bg_color = extras.bg_color;
  row.layout = { ...row.layout, ...(extras.layout || {}) } as RowLayout;
  return row;
};

const p = (s: string) => `<p>${s}</p>`;

export const SECTION_LIBRARY: LibrarySection[] = [
  {
    key: "hero-statement", name: "Hero, statement", family: "Text",
    build: () => rowWith("hero", {
      eyebrow: "What we do",
      title_lines: ["Say the thing", "everyone is thinking."],
      body: "One sentence on who this is for and what changes when they work with you.",
      cta_label: "Book a call", cta_url: "#contact",
    }, { strip_title: "Hero" }),
  },
  {
    key: "intro", name: "Intro paragraph", family: "Text",
    build: () => rowWith("text", {
      eyebrow: "Why this matters",
      title_lines: ["Every organisation has a story it tells itself."],
      body: p("Two or three sentences that set up the page. Keep it about the reader, not about you."),
    }, { strip_title: "Intro" }),
  },
  {
    key: "feature-trio", name: "Feature trio", family: "Cards",
    build: () => rowWith("boxed", {
      eyebrow: "What you get",
      title_lines: ["Three things, plainly."],
      cards: [
        { title: "The problem", body: p("Name the pain in one sentence.") },
        { title: "Who this is for", body: p("The person, the size of team, the moment.") },
        { title: "What changes", body: p("The result, with a number if you have one.") },
      ],
    }, { strip_title: "Feature trio", bg_color: "#FFFFFF", layout: { surfaceRadius: "medium" } }),
  },
  {
    key: "proof-strip", name: "Proof strip", family: "Numbers",
    build: () => rowWith("proof_band", {
      eyebrow: "Proof, not promises",
      title_lines: ["Numbers instead of adjectives."],
      items: [
        { value: "36", label: "countries" },
        { value: "500", label: "people supported" },
        { value: "3", label: "redundancy rounds" },
      ],
    }, { strip_title: "Proof strip" }),
  },
  {
    key: "how-it-works", name: "How it works", family: "Steps",
    build: () => rowWith("process_steps", {
      eyebrow: "How we work",
      title_lines: ["Listen. Name it. Fix it."],
      steps: [
        { title: "Listen", description: p("A week of conversations before any advice.") },
        { title: "Name it", description: p("The problem in one page, agreed with you.") },
        { title: "Fix it", description: p("A plan with dates, and hands on the work.") },
      ],
    }, { strip_title: "How it works" }),
  },
  {
    key: "picture-text", name: "Picture beside text", family: "Media + Text",
    build: () => rowWith("image_text", {
      eyebrow: "What we do",
      title_lines: ["Clarity & order."],
      description: p("Every organisation is convinced its problem is unique. It may be. But it is more likely that it is something someone else has been through."),
      image_position: "right",
    }, { strip_title: "Picture beside text" }),
  },
  {
    key: "founder", name: "Founder profile", family: "Media + Text",
    build: () => rowWith("profile", {
      eyebrow: "Who you'll work with",
      title_lines: ["This is who I am"],
      name: "Your name", role: "Founder",
      body: p("Two short paragraphs. Where you've been, what you've seen, why you do this."),
    }, { strip_title: "Founder profile", bg_color: "#26142E" }),
  },
  {
    key: "testimonials", name: "What clients say", family: "Cards",
    build: () => rowWith("testimonial", {
      items: [
        { quote: "They named the problem in a week. We'd been circling it for a year.", name: "A client", role: "COO" },
        { quote: "The first plan we've actually followed.", name: "Another client", role: "Head of People" },
      ],
    }, { strip_title: "Testimonials", bg_color: "#FFFFFF", layout: { surfaceRadius: "medium" } }),
  },
  {
    key: "faq", name: "Questions people ask", family: "Questions",
    build: () => rowWith("faq", {
      eyebrow: "FAQ",
      title_lines: ["Questions people ask before they call."],
      items: [
        { question: "What do you actually do?", answer: p("Answer in two sentences.") },
        { question: "Do you work outside the UK?", answer: p("Yes. Say where.") },
        { question: "How fast can we start?", answer: p("Give a real number of weeks.") },
      ],
    }, { strip_title: "FAQ", bg_color: "#FFFFFF", layout: { surfaceRadius: "medium" } }),
  },
  {
    key: "quote", name: "One quote", family: "Banner",
    build: () => rowWith("quote_band", {
      quote: p("The sentence you'd put on a wall."),
      name: "Who said it", role: "Their role",
    }, { strip_title: "Quote", bg_color: "#26142E" }),
  },
  {
    key: "cta", name: "Call to action", family: "Banner",
    build: () => rowWith("cta_band", {
      title_lines: ["Not sure where to start?", "Lift the lid."],
      button_text: "Book a call", button_url: "#contact",
    }, { strip_title: "Call to action", bg_color: "#26142E" }),
  },
  {
    key: "contact", name: "Contact form", family: "Form",
    build: () => rowWith("contact", {
      title_lines: ["Tell us what's haunting you."],
      body: p("Name, email and one sentence is enough."),
    }, { strip_title: "Contact" }),
  },
];
