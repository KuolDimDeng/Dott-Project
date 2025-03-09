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
    },
    tier: {
      free: '#4caf50',
      professional: '#1976d2',
      enterprise: '#673ab7'  // Added enterprise color
    }
  },
  shape: {
    borderRadius: 8,
  }
});

export const PaymentContainer = styled(Box)(({ theme, tier }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(3),
  backgroundColor: tier === 'professional' ? 
    theme.palette.background.default : 
    tier === 'enterprise' ?
    theme.palette.background.default :
    theme.palette.background.paper
}));

export const LogoContainer = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  width: '100%',
}));

export const PaymentDetails = styled(Box)(({ theme, tier }) => ({
  width: '100%',
  marginBottom: theme.spacing(4),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: tier === 'professional' || tier === 'enterprise' ? 
    theme.shadows[2] : 
    theme.shadows[1]
}));

export const PaymentSummary = styled(Box)(({ theme, tier }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  ...(tier === 'enterprise' && {
    borderTop: '4px solid',
    borderTopColor: theme.palette.tier.enterprise,
  }),
  '& ul': {
    paddingLeft: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  '& li': {
    marginBottom: theme.spacing(0.5),
    color: theme.palette.text.secondary
  }
}));

export const PricingBox = styled(Box)(({ theme, tier }) => ({
  backgroundColor: tier === 'professional' ? 
    theme.palette.tier.professional : 
    tier === 'enterprise' ?
    theme.palette.tier.enterprise :
    theme.palette.background.paper,
  color: (tier === 'professional' || tier === 'enterprise') ? 
    theme.palette.primary.contrastText : 
    theme.palette.text.primary,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  textAlign: 'center',
  marginBottom: theme.spacing(3)
}));