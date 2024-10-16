// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/success/page.js

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../contexts/onboardingContext';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useSession } from "next-auth/react";


const OnboardingSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { saveStep4Data } = useOnboarding();
  const { data: session } = useSession();



  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      // Payment was successful, redirect to step4
      router.push('/onboarding/step4');
    }
  }, [router]);


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography variant="h6" style={{ marginLeft: '1rem' }}>
          Completing your subscription...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return null;
};

export default OnboardingSuccess;