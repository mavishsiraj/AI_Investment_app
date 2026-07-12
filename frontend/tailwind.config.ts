import type { Config } from "tailwindcss";

/**
 * tailwind.config.ts
 *
 * Every color used anywhere in the app maps to a CSS variable defined in
 * globals.css — no new hardcoded hex values in components. Radius collapses
 * to three tokens (sm/md/full) instead of picking arbitrary values per
 * component. Letter-spacing for "label" text is 0.08em, not the
 * tracking-[0.3em] the audit flagged as hurting legibility.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "IBM Plex Mono", "Menlo", "monospace"],
      },
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        foreground: {
          DEFAULT: "var(--fg-primary)",
          muted: "var(--fg-muted)",
          faint: "var(--fg-faint)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          muted: "var(--accent-muted)",
          foreground: "var(--accent-foreground)",
        },
        positive: {
          DEFAULT: "var(--positive)",
          muted: "var(--positive-muted)",
        },
        negative: {
          DEFAULT: "var(--negative)",
          muted: "var(--negative-muted)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          muted: "var(--warning-muted)",
        },
      },
      borderRadius: {
        sm: "8px",
        md: "16px",
        full: "9999px",
      },
      letterSpacing: {
        label: "0.08em",
      },
      boxShadow: {
        card: "0 12px 40px rgba(0,0,0,0.35)",
      },
      keyframes: {
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-slide-up": "fade-slide-up 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
