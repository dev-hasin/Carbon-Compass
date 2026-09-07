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
        // 3D depth shadows — layered for realistic card elevation
        'depth-1': '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.35)',
        'depth-2': '0 2px 4px rgba(0,0,0,0.4), 0 10px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(51, 65, 92, 0.3)',
        'depth-3': '0 4px 8px rgba(0,0,0,0.45), 0 20px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(51, 65, 92, 0.35)',
        'glow-accent': '0 0 0 1px rgba(34, 211, 238, 0.3), 0 8px 32px rgba(34, 211, 238, 0.22), 0 20px 48px rgba(0,0,0,0.5)',
      },
      animation: {
        'radar-sweep': 'radar-sweep 3s linear infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        'fade-up': 'fade-up 0.45s ease-out both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'flip-in-x': 'flip-in-x 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-y': 'float-y 5s ease-in-out infinite',
        'spin-slow': 'spin 14s linear infinite',
        'shimmer': 'shimmer 2.6s linear infinite',
        'glow-pulse': 'glow-pulse 3.2s ease-in-out infinite',
      },
      transitionProperty: {
        'transform': 'transform',
        'transform-shadow': 'transform, box-shadow',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
