// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Subscription/Subscription.styles.js
import { createTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    }
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

export const BillingToggle = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 30,
  padding: 3,
  position: 'relative',
  cursor: 'pointer',
  marginBottom: theme.spacing(4),
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',

  '& .MuiBillingToggle-option': {
    padding: '8px 20px',
    borderRadius: 28,
    position: 'relative',
    zIndex: 1,
    transition: theme.transitions.create(['color', 'background-color'], {
      duration: 200,
    }),
    color: theme.palette.text.primary,
    fontWeight: 500,
    userSelect: 'none',

    '&:hover:not(.active)': {
      backgroundColor: 'rgba(0,0,0,0.04)',
    },

    '&.active': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      boxShadow: '0 2px 4px rgba(25,118,210,0.25)',
    },
  },
}));

export const tiers = [
    {
      title: 'Basic',
      type: 'free', // Add type
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
    },
    {
      title: 'Professional',
      type: 'professional', // Add type
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
    },
  ];