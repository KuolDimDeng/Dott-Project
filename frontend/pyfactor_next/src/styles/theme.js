// theme.js
'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
      mode: 'light',
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      // Add this if you want to change the primary color of all buttons
      primary: {
        main: '#1976d2', // You can change this to your preferred color
        secondary: '#0d47a1', // You can change this to your preferred color
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '20px',
            textTransform: 'none',
          },
        },
      },
    },
  });

export default theme;