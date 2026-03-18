import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Design Tokens - Matriz 4 estados (Normal/Alfred × Claro/Escuro) */
        background: 'var(--background)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        main: 'var(--text-main)',
        muted: 'var(--text-muted)',
        brand: 'var(--brand)',
        manor: {
          50: '#f7f7f5',
          100: '#ededea',
          200: '#d8d6d0',
          300: '#c0bdb4',
          400: '#a5a196',
          500: '#8e897c',
          600: '#726d62',
          700: '#5a564d',
          800: '#1a1a1a',
          900: '#0f0f0f',
          950: '#0a0a0a',
        },
        gold: {
          50:  '#fdf9ec',
          100: '#f9f0cc',
          200: '#f2de96',
          300: '#eac85a',
          400: '#e2b42d',
          500: '#b59410',
          600: '#9a750e',
          700: '#7a5710',
          800: '#664614',
          900: '#583b16',
        },
        silver: {
          DEFAULT: '#c0c0c0',
          light: '#e0e0e0',
          dark: '#9a9a9a',
        },
      },
    },
  },
  plugins: [],
};
export default config;
