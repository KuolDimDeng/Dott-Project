/**
 * Tailwind CSS Theme Configuration
 * 
 * This file provides color tokens and spacing values to be used with Tailwind.
 * Import and use these values in your Tailwind configuration.
 */

// Color palette for the application
export const colors = {
  primary: {
    50: '#e8eff8',
    100: '#c5d9ec',
    200: '#9ebfdf',
    300: '#76a5d2',
    400: '#598fc8',
    500: '#0a3977',
    600: '#041e42',
    700: '#031835',
    800: '#02111f',
    900: '#010a11',
  },
  secondary: {
    50: '#f5e6fb',
    100: '#e4bff5',
    200: '#d295ef',
    300: '#c06be8',
    400: '#b34ae3',
    500: '#9c27b0',
    600: '#7b1fa2',
    700: '#6a1b8c',
    800: '#4a1361',
    900: '#2c0b3a',
  },
  error: {
    50: '#fde9e9',
    100: '#fac9c7',
    200: '#f6a6a3',
    300: '#f2827f',
    400: '#ef5350',
    500: '#d32f2f',
    600: '#c62828',
    700: '#b71c1c',
    800: '#891616',
    900: '#5c0f0f',
  },
  warning: {
    50: '#fff8e6',
    100: '#ffedbf',
    200: '#ffe299',
    300: '#ffd666',
    400: '#ffc933',
    500: '#ed6c02',
    600: '#e65100',
    700: '#bf4800',
    800: '#993a00',
    900: '#662700',
  },
  info: {
    50: '#e4f3fa',
    100: '#bee2f4',
    200: '#93d0ed',
    300: '#67bde6',
    400: '#03a9f4',
    500: '#0288d1',
    600: '#01579b',
    700: '#014580',
    800: '#013359',
    900: '#00223c',
  },
  success: {
    50: '#e6f5e6',
    100: '#c1e5c1',
    200: '#98d499',
    300: '#6ec470',
    400: '#4caf50',
    500: '#2e7d32',
    600: '#1b5e20',
    700: '#174d1b',
    800: '#103214',
    900: '#09200c',
  },
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  text: {
    primary: '#000000',
    secondary: '#0a3977',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  background: {
    default: '#ffffff',
    paper: '#ffffff',
  },
  divider: 'rgba(0, 0, 0, 0.12)',
};

// Typography settings
export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    heading: ['"Poppins"', 'sans-serif'].join(','),
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '2rem',      // 32px
    '4xl': '2.5rem',    // 40px
    '5xl': '3rem',      // 48px
    '6xl': '3.5rem',    // 56px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    none: 1,
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0',
    wide: '0.00938em',
    wider: '0.01071em',
    widest: '0.02857em',
    overline: '0.08333em',
  },
};

// Spacing and shape settings
export const shape = {
  borderRadius: {
    none: '0',
    sm: '0.125rem',    // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.5rem',      // 8px
    lg: '0.75rem',     // 12px
    xl: '1rem',        // 16px
    '2xl': '1.5rem',   // 24px
    full: '9999px',
  },
  boxShadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    button: '0 2px 8px rgba(0,0,0,0.15)',
    card: '0 2px 12px rgba(0,0,0,0.08)',
  },
};

export default {
  colors,
  typography,
  shape,
};