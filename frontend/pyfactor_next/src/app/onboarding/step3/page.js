// src/app/onboarding/step3/page.js
'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';
import { AppErrorBoundary } from '@/components/ErrorBoundary';

// Loading component
const LoadingStep = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

// Error component
const ErrorComponent = ({ error, resetError }) => (
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
        <Button color="inherit" size="small" onClick={resetError}>
          Retry
        </Button>
      }
    >
      {error?.message || 'An error occurred'}
    </Alert>
  </Box>
);

// Dynamic import with loading state
const Step3 = dynamic(
  () => import('../components/steps/Step3'),
  {
    loading: LoadingStep,
    ssr: false
  }
);

// Page component with error boundary
export default function Step3Page() {
  return (
    <AppErrorBoundary FallbackComponent={ErrorComponent}>
      <Step3 />
    </AppErrorBoundary>
  );
}