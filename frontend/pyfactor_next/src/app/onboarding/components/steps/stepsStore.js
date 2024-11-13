// src/app/onboarding/components/steps/stepsStore.js
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

const LoadingStep = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

export const StepComponents = {
  Step1: dynamic(() => import('./Step1'), {
    loading: LoadingStep,
    ssr: false
  }),
  Step2: dynamic(() => import('./Step2'), {
    loading: LoadingStep,
    ssr: false
  }),
  Step3: dynamic(() => import('./Step3'), {
    loading: LoadingStep,
    ssr: false
  }),
  Step4: dynamic(() => import('./Step4'), {
    loading: LoadingStep,
    ssr: false
  })
};