export interface PageRow {
  id: string;
  type: "text" | "service" | "boxed" | "contact";
  strip_title: string;
  bg_color: string;
  scope?: string;
  content: Record<string, any>;
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

export const DEFAULT_ROWS: PageRow[] = [
  {
    id: generateRowId(),
    type: "text",
    strip_title: "Intro",
    bg_color: "#F9F0C1",
    scope: "scope-intro",
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
    scope: "pillar-comms",
    content: {
      pillar_number: "Pillar 01",
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
    scope: "pillar-ex",
    content: {
      pillar_number: "Pillar 02",
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
    scope: "scope-vows",
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
    scope: "scope-contact",
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
