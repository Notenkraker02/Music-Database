import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Warm vinyl-inspired palette
        vinyl: {
          50: "#fdf8f0",
          100: "#f5ead6",
          200: "#ead3ab",
          300: "#ddb87a",
          400: "#d4a355",
          500: "#c88a35",
          600: "#b0702a",
          700: "#8f5624",
          800: "#764723",
          900: "#633c20",
        },
        ink: {
          50: "#f4f5f7",
          100: "#e3e5ea",
          200: "#c9cdd6",
          300: "#a3aab8",
          400: "#767f93",
          500: "#5b6478",
          600: "#4e5466",
          700: "#434856",
          800: "#3b3e4a",
          900: "#1a1c23",
          950: "#111318",
        },
        groove: {
          DEFAULT: "#e8572a",
          light: "#f07a55",
          dark: "#c7411b",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
