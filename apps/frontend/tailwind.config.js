/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FDF8F3",
        primary: {
          DEFAULT: "#5C3D2E",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#E8B84A",
          foreground: "#5C3D2E",
          strong: "#96661F",
        },
        destructive: "#C94C4C",
        success: "#3D8B5F",
        muted: {
          DEFAULT: "#F5EDE4",
          foreground: "#8B7355",
        },
        card: "#FFFFFF",
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        brand: "0 6px 16px -4px rgba(92, 61, 46, 0.18)",
        "brand-lg": "0 14px 32px -8px rgba(92, 61, 46, 0.24)",
        "brand-card":
          "0 2px 6px rgba(92, 61, 46, 0.08), 0 8px 24px -4px rgba(92, 61, 46, 0.22)",
        "brand-card-hover":
          "0 4px 10px rgba(92, 61, 46, 0.1), 0 16px 36px -6px rgba(92, 61, 46, 0.3)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        mobile: "430px",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "logo-fill": {
          "0%": { clipPath: "inset(0 100% 0 0)" },
          "58%": { clipPath: "inset(0 0 0 0)" },
          "72%": { clipPath: "inset(0 0 0 0)" },
          "100%": { clipPath: "inset(0 100% 0 0)" },
        },
        "logo-fill-once": {
          "0%": { clipPath: "inset(0 100% 0 0)" },
          "100%": { clipPath: "inset(0 0 0 0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "logo-fill": "logo-fill 1.8s cubic-bezier(0.45, 0, 0.2, 1) infinite both",
        "logo-fill-once": "logo-fill-once 1.15s cubic-bezier(0.4, 0, 0.15, 1) both",
      },
    },
  },
  plugins: [],
};
