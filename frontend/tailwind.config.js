/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FFF8F0',
          100: '#FFF5E6',
          200: '#FFE8CC',
          300: '#FFD6A5',
          400: '#FFB347',
          500: '#FF9F43',
          600: '#FF8C00',
          700: '#E67A00',
          800: '#CC6A00',
          900: '#995000',
        },
        adhd: {
          bg: '#FFF8F0',
          card: '#FFFFFF',
          accent: '#FF9F43',
          text: '#2D2D2D',
          muted: '#8C8C8C',
          border: '#FFE8CC',
          success: '#4CAF50',
          warning: '#FF9800',
          danger: '#F44336',
          info: '#2196F3',
        },
      },
      fontFamily: {
        hand: ['"ZCOOL KuaiLe"', 'cursive', 'sans-serif'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'hand': '12px 8px 16px 10px',
      },
      maxWidth: {
        'app': '430px',
      },
      boxShadow: {
        'hand': '3px 3px 0px rgba(0,0,0,0.08)',
        'hand-lg': '5px 5px 0px rgba(0,0,0,0.08)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
      },
    },
  },
  plugins: [],
}
