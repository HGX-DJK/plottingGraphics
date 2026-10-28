/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#0a0f1d',
          card: '#111827',
          panel: '#151d30',
          border: '#1f2d48',
          accent: '#3b82f6',
          highlight: '#06b6d4',
          warning: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981'
        }
      }
    },
  },
  plugins: [],
}
