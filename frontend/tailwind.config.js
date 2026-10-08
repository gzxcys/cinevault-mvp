/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Blood-палитра
        "blood-bg": "#0A0A0A",
        "blood-card": "#151515",
        "blood-elev": "#1C1C1C",
        "blood-border": "#262626",
        "blood-accent": "#E50914", // Netflix красный
        "blood-glow": "#FF2D2D", // яркий для glow
        "blood-dim": "#8B0000", // тёмный для фонов
        "blood-muted": "#737373",
      },
      fontFamily: {
        display: ["Bebas Neue", "Oswald", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(229, 9, 20, 0.4)",
        glow: "0 0 20px rgba(229, 9, 20, 0.5)",
        "glow-lg": "0 0 40px rgba(229, 9, 20, 0.6)",
        "glow-xl": "0 0 60px rgba(229, 9, 20, 0.7)",
        "inset-red": "inset 0 0 20px rgba(229, 9, 20, 0.15)",
        blood: "0 8px 24px rgba(0, 0, 0, 0.8)",
      },
      animation: {
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        scan: "scan 4s linear infinite",
        flicker: "flicker 4s linear infinite",
        "slide-in": "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 6s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(229, 9, 20, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(229, 9, 20, 0.7)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 19.9%, 22%, 62.9%, 64%, 64.9%, 70%, 100%": { opacity: "1" },
          "20%, 21.9%, 63%, 63.9%, 65%, 69.9%": { opacity: "0.6" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
      },
    },
  },
  plugins: [],
};
