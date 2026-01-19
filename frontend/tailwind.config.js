// frontend/tailwind.config.js file

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(220, 26%, 8%)',
        foreground: 'hsl(220, 13%, 91%)',
        primary: 'hsl(210, 100%, 63%)',
        secondary: 'hsl(220, 20%, 18%)',
        accent: 'hsl(187, 100%, 50%)',
        border: 'hsl(220, 20%, 28%)',
        muted: 'hsl(220, 15%, 25%)',
      },
    },
  },
  plugins: [],
};