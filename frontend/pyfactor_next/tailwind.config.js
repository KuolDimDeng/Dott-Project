/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/app/**/*.{js,jsx,ts,tsx}',
    // Exclude commonly changing files that don't need Tailwind classes
    '!./src/**/*.test.{js,jsx,ts,tsx}',
    '!./src/**/*.stories.{js,jsx,ts,tsx}',
    '!./node_modules/**',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: 'var(--primary-light)',
          DEFAULT: 'var(--primary-main)',
          dark: 'var(--primary-dark)',
          main: 'var(--primary-main)',
        },
        secondary: {
          main: '#6b46c1', // purple-600 equivalent 
          light: '#805ad5', // purple-500 equivalent
          dark: '#553c9a', // purple-700 equivalent
        },
        error: {
          main: 'var(--error-main)',
          light: '#ef4444', // red-500 equivalent
          dark: '#b91c1c', // red-700 equivalent
        },
        warning: {
          main: 'var(--warning-main)',
          light: '#f59e0b', // amber-500 equivalent
          dark: '#b45309', // amber-700 equivalent
        },
        info: {
          main: 'var(--info-main)',
          light: '#3b82f6', // blue-500 equivalent
          dark: '#1d4ed8', // blue-700 equivalent
        },
        success: {
          main: 'var(--success-main)',
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
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideInRight': 'slideInRight 0.4s ease-in-out',
        'slideOutRight': 'slideOutRight 0.4s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          'Oxygen', 
          'Ubuntu', 
          'Cantarell', 
          '"Open Sans"', 
          '"Helvetica Neue"', 
          'sans-serif'
        ],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwind-scrollbar')({
      nocompatible: true,
      preferredStrategy: 'standard',
    }),
  ],
  // Enable preflight for consistent base styles
  corePlugins: {
    preflight: true,
  },
}