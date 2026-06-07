/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFBF9',
          100: '#FAF6F1',
          200: '#F3ECE4',
          300: '#E8DDD2',
          400: '#D9CCBC',
        },
        rosa: {
          50: '#FAF1F1',
          100: '#F2E1E1',
          200: '#E8CDCD',
          300: '#D4A5A5',
          400: '#C48B8B',
          500: '#B37474',
          600: '#9E5F5F',
        },
        sage: {
          50: '#F2F5F0',
          100: '#E0E9DC',
          200: '#CFDBCA',
          300: '#A8BFA0',
          400: '#8AA880',
          500: '#6F8F66',
        },
        dusty: {
          50: '#F0F3F6',
          100: '#D5DEE5',
          200: '#C0CED9',
          300: '#9FB5C4',
          400: '#7A9AB0',
        },
        lilac: {
          50: '#F4F1F7',
          100: '#E3DDF0',
          200: '#D5CDE4',
          300: '#B8A9CA',
          400: '#9A88B5',
        },
        caramel: {
          50: '#F7F2EB',
          100: '#ECE1D3',
          200: '#E0D2BC',
          300: '#C9A87C',
          400: '#B08F60',
        },
        choco: {
          50: '#F5F0EC',
          100: '#E6DDD4',
          200: '#C4B5A5',
          300: '#A69485',
          400: '#8B7A6B',
          500: '#7D6B5D',
          600: '#655549',
          700: '#4D4038',
        },
      },
      fontFamily: {
        hand: ['"LXGW WenKai"', 'cursive', 'sans-serif'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        'app': '430px',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'jelly': 'jelly 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-6px) rotate(2deg)' },
          '66%': { transform: 'translateY(-3px) rotate(-1deg)' },
        },
        jelly: {
          '0%': { transform: 'scale(0.7)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
