/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a0f',
          light: '#14141f',
          lighter: '#1e1e2e',
        },
        accent: {
          DEFAULT: '#1db954',
          hover: '#1ed760',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
