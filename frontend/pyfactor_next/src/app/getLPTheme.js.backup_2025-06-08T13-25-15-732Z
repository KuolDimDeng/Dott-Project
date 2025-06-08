/**
 * Landing Page Theme Configuration
 * 
 * This file provides color tokens and theme values specifically for the landing page.
 * These values can be used with Tailwind CSS classes.
 */

// Brand colors
export const brand = {
  50: '#F0F7FF',
  100: '#CEE5FD',
  200: '#9CCCFC',
  300: '#55A6F6',
  400: '#0A66C2',
  500: '#0959AA',
  600: '#064079',
  700: '#033363',
  800: '#02294F',
  900: '#021F3B',
};

// Secondary colors
export const secondary = {
  50: '#F9F0FF',
  100: '#E9CEFD',
  200: '#D49CFC',
  300: '#B355F6',
  400: '#750AC2',
  500: '#6709AA',
  600: '#490679',
  700: '#3B0363',
  800: '#2F024F',
  900: '#23023B',
};

// Gray colors
export const gray = {
  50: '#FBFCFE',
  100: '#EAF0F5',
  200: '#D6E2EB',
  300: '#BFCCD9',
  400: '#94A6B8',
  500: '#5B6B7C',
  600: '#4C5967',
  700: '#364049',
  800: '#131B20',
  900: '#090E10',
};

// Green colors
export const green = {
  50: '#F6FEF6',
  100: '#E3FBE3',
  200: '#C7F7C7',
  300: '#A1E8A1',
  400: '#51BC51',
  500: '#1F7A1F',
  600: '#136C13',
  700: '#0A470A',
  800: '#042F04',
  900: '#021D02',
};

// Red colors
export const red = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
};

/**
 * Get theme configuration based on mode (light/dark)
 * This function returns colors and styles for the landing page
 * that can be used with Tailwind CSS classes.
 */
export default function getLPTheme(mode = 'light') {
  // Return object with all theme colors and values for the landing page
  return {
    mode,
    colors: {
      brand,
      secondary,
      gray,
      green,
      red,
      primary: mode === 'dark' ? {
        light: brand[300],
        main: brand[400],
        dark: brand[800],
        contrastText: brand[100],
      } : {
        light: brand[200],
        main: brand[500],
        dark: brand[800],
        contrastText: brand[50],
      },
      background: mode === 'dark' ? {
        default: gray[900],
        paper: gray[800],
      } : {
        default: '#fff',
        paper: gray[50],
      },
      text: mode === 'dark' ? {
        primary: '#fff',
        secondary: gray[400],
      } : {
        primary: gray[800],
        secondary: gray[600],
      },
      divider: mode === 'dark' ? `rgba(${gray[600]}, 0.3)` : `rgba(${gray[300]}, 0.5)`,
      warning: {
        main: '#F7B538',
        dark: '#F79F00',
      },
      error: mode === 'dark' ? {
        light: '#D32F2F',
        main: '#D32F2F',
        dark: '#B22A2A',
      } : {
        light: red[50],
        main: red[500],
        dark: red[700],
      },
      success: mode === 'dark' ? {
        light: green[400],
        main: green[500],
        dark: green[700],
      } : {
        light: green[300],
        main: green[400],
        dark: green[800],
      },
    },
    // These values can be referenced for custom component styles
    // but Tailwind classes should be used directly in components
    typography: {
      fontFamily: '"Inter", "sans-serif"',
      h1: {
        fontSize: '60px',
        fontWeight: 600,
        lineHeight: 1.1,
        letterSpacing: '-0.2px',
      },
      h2: {
        fontSize: '48px',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h3: {
        fontSize: '42px',
        lineHeight: 1.2,
      },
      h4: {
        fontSize: '36px',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h5: {
        fontSize: '20px',
        fontWeight: 600,
      },
      h6: {
        fontSize: '18px',
      },
      body1: {
        fontWeight: 400,
        fontSize: '15px',
      },
      body2: {
        fontWeight: 400,
        fontSize: '14px',
      },
    },
    components: {
      button: {
        borderRadius: '10px',
        primary: {
          bg: brand[500],
          hover: brand[400],
          text: brand[50],
          shadow: `inset 0 1px ${brand[300]}40`,
          border: brand[700],
        },
        outlined: {
          bg: `${brand[300]}10`,
          border: brand[300],
          text: brand[500],
          hover: `${brand[300]}30`,
        },
        text: {
          text: brand[500],
          hover: `${brand[300]}30`,
        },
      },
      card: {
        bg: gray[50],
        border: `${gray[200]}80`,
        radius: '10px',
        hover: {
          border: brand[300],
          shadow: `0 0 24px ${brand[100]}`,
        },
      },
      input: {
        bg: '#fff',
        border: gray[200],
        radius: '10px',
        focus: {
          border: brand[400],
          outline: brand[200],
        },
      },
    },
  };
}