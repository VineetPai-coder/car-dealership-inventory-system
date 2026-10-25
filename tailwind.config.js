/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — automotive theme
        'dealer-dark':    '#0f1923',
        'dealer-slate':   '#1c2b3a',
        'dealer-blue':    '#1e40af',
        'dealer-accent':  '#3b82f6',
        'dealer-gold':    '#f59e0b',
        'dealer-muted':   '#64748b',
        'dealer-surface': '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
