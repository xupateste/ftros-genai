/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js,jsx,css}"
  ],
  theme: {
    extend: {
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
        "loop-scroll": "120s linear 0s infinite normal none running loop-scroll"
      }
    },
  },
  plugins: [],
}
