import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        blush: "var(--color-blush)",
        sand: "var(--color-sand)",
        ink: "var(--color-ink)",
        mist: "var(--color-mist)",
        line: "var(--color-line)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        serif: ["var(--font-newsreader)", "serif"],
      },
      boxShadow: {
        soft: "0 18px 48px rgba(28, 22, 17, 0.05)",
      },
      borderRadius: {
        hero: "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
