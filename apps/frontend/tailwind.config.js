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
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
