export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    'bg-facil', 'hover:bg-facil-dark', 'bg-facil-dark', 'bg-facil-50', 'bg-facil-100',
    'text-facil', 'text-facil-dark', 'text-facil-light',
    'border-facil', 'ring-facil-100', 'focus:border-facil',
  ],
  theme: {
    extend: {
      colors: {
        facil: {
          DEFAULT: '#1177FF',
          dark: '#002E74',
          light: '#9AC9FF',
          50: '#EEF5FF',
          100: '#D5E7FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: []
}
