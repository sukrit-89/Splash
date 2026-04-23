import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        surface: "#111111",
        line: "#1f1f1f",
        primary: "#f5f5f5",
        secondary: "#737373",
        flow: "#22c55e",
        blueMute: "#6ea8ff",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "SFMono-Regular",
          "Cascadia Code",
          "Roboto Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      boxShadow: {
        lift: "0 14px 40px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
} satisfies Config;
