// src/app/onboarding/store/sharedStore.js
import { Box, CircularProgress } from '@mui/material';

export const LoadingStep = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

export const ONBOARDING_STEPS = {
  INITIAL: 'step1',
  PLAN: 'step2',
  PAYMENT: 'step3',
  SETUP: 'step4',
  COMPLETE: 'complete',
};
