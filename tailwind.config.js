/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blood: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d'
        },
        slate: {
          950: '#020617'
        }
      },
      boxShadow: {
        glass: '0 20px 60px rgba(2, 6, 23, 0.35)',
        glow: '0 0 40px rgba(248, 113, 113, 0.2)'
      },
      backgroundImage: {
        'dashboard-radial': 'radial-gradient(circle at top, rgba(248, 113, 113, 0.18), transparent 40%), radial-gradient(circle at bottom right, rgba(100, 116, 139, 0.18), transparent 36%)'
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' }
        }
      }
    }
  },
  plugins: [],
};