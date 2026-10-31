/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adminNavy: '#0D192C',
        adminNavSurface: '#172B46',
        adminCanvas: '#F4F7FB',
        adminCard: '#FFFFFF',
        adminPrimary: '#2563EB',
        adminPrimaryHover: '#1D4ED8',
        adminDanger: '#DC3545',
        adminBorder: '#E2E8F0',
        adminText: '#0F172A',
        adminMuted: '#64748B',
        // Retain legacy aliases for backwards compatibility
        adminBg: '#F4F7FB',
        primary: '#2563EB',
        primaryHover: '#1D4ED8',
        accentEmerald: '#10B981',
        accentAmber: '#F59E0B',
        accentRose: '#DC3545',
        accentCyan: '#06B6D4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
