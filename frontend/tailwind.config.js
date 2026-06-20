/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark "screener" palette inspired by the reference dashboards.
        panel: '#13161c',
        'panel-2': '#1b1f27',
        line: '#2a2f3a',
      },
    },
  },
  plugins: [],
};
