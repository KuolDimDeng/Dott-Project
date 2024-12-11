'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#ffffff', // Changed from #f5f5f5 to pure white
      paper: '#ffffff', // Keeping paper white as well
    },
    // Keeping the primary colors for buttons and other elements
    primary: {
      main: '#1976d2',
      secondary: '#0d47a1',
    },
    // Adding specific overrides to ensure white backgrounds
    common: {
      white: '#ffffff',
      background: '#ffffff',
    },
  },
  components: {
    // Button styling remains the same
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          textTransform: 'none',
        },
      },
    },
    // Adding overrides for other components to ensure white backgrounds
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000', // Ensuring text is visible on white background
        },
      },
    },
  },
  // Adding custom transitions to remove any background color animations
  transitions: {
    create: (props) => {
      if (Array.isArray(props) && props.includes('background-color')) {
        return 'none'; // Disable background color transitions
      }
      return createTheme().transitions.create(props);
    },
  },
});

export default theme;
