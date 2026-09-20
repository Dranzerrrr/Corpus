/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./entrypoints/**/*.{html,ts,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F6F3EC',
        canvas: '#FFFFFF',
        ink: '#1A1A22',
        slate: '#6E6E76',
        focus: {
          start: '#5750E0',
          end: '#8B5CF6',
        },
        amber: {
          tag: '#F5C64C',
          status: '#E2A03F',
        },
        tag: {
          amber: '#F5C64C',
          violet: '#8B7CF6',
          teal: '#4FB0A5',
          coral: '#E8785A',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(26, 26, 34, 0.06), 0 2px 6px -1px rgba(26, 26, 34, 0.04)',
        'lift': '0 10px 25px -4px rgba(26, 26, 34, 0.08), 0 4px 10px -2px rgba(26, 26, 34, 0.04)',
      }
    },
  },
  plugins: [],
}
