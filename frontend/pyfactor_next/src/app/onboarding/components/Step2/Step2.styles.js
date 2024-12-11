// /src/app/onboarding/components/Step2/Step2.styles.js
import { createTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

// Define custom theme values that we'll use throughout the component
const themeValues = {
  colors: {
    primary: '#1976d2',
    background: '#f5f5f5',
    paper: '#ffffff',
    divider: 'rgba(0, 0, 0, 0.12)',
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  spacing: {
    cardPadding: 32,
    togglePadding: {
      x: 20,
      y: 8,
    },
    borderRadius: {
      card: 16,
      toggle: 30,
    },
  },
  transitions: {
    duration: 200,
  },
};

// Create the theme with extended configuration
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: themeValues.colors.primary,
      contrastText: themeValues.colors.paper,
    },
    background: {
      default: themeValues.colors.background,
      paper: themeValues.colors.paper,
    },
    text: {
      primary: themeValues.colors.text.primary,
      secondary: themeValues.colors.text.secondary,
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    subtitle1: {
      lineHeight: 1.6,
    },
  },
});

// Enhanced BillingToggle with more robust styling
export const BillingToggle = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: themeValues.spacing.borderRadius.toggle,
  padding: 3,
  position: 'relative',
  cursor: 'pointer',
  marginBottom: theme.spacing(4),
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',

  '& .MuiBillingToggle-option': {
    padding: `${themeValues.spacing.togglePadding.y}px ${themeValues.spacing.togglePadding.x}px`,
    borderRadius: themeValues.spacing.borderRadius.toggle - 2,
    position: 'relative',
    zIndex: 1,
    transition: theme.transitions.create(['color', 'background-color'], {
      duration: themeValues.transitions.duration,
      easing: theme.transitions.easing.easeInOut,
    }),
    color: theme.palette.text.primary,
    fontWeight: 500,
    userSelect: 'none',

    '&:hover:not(.active)': {
      backgroundColor: 'rgba(0,0,0,0.04)',
    },

    '&:active': {
      transform: 'scale(0.98)',
    },
  },

  '& .MuiBillingToggle-option.active': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: '0 2px 4px rgba(25,118,210,0.25)',
  },
}));

// Enhanced pricing tiers with more detailed configuration
export const tiers = [
  {
    title: 'Basic',
    price: {
      monthly: '0',
      annual: '0',
    },
    description: [
      '1 user included',
      'Track income and expenses',
      '2 GB of storage',
      'Basic reporting',
      'Email support',
    ],
    buttonText: 'Get started for free',
    buttonVariant: 'outlined',
    featured: false,
  },
  {
    title: 'Professional',
    subheader: 'Recommended',
    price: {
      monthly: '15',
      annual: '150',
    },
    description: [
      'Unlimited users',
      'Payroll processing',
      '20 GB of storage',
      'Advanced analytics',
      'Priority support',
      'Custom reporting',
      'API access',
    ],
    buttonText: 'Start Professional',
    buttonVariant: 'contained',
    featured: true,
  },
];

// Add helper functions for pricing calculations if needed
export const calculateAnnualSavings = (monthlyPrice, annualPrice) => {
  const monthlyCost = parseFloat(monthlyPrice);
  const annualCost = parseFloat(annualPrice);
  return (monthlyCost * 12 - annualCost).toFixed(2);
};

// Add theme overrides for specific components if needed
export const componentOverrides = {
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: themeValues.spacing.borderRadius.card,
        transition: `box-shadow ${themeValues.transitions.duration}ms ease-in-out`,
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
      },
    },
  },
};
