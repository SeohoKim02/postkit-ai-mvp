import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#26242c",
        muted: "#726f7a",
        line: "#ebe5dc",
        wash: "#fbf8f3",
        coral: "#ff6b4a",
        mint: "#4fc9a8",
        sky: "#4f8cff",
        lemon: "#f7c948",
        blush: "#fff0ea",
        aqua: "#edf9f6"
      },
      boxShadow: {
        soft: "0 18px 48px rgba(38, 36, 44, 0.07)",
        lift: "0 10px 24px rgba(38, 36, 44, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
