/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Purple Patch Farms palette (purple brand)
        ppf: {
          purple: "#7C3AED", // primary
          "purple-deep": "#5B21B6",
          "purple-light": "#EDE9FE",
          green: "#7C3AED", // brand accent aliased to purple (whole app is purple)
          "green-deep": "#5B21B6",
          "green-dark": "#5B21B6",
          mint: "#EDE9FE",
          bg: "#F6F5FB",
          card: "#FFFFFF",
          text: "#1A1A2E",
          subtext: "#6B7280",
          muted: "#9CA3AF",
          border: "#E9E7F0",
          input: "#F3F2F8",
          danger: "#EF4444",
          peach: "#F8CFA0",
          "accent-green": "#7CC894",
          violet: "#8A78D9",
        },
      },
      boxShadow: {
        card: "0 4px 16px rgba(26,26,46,0.06)",
        glow: "0 8px 20px rgba(124,58,237,0.35)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};
