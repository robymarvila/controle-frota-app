/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Substitui o antigo tema Violeta pelo Verde da Alpitel Energy
        violet: colors.emerald,
        // Substitui os tons escuros pelo Azul Marinho da Alpitel Energy
        slate: {
          ...colors.slate,
          800: '#041d3b',
          900: '#021024',
        }
      }
    },
  },
  plugins: [],
}
