import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "900px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        valentino: "hsl(var(--valentino))",
        eliza: "hsl(var(--eliza))",
        "gold-crush": "hsl(var(--gold-crush))",
        revolver: "hsl(var(--revolver))",
        violet: "hsl(var(--violet))",
        plum: "hsl(var(--plum))",
        isabelline: "hsl(var(--isabelline))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      /**
       * VERTICAL RHYTHM SPACING SCALE
       * ─────────────────────────────────────────────────────────────────
       * Used across all CMS rows for consistent gaps between elements.
       * Pick from this scale instead of `mb-2`, `mb-3`, `mb-4`, etc., so
       * one tweak here propagates everywhere.
       *
       *  rhythm-tight (12px)  → eyebrow → title gap
       *  rhythm-base  (24px)  → title → body, subtitle → body
       *  rhythm-loose (48px)  → between major content blocks inside a row
       *  row          (64px)  → top/bottom padding of a row, mobile
       *  row-md       (112px) → top/bottom padding of a row, desktop ≥ md
       *
       * Why 12 / 24 / 48 / 64 / 112: each step is roughly 2× the last.
       * That doubling rhythm is what makes vertical spacing feel
       * "designed" rather than arbitrary — the eye perceives the ratio.
       */
      spacing: {
        "rhythm-tight": "12px",
        "rhythm-base": "24px",
        "rhythm-loose": "48px",
        row: "64px",
        "row-md": "112px",
      },
      fontFamily: {
        display: ["Unbounded", "sans-serif"],
        "body-heading": ["Bricolage Grotesque", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
