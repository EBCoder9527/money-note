import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      colors: {
        ledger: {
          ink: '#172033',
          muted: '#6b7280',
          line: '#e5e7eb',
          paper: '#f8fafc',
          income: '#0f9f6e',
          expense: '#d64545',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
