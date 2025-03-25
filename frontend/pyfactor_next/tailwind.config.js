/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#0a3977',
          light: '#1a5bc0',
          dark: '#041e42',
        },
      },
    },
  },
  plugins: [],
  // This ensures Tailwind works properly with MUI
  corePlugins: {
    preflight: false,
  },
}