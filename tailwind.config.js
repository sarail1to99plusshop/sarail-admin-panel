/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adminBg: '#f8fafc',
        adminCard: '#ffffff',
        adminBorder: '#e2e8f0',
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        accentEmerald: '#10b981',
        accentAmber: '#f59e0b',
        accentRose: '#f43f5e',
        accentCyan: '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
