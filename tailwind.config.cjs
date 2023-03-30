/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['GT America Regular', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        '3xl': ['2rem', '2.75rem'],
        '4xl': ['2.5rem', '3.2rem']
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
