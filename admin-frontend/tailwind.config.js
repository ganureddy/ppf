/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // VeggieGo green palette (matches the customer app)
        ppf: {
          purple: "#7C3AED",
          "purple-deep": "#5B21B6",
          "purple-light": "#EDE9FE",
          green: "#0B7A3B",
          "green-deep": "#4C1D95",
          mint: "#EDE9FE",
          bg: "#F6F5FB",
          card: "#FFFFFF",
          text: "#1A1A2E",
          subtext: "#6B7280",
          muted: "#9CA3AF",
          border: "#E9E7F0",
          danger: "#EF4444",
          peach: "#F8CFA0",
          "accent-green": "#7CC894",
          violet: "#8A78D9",
        },
      },
      boxShadow: { card: "0 4px 16px rgba(17,24,39,0.06)" },
      borderRadius: { card: "16px" },
    },
  },
  plugins: [],
};
