/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
      colors: {
        floor: {
          bg:      '#0f0f1a',
          surface: '#1a1a2e',
          accent:  '#e94560',
          gold:    '#f5a623',
          text:    '#e8e8f0',
        },
      },
    },
  },
  plugins: [],
};
