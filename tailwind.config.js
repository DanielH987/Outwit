/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm wooden-tabletop palette. `primary`, `surface`, and `accent`
        // keep their old names so existing classes pick up the new theme.
        primary: '#1C1310', // dark espresso — app background
        surface: '#2A1F1B', // warm walnut — panels/cards/modals
        accent: '#D97706', // warm amber / brass
        'accent-hover': '#B45309',
        'wood-edge': '#4A3B32', // container borders/outlines
        parchment: '#F5EBE6', // primary text (warm off-white)
        taupe: '#A89587', // secondary/muted text
        'board-frame': '#3D2B1F', // dark oak board frame
        'board-light': '#D4B896', // maple / birch square
        'board-dark': '#A07855', // classic oak square
        'base-white': '#E0A96D', // P1 base tile (golden amber)
        'base-black': '#7C3A27', // P2 base tile (deep rust)
        'chip-white': '#F4E2D0', // P1 chip (polished boxwood)
        'chip-black': '#4A150B', // P2 chip (dark mahogany)
        danger: '#C2410C', // warm rust for destructive actions (resign, errors)
        success: '#6BA368', // muted moss for connected indicators
      },
    },
  },
  plugins: [],
};
