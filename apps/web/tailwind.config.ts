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
      },
      boxShadow: {
        soft: "0 20px 60px rgba(28, 22, 17, 0.08)",
      },
      borderRadius: {
        hero: "2rem",
      },
    },
  },
  plugins: [],
};

export default config;

