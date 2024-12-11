// /src/app/onboarding/components/Step4/Step4.styles.js
import { createTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material';
import { memo } from 'react';

export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

// Main container styles
export const StyledPaper = styled(Box)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
}));

// Grid styles
export const LeftSideGrid = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(4),
  background: 'linear-gradient(to bottom, #f0f9ff, #ffffff)',
}));

export const RightSideGrid = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(4),
  backgroundColor: '#ffffff',
}));

// Image styles
export const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 300,
  height: 300,
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
}));

// Progress styles
export const ProgressContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

export const StyledLinearProgress = styled(Box)(({ theme }) => ({
  height: 12,
  borderRadius: 6,
  marginBottom: theme.spacing(2),
  '& .MuiLinearProgress-bar': {
    transition: 'transform 0.5s ease',
  },
}));

// Indicator styles
export const ProgressIndicatorContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  opacity: (props) => (props.isActive ? 1 : 0.5),
}));

export const IndicatorContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(0.5),
}));

export const IndicatorDot = styled(Box)(({ theme }) => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: (props) =>
    props.isActive ? theme.palette.primary.main : theme.palette.grey[300],
  color: '#fff',
  marginRight: theme.spacing(2),
}));

// Connection status styles
export const ConnectionStatus = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
}));

export const StatusIndicator = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: (props) =>
    props.connected ? theme.palette.success.main : theme.palette.warning.main,
}));

// Memoized components
export const ProgressIndicator = memo(function ProgressIndicator({
  progress,
  step,
  description,
  isActive,
}) {
  return (
    <ProgressIndicatorContainer isActive={isActive}>
      <IndicatorContent>
        <IndicatorDot isActive={isActive}>
          {isActive ? (
            <CircularProgress size={16} thickness={6} sx={{ color: '#fff' }} />
          ) : (
            progress
          )}
        </IndicatorDot>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'text.primary' : 'text.secondary',
          }}
        >
          {step}
        </Typography>
      </IndicatorContent>
      <Typography variant="body2" color="text.secondary" sx={{ pl: 5.5 }}>
        {description}
      </Typography>
    </ProgressIndicatorContainer>
  );
});

export const LoadingState = memo(function LoadingState({ message = 'Preparing setup...' }) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" gap={2}>
      <CircularProgress />
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
});

export const ErrorState = memo(function ErrorState({ error, onRetry }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
        sx={{ maxWidth: 500, width: '100%' }}
      >
        {error?.message || 'Failed to start setup process'}
      </Alert>
    </Box>
  );
});

export const SignInPrompt = memo(function SignInPrompt({ onSignIn }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <Typography>Please sign in to continue setup.</Typography>
      <Button variant="contained" onClick={onSignIn} sx={{ mt: 2 }}>
        Sign In
      </Button>
    </Box>
  );
});
