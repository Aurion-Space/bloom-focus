/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': '#FFF9F0',
        'bg-tint': '#FEF3E4',
        'surface': '#FFFFFF',
        'ink': '#3B2E2A',
        'ink-soft': '#6B5D54',
        'ink-faint': '#A89A8E',
        'line': '#EADBC8',
        'line-soft': '#F3E7D4',
        'petal': '#F5B7C7',
        'petal-deep': '#E89AAE',
        'sage': '#B8D4BC',
        'sage-deep': '#8FBF96',
        'lavender': '#D4C5E8',
        'lavender-deep': '#B39FD6',
        'peach': '#FFD4B8',
        'butter': '#FDE6A8',
        'terracotta': '#E08D6A',
        'stem': '#6FA373',
      },
      fontFamily: {
        'display': ['"DM Serif Display"', 'Georgia', 'serif'],
        'body': ['Nunito', 'sans-serif'],
        'hand': ['Caveat', 'cursive'],
      },
      borderRadius: {
        'sm': '10px',
        'DEFAULT': '18px',
        'lg': '28px',
        'xl': '40px',
      },
      boxShadow: {
        'md': '0 4px 12px rgba(95,70,50,0.08), 0 2px 4px rgba(95,70,50,0.04)',
        'lg': '0 18px 40px rgba(95,70,50,0.12), 0 6px 14px rgba(95,70,50,0.06)',
      },
    },
  },
  plugins: [],
}