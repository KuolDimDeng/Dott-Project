// src/app/onboarding/components/Step1/Step1.styles.js
import { createTheme, styled } from '@mui/material/styles';
import { Box } from '@mui/material';

// Theme configuration
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  typography: {
    h5: { fontWeight: 600 },
    h6: { fontWeight: 500 },
    // Add common text styles
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    button: { textTransform: 'none' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 42
        },
      },
    },
    // Add TextField customization
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true
      }
    }
  },
});

// Common styles that can be reused
const commonFlexStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const commonSpacing = {
  gap: theme.spacing(3),
  padding: theme.spacing(3)
};

// Export styled components
export const StyledComponents = {
  FormContainer: styled(Box)(({ theme }) => ({
    ...commonFlexStyles,
    ...commonSpacing,
    marginTop: theme.spacing(8),
    marginBottom: theme.spacing(8),
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
      marginTop: theme.spacing(4),
    },
  })),

  SideContent: styled(Box)(({ theme }) => ({
    ...commonFlexStyles,
    backgroundColor: theme.palette.primary.light,
    padding: theme.spacing(4),
    height: '100vh',
    overflow: 'hidden',
    gap: theme.spacing(4),
    [theme.breakpoints.down('md')]: {
      height: 'auto',
      minHeight: '50vh',
    },
  })),

  FeatureList: styled('ul')(({ theme }) => ({
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    width: '100%',
    color: theme.palette.text.primary,
    '& li': {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(2),
      fontSize: '1rem',
      lineHeight: 1.5,
      '&:last-child': {
        marginBottom: 0,
      },
      '& svg': {
        color: theme.palette.primary.main,
        fontSize: '1.25rem',
      },
      '& strong': {
        fontWeight: 600
      }
    },
  })),

  FormSection: styled(Box)(({ theme }) => ({
    width: '100%',
    marginBottom: theme.spacing(4),
  })),

  FormActions: styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(2),
    marginTop: theme.spacing(4),
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
      '& > button': {
        width: '100%',
      },
    },
  }))
};

export const IMAGE_CONFIG = {
  logo: {
    width: 150,
    height: 50,
    path: '/static/images/Pyfactor.png',
    alt: 'Pyfactor Logo',
    priority: true
  },
  sideImage: {
    width: '80%',
    height: '50%',
    path: '/static/images/Being-Productive-3--Streamline-Brooklyn.png',
    alt: 'Productive workspace illustration',
    priority: true
  },
};

// Development PropTypes
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  Object.values(StyledComponents).forEach(Component => {
    Component.propTypes = {
      children: PropTypes.node,
      className: PropTypes.string,
      theme: PropTypes.object,
    };
  });
}

// Type checking for styled components
Object.values(StyledComponents).forEach(Component => {
  Component.displayName = `Styled${Component.toString().split('(')[0]}`;
});