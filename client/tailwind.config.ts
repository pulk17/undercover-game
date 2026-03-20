import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        background: '#08090d',
        surface: '#12141c',
        'surface-low': '#1a1b20',
        'surface-high': '#292a2e',
        // Role / state colors
        amber: '#e8c547',
        'amber-light': '#ffe285',
        teal: '#3ecfb0',
        red: '#e84b4b',
        purple: '#9b6fe8',
        // Text
        text: '#e3e2e8',
        muted: '#8c8a85',
        muted2: '#4a5068',
        // Legacy aliases (keep for any remaining references)
        accent: '#e8c547',
        civilian: '#3ecfb0',
        undercover: '#e84b4b',
        mrwhite: '#9b6fe8',
        detective: '#e8c547',
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        btn: '12px',
      },
      boxShadow: {
        'inset-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
        'inset-glow-focus': 'inset 0 1px 0 rgba(255,255,255,0.12)',
        float: '0 24px 48px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
