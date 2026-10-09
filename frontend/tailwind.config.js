/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f6ff',
          100: '#e0edff',
          200: '#bae0ff',
          300: '#7cc2ff',
          400: '#369eff',
          500: '#0c7bf3',
          600: '#005ed1',
          700: '#004aa9',
          800: '#063f89',
          900: '#0b356d',
          950: '#072149',
        },
        navy: {
          800: '#0f172a',
          900: '#090d16',
          950: '#030712',
        },
        seal: {
          gold: '#d97706',
          amber: '#b45309',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'gov-card': '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'gov-glow': '0 0 25px rgba(37, 99, 235, 0.15)',
      }
    },
  },
  plugins: [],
}
