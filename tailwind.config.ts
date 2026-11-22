import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        brand: {
          DEFAULT: "#FF6B00",
          dark: "#E05E00",
          light: "#FF8A33"
        },
        cloud: "#F3F3F3"
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,17,17,0.04), 0 12px 32px -12px rgba(17,17,17,0.18)",
        glow: "0 12px 40px -12px rgba(255,107,0,0.55)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
