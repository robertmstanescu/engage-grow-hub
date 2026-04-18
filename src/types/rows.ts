export type GradientType = "linear" | "radial" | "conic" | "mesh";

export interface GradientStop {
  color: string;
  position: number; // 0-100
  alpha?: number;   // 0-100, defaults to 100
}

export interface GradientConfig {
  type: GradientType;
  angle: number; // 0-360 for linear/conic
  radialShape?: "circle" | "ellipse";
  radialPosition?: string; // e.g. "center", "top left"
  stops: GradientStop[];
  enabled: boolean;
}

export const DEFAULT_GRADIENT: GradientConfig = {
  type: "linear",
  angle: 135,
  radialShape: "ellipse",
  radialPosition: "center",
  stops: [
    { color: "#4D1B5E", position: 0 },
    { color: "#5A2370", position: 100 },
  ],
  enabled: false,
};

export type OverlayFit = "fit" | "fill" | "original";
export type OverlayAnchor = "top-left" | "top-center" | "top-right" | "middle-left" | "middle-center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "hard-light" | "color-dodge" | "color-burn" | "difference" | "exclusion" | "luminosity";

export interface OverlayElement {
  id: string;
  url: string;
  fit: OverlayFit;
  anchor: OverlayAnchor;
  opacity: number;   // 0-100
  rotation: number;  // 0-360
  blendMode: BlendMode;
}

export interface RowLayout {
  columns: 1 | 2 | 3 | 4;
  column_widths?: number[]; // proportional widths, e.g. [60, 40]
  fullWidth: boolean;
  paddingTop: number;
  paddingBottom: number;
  marginTop: number;
  marginBottom: number;
  bgImage?: string;
  bgImageOpacity?: number; // 0-100, defaults to 100
  bgColorOpacity?: number; // 0-100, defaults to 100 (applies to row.bg_color)
  alignment?: "auto" | "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  gradientStart?: string;
  gradientEnd?: string;
  gradient?: GradientConfig;
  overlays?: OverlayElement[];
  carouselTheme?: "auto" | "light" | "dark";
}

export const DEFAULT_ROW_LAYOUT: RowLayout = {
  columns: 1,
  fullWidth: false,
  paddingTop: 64,
  paddingBottom: 64,
  marginTop: 0,
  marginBottom: 0,
  alignment: "auto",
};

export interface PageRow {
  id: string;
  type: "hero" | "text" | "service" | "boxed" | "contact" | "image_text" | "profile" | "grid" | "lead_magnet";
  strip_title: string;
  bg_color: string;
  scope?: string;
  layout?: RowLayout;
  content: Record<string, any>;
  columns_data?: Record<string, any>[]; // extra columns beyond the first
}

export interface ContactField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
}

export const DEFAULT_CONTACT_FIELDS: ContactField[] = [
  { key: "name", label: "Your name", type: "text", required: true, visible: true },
  { key: "email", label: "Email address", type: "email", required: true, visible: true },
  { key: "company", label: "Company", type: "text", required: false, visible: true },
  { key: "message", label: "Tell us about your vampire moment", type: "textarea", required: true, visible: true },
  { key: "marketing", label: "Keep me updated with insights and articles", type: "checkbox", required: false, visible: true },
];

export const generateRowId = () => crypto.randomUUID();

/** Get all column contents and their grid widths */
export const getRowColumns = (row: PageRow) => {
  const contents = [row.content, ...(row.columns_data || [])];
  const widths = row.layout?.column_widths || contents.map(() => Math.round(100 / contents.length));
  return { contents, widths, isMultiCol: contents.length > 1 };
};

export const multiColGridStyle = (widths: number[]): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: widths.map((w) => `${w}fr`).join(" "),
  gap: "2rem",
});

export const DEFAULT_ROWS: PageRow[] = [
  {
    id: generateRowId(),
    type: "text",
    strip_title: "Intro",
    bg_color: "#F9F0C1",
    content: {
      title_lines: [],
      subtitle: "",
      subtitle_color: "",
      body: 'We work across two disciplines: <strong>Internal Communications</strong> and <strong>Employee Experience</strong>. Every engagement starts with the same question — where is the life being drained? — and ends with something that actually works.',
    },
  },
  {
    id: generateRowId(),
    type: "service",
    strip_title: "Internal Communications",
    bg_color: "#FFFFFF",
    content: {
      eyebrow: "Pillar 01",
      title: "Internal Communications",
      description: "Most internal comms is noise dressed up as signal.",
      services: [
        {
          tag: "Fixed project", tagType: "fixed", title: "The Inspection", subtitle: "Internal Communications Audit",
          description: "Something is off. Messages are landing flat. Town halls feel like theatre.",
          deliverables: ["Stakeholder interviews", "Full audit", "Written findings report", "Action roadmap"],
          price: "Book a free consultation", time: "2–3 weeks · ~15–20 hours",
        },
      ],
    },
  },
  {
    id: generateRowId(),
    type: "service",
    strip_title: "Employee Experience",
    bg_color: "#F4F0EC",
    content: {
      eyebrow: "Pillar 02",
      title: "Employee Experience",
      description: "The modern workplace is haunted by zombie journeys.",
      services: [
        {
          tag: "Fixed project", tagType: "fixed", title: "The Inspection", subtitle: "Employee Experience Audit",
          description: "Before you can fix the experience, you need to know where it's bleeding.",
          deliverables: ["Employee interviews", "Lifecycle review", "Journey Map", "Recommendations report"],
          price: "Book a free consultation", time: "2 weeks · ~14–18 hours",
        },
      ],
    },
  },
  {
    id: generateRowId(),
    type: "boxed",
    strip_title: "Vows",
    bg_color: "#2A0E33",
    content: {
      title_lines: ["<p>Before we shake hands,</p>", "<p>here is what we vow.</p>"],
      subtitle: "",
      subtitle_color: "",
      cards: [
        { title: "Precision over pomp", body: "Our reports are as clear as a glass prism and as sharp as a stake. No buzzwords. No padding. No synergy." },
        { title: "The human trace", body: "Behind every strategy is a handwritten insight. Your people are not capital. They are the life-force." },
        { title: "Expansive horizons", body: "We don't just fix the room. We remove the ceiling. Every engagement is a door to something bigger." },
      ],
    },
  },
  {
    id: generateRowId(),
    type: "contact",
    strip_title: "Contact",
    bg_color: "#FFFFFF",
    content: {
      title_lines: ["<p>Not sure where to start?</p>", "<p>Lift the lid first.</p>"],
      body: "Book a free 30-minute consultation. We'll identify your biggest vampire moment and tell you honestly whether we're the right fit to bury it.",
      button_text: "Request a discovery call",
      success_heading: "Message received.",
      success_body: "We respond within 24 hours. Thank you for reaching out.",
      success_button: "Send another message",
      show_social: false,
      fields: DEFAULT_CONTACT_FIELDS,
    },
  },
];
