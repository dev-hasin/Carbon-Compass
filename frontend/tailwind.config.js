/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#0F2E26',
          950: '#0A1F1A',
        },
        primary: '#14B8A6',
        'risk-green': '#22C55E',
        'risk-green-dark': '#4ADE80',
        'risk-amber': '#F59E0B',
        'risk-amber-dark': '#FBBF24',
        'risk-red': '#EF4444',
        'risk-red-dark': '#F87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
