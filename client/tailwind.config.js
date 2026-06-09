/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#fdf8f0',
          100: '#faecd9',
          200: '#f4d5a8',
          300: '#ecb96c',
          400: '#e39a3a',
          500: '#d67e1d',
          600: '#be6315',
          700: '#9d4b14',
          800: '#7d3b16',
          900: '#653117',
          950: '#3a1809',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'warm': '0 4px 6px -1px rgba(120, 60, 20, 0.1), 0 2px 4px -1px rgba(120, 60, 20, 0.06)',
        'warm-lg': '0 10px 15px -3px rgba(120, 60, 20, 0.1), 0 4px 6px -2px rgba(120, 60, 20, 0.05)',
      },
    },
  },
  plugins: [],
};
