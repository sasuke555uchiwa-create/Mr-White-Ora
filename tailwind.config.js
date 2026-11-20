/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-short': 'bounceShort 0.5s ease-in-out',
        'scale-up': 'scaleUp 0.3s ease-out',
        'flip-in': 'flipIn 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceShort: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scaleUp: {
          '0%': { transform: 'translate(-50%, 50%) scale(0)' },
          '100%': { transform: 'translate(-50%, 0) scale(1)' },
        },
        flipIn: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0)', opacity: '1' },
        }
      },
    },
  },
  plugins: [
    function({ addVariant }) {
        addVariant('fallback-icon', '&.fallback-icon > div:last-child');
    }
  ],
}
