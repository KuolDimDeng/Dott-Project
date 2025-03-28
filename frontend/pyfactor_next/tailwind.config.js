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
        secondary: {
          main: '#6b46c1', // purple-600 equivalent 
          light: '#805ad5', // purple-500 equivalent
          dark: '#553c9a', // purple-700 equivalent
        },
        error: {
          main: '#dc2626', // red-600 equivalent
          light: '#ef4444', // red-500 equivalent
          dark: '#b91c1c', // red-700 equivalent
        },
        warning: {
          main: '#d97706', // amber-600 equivalent
          light: '#f59e0b', // amber-500 equivalent
          dark: '#b45309', // amber-700 equivalent
        },
        info: {
          main: '#2563eb', // blue-600 equivalent
          light: '#3b82f6', // blue-500 equivalent
          dark: '#1d4ed8', // blue-700 equivalent
        },
        success: {
          main: '#16a34a', // green-600 equivalent
          light: '#22c55e', // green-500 equivalent
          dark: '#15803d', // green-700 equivalent
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',    
        DEFAULT: '0.25rem',  
        'md': '0.375rem',    
        'lg': '0.5rem',      
        'xl': '0.75rem',     
        '2xl': '1rem',       
        '3xl': '1.5rem',     
        'full': '9999px',    
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': 'none',
      },
    },
  },
  plugins: [
    // Comment out the forms plugin temporarily until it's installed
    // require('@tailwindcss/forms'),
  ],
  // Only disable preflight if you're experiencing conflicts with MUI during transition
  // Once fully migrated to Tailwind, you can remove this
  corePlugins: {
    preflight: true,
  },
}