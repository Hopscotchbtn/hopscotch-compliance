/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hop-freshair': '#b1c8f6',
        'hop-marmalade': '#fd884a',
        'hop-forest': '#1f4435',
        'hop-sunshine': '#fbee57',
        'hop-pebble': '#f2eeed',
        'hop-smiles': '#fae1e9',
        'hop-apple': '#6d9f6b',
        'hop-forest-dark': '#0f261c',
        'hop-marmalade-dark': '#fa541f',
        'hop-freshair-dark': '#799bed',
      },
      fontFamily: {
        'display': ['Georgia', 'Times New Roman', 'serif'],
        'body': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
