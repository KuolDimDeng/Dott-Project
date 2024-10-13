'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Container, LinearProgress } from '@mui/material';
import Image from 'next/image';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useOnboarding } from '../contexts/onboardingContext';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

const images = [
  '/static/images/Be-Patient-2--Streamline-Brooklyn.png',
  '/static/images/Be-Patient-3--Streamline-Brooklyn.png',
  '/static/images/Waiting-3--Streamline-Brooklyn.png',
  '/static/images/Waiting-2--Streamline-Brooklyn.png',
  '/static/images/Fishing-1--Streamline-Brooklyn.png',
];

const OnboardingStep4 = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const progressRef = useRef(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();
  const { onboardingStatus, setOnboardingStatus, saveStep4Data } = useOnboarding();

  const checkStatus = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/onboarding/status/');
      console.log('Status response:', response.data);
      if (response.data.onboarding_status === 'complete') {
        setOnboardingStatus('complete');
      } else if (progressRef.current < 90) {
        progressRef.current = Math.min(progressRef.current + 10, 90);
        setDisplayProgress(progressRef.current);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }, [setOnboardingStatus]);

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    const statusInterval = setInterval(checkStatus, 5000);

    const forceCompleteTimeout = setTimeout(() => {
      completeOnboarding();
    }, 60000);

    return () => {
      clearInterval(imageInterval);
      clearInterval(statusInterval);
      clearTimeout(forceCompleteTimeout);
    };
  }, [checkStatus]);

  const completeOnboarding = useCallback(async () => {
    if (!isComplete) {
      try {
        console.log('Completing onboarding...');
        await saveStep4Data({});
        setOnboardingStatus('complete');
        setIsComplete(true);
        progressRef.current = 100;
        setDisplayProgress(100);
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }
  }, [isComplete, saveStep4Data, setOnboardingStatus]);

  useEffect(() => {
    if (displayProgress >= 90 && !isComplete) {
      completeOnboarding();
    }
  }, [displayProgress, isComplete, completeOnboarding]);

  useEffect(() => {
    if (onboardingStatus === 'complete' && isComplete) {
      const redirectTimer = setTimeout(() => router.push('/dashboard'), 2000);
      return () => clearTimeout(redirectTimer);
    }
  }, [onboardingStatus, isComplete, router]);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Image src="/static/images/Pyfactor.png" alt="Pyfactor Logo" width={150} height={50} priority />
          <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>Almost there!</Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>We're setting up your account</Typography>
        </Box>
        <Box sx={{ position: 'relative', width: 300, height: 300, mb: 4 }}>
          <Image
            src={images[currentImageIndex]}
            alt="Setup in progress"
            layout="fill"
            objectFit="contain"
          />
        </Box>
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={displayProgress} 
            sx={{ 
              height: 10, 
              borderRadius: 5,
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
              }
            }} 
          />
        </Box>
        <Typography variant="body1">
          {!isComplete ? 'Setting up your account...' : 'Setup complete! Redirecting to dashboard...'}
        </Typography>
      </Container>
    </ThemeProvider>
  );
};

export default OnboardingStep4;