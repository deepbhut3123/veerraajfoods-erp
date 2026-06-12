/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      width: {
        '90': '90%',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

