/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js,jsx,css}"
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      colors: {
        'primary1': '#560bad',
        'primary2': '#7209b7',
        'secondary1': '#b5179e',
        'secondary2': '#f72585',
        'background': '#470891',
      }, 
      fontFamily: {
        default: ['Poppins', 'sans-serif'],
      },
      animation: {
        "loop-scroll": "120s linear 0s infinite normal none running loop-scroll",
        'fade-in-fast': 'fadeIn 0.5s ease-out forwards', // Adjust duration (0.5s) as needed for "fast"
      }
    },
  },
  plugins: [],
}
