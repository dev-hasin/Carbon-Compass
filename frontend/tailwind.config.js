/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Carbon Compass dark design system (Figma references):
        // deep navy/black base with cyan accent and traffic-light risk colors.
        carbon: {
          950: '#05070B',
          900: '#0A0E14',
          850: '#0D1117',
          800: '#111823',
          700: '#1A2332',
          600: '#243044',
          500: '#33415C',
        },
        accent: {
          DEFAULT: '#22D3EE',
          dim: '#0E7490',
          soft: '#67E8F9',
        },
        'risk-green': '#22C55E',
        'risk-green-soft': '#4ADE80',
        'risk-amber': '#F59E0B',
        'risk-amber-soft': '#FBBF24',
        'risk-red': '#EF4444',
        'risk-red-soft': '#F87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(51, 65, 92, 0.25)',
        glow: '0 0 24px rgba(34, 211, 238, 0.15)',
      },
    },
  },
  plugins: [],
}
