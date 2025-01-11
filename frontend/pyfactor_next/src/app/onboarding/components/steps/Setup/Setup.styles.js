// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Setup/Setup.styles.js
import { styled } from '@mui/material/styles';
import { Box, LinearProgress } from '@mui/material';

export const SetupContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(4),
  backgroundColor: theme.palette.background.default,
}));

export const ProgressContainer = styled(Box)(({ theme, tier }) => ({
  width: '100%',
  maxWidth: 400,
  textAlign: 'center',
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
  // Add tier-specific styling
  ...(tier === 'professional' && {
    maxWidth: 500,
    // Add any professional-specific styles
  })
}));

export const ProgressIndicator = styled(LinearProgress)(({ theme, tier }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.palette.grey[200],
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    // Add tier-specific colors
    backgroundColor: tier === 'professional' 
      ? theme.palette.primary.main 
      : theme.palette.secondary.main
  },
}));

export const SlideShowContainer = styled(Box)(({ theme, tier }) => ({
  width: '100%',
  maxWidth: tier === 'professional' ? 800 : 600, // Larger for professional
  height: tier === 'professional' ? 400 : 300, // Taller for professional
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[tier === 'professional' ? 2 : 1], // Deeper shadow for professional
  margin: theme.spacing(4, 0),
}));

export const SlideImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  position: 'absolute',
  top: 0,
  left: 0,
  opacity: 0,
  transition: 'opacity 0.5s ease-in-out',
  '&.active': {
    opacity: 1,
  },
});