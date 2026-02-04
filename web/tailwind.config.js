/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors matching the Google Sheets conditional formatting
        score: {
          green: '#d9ead3',
          yellow: '#fff2cc',
          red: '#f4cccc',
          blue: '#cfe2f3',
          grey: '#f3f3f3',
        },
        text: {
          green: '#38761d',
          red: '#e06666',
        }
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
