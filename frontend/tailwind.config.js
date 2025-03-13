/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: 'rgb(148 163 184)', // text-slate-400
            maxWidth: 'none',
            h1: {
              color: 'rgb(226 232 240)', // text-slate-200
            },
            h2: {
              color: 'rgb(226 232 240)',
            },
            h3: {
              color: 'rgb(226 232 240)',
            },
            strong: {
              color: 'rgb(226 232 240)',
            },
            a: {
              color: 'rgb(56 189 248)', // text-sky-400
              '&:hover': {
                color: 'rgb(125 211 252)', // text-sky-300
              },
            },
            code: {
              color: 'rgb(226 232 240)',
              backgroundColor: 'rgb(30 41 59)', // bg-slate-800
              borderRadius: '0.25rem',
              padding: '0.25rem',
            },
          },
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
}
