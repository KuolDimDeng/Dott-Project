// src/app/onboarding/step1/page.js
'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

const LoadingStep = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
    <CircularProgress />
  </Box>
);

// Use the correct import path
const Step1 = dynamic(
  () => import('../components/steps/Step1'),
  {
    loading: LoadingStep,
    ssr: false
  }
);

export default function Step1Page() {
  return <Step1 />;
}