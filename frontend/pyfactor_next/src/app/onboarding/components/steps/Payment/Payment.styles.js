import { styled } from '@mui/material/styles';
import { Box, Paper } from '@mui/material';

// Enhanced modern styling
export const PaymentContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(3),
  width: '100%'
}));

export const LogoContainer = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(4),
  width: '100%',
}));

export const PaymentDetails = styled(Paper)(({ theme, tier }) => ({
  width: '100%',
  marginBottom: theme.spacing(4),
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
}));

export const PaymentSummary = styled(Box)(({ theme, tier }) => ({
  padding: theme.spacing(4),
  backgroundColor: theme.palette.background.paper,
  position: 'relative',
  
  // Conditional styling based on subscription tier
  ...(tier === 'professional' && {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
    },
  }),
  
  ...(tier === 'enterprise' && {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'linear-gradient(90deg, #673ab7 0%, #9575cd 100%)',
    },
  }),
  
  '& ul': {
    paddingLeft: theme.spacing(2),
    marginBottom: theme.spacing(2),
    listStyleType: 'none',
  },
  '& li': {
    marginBottom: theme.spacing(1.2),
    position: 'relative',
    paddingLeft: theme.spacing(3),
    color: theme.palette.text.secondary,
    '&::before': {
      content: '"✓"',
      position: 'absolute',
      left: 0,
      color: theme.palette.success.main,
      fontWeight: 'bold',
    }
  }
}));

export const PaymentMethodPaper = styled(Paper)(({ theme, selected }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2.5),
  border: selected ? '2px solid' : '1px solid',
  borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
  borderRadius: 12,
  transition: 'all 0.2s ease-in-out',
  boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
  '&:hover': {
    borderColor: selected ? theme.palette.primary.main : theme.palette.primary.light,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  }
}));

export const CardDetailsSection = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(3),
  backgroundColor: '#fafafa',
  border: '1px solid #e0e0e0',
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
  }
}));

export const CardField = styled(Box)(({ theme }) => ({
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  padding: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(2),
  transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.light,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  }
}));

export const PricingSummary = styled(Box)(({ theme }) => ({
  backgroundColor: '#f0f7ff',
  borderRadius: 12,
  padding: theme.spacing(3),
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(3),
  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
}));

export const PaymentActionButton = styled(Box)(({ theme }) => ({
  width: '100%',
  textAlign: 'center',
  marginBottom: theme.spacing(2),
}));