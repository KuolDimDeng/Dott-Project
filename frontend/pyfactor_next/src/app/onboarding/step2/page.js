// src/app/onboarding/step2/page.js
'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

const LoadingStep = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

const Step2 = dynamic(
  () => import('../components/steps/Step2'),
  {
    loading: LoadingStep,
    ssr: false
  }
);

export default function Step2Page() {
  return <Step2 />;
}