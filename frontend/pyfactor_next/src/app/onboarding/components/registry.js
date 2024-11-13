// src/app/onboarding/components/registry.js
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

const LoadingStep = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

export const StepRegistry = {
  Step1: dynamic(() => import('./steps/Step1'), {
    loading: LoadingStep,
    ssr: false
  }),
  Step2: dynamic(() => import('./steps/Step2'), {
    loading: LoadingStep,
    ssr: false
  }),
  Step3: dynamic(() => import('./steps/Step3'), {
    loading: LoadingStep,
    ssr: false
  }),
  Step4: dynamic(() => import('./steps/Step4'), {
    loading: LoadingStep,
    ssr: false
  })
};