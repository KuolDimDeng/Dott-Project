'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Grid, LinearProgress, Button } from '@mui/material';
import Image from 'next/image';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useOnboarding } from '../contexts/onboardingContext';
import { useSession } from 'next-auth/react';
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
  '/static/images/Be-Patient-1--Streamline-Brooklyn.png',
  '/static/images/Waiting-1--Streamline-Brooklyn.png'
];

const OnboardingStep4 = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { onboardingStatus, setOnboardingStatus, saveStep4Data } = useOnboarding();

  const progressSteps = [
    { progress: 0, step: 'Initializing' },
    { progress: 25, step: 'Verifying Data' },
    { progress: 40, step: 'Setting Up Business Profile' },
    { progress: 60, step: 'Creating User Database' },
    { progress: 75, step: 'Setting Up Database Tables' },
    { progress: 90, step: 'Finalizing Setup' },
    { progress: 100, step: 'Onboarding Complete' },
  ];



  const completeOnboarding = useCallback(async () => {
    if (!isComplete) {
      try {
        console.log('Completing onboarding...');
        await saveStep4Data({});
        setOnboardingStatus('complete');
        setIsComplete(true);
        setProgress(100);
      } catch (error) {
        console.error('Error completing onboarding:', error);
        setError('Failed to complete onboarding. Please try again.');
      }
    }
  }, [isComplete, saveStep4Data, setOnboardingStatus]);

  const connectWebSocket = useCallback(() => {
    if (!session?.user?.id) {
      console.log('No user session, skipping WebSocket connection');
      return;
    }

    const token = session.user.accessToken;
    if (!token) {
      console.error('No access token found');
      setError('Authentication error. Please try logging in again.');
      return;
    }

    console.log('Attempting to connect to WebSocket...');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = axiosInstance.defaults.baseURL.replace(/^https?:/, wsProtocol);
    const socket = new WebSocket(`${wsBaseUrl}/ws/onboarding/${session.user.id}/?token=${token}`);

    socket.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setError(null);
      console.log('Sending start_onboarding message');
      socket.send(JSON.stringify({ type: 'start_onboarding' }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      
      if (data.type === 'onboarding_progress') {
        setProgress(data.progress);
        setCurrentStep(data.step);
      } else if (data.type === 'onboarding_complete') {
        completeOnboarding();
      } else if (data.type === 'error') {
        setError(data.message);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setError('Connection error. Please try again.');
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setIsConnected(false);
      if (!event.wasClean) {
        setError('Connection lost. Please try again.');
      }
    };

    return socket;
  }, [session, completeOnboarding]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
  
    if (sessionId) {
      // Verify the session with your backend
      axiosInstance.get(`/api/onboarding/save-step4/?session_id=${sessionId}`)
        .then(response => {
          // If verification is successful, connect to WebSocket
          connectWebSocket();
        })
        .catch(error => {
          console.error('Session verification failed:', error);
          setError('Session verification failed. Please try again.');
        });
    } else if (sessionStatus === 'authenticated') {
      // If there's no session_id but the user is authenticated, connect to WebSocket
      connectWebSocket();
    }
  }, [sessionStatus, connectWebSocket]);

  useEffect(() => {
    let socket;

    if (sessionStatus === 'authenticated') {
      socket = connectWebSocket();
    }

    return () => {
      if (socket) {
        console.log('Closing WebSocket connection');
        socket.close();
      }
    };
  }, [sessionStatus, connectWebSocket]);

  useEffect(() => {
    if (onboardingStatus === 'complete' && isComplete) {
      const redirectTimer = setTimeout(() => router.push('/dashboard'), 2000);
      return () => clearTimeout(redirectTimer);
    }
  }, [onboardingStatus, isComplete, router]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const handleRetry = () => {
    setError(null);
    setCurrentStep('Initializing');
    setProgress(0);
    setIsConnected(false);
    connectWebSocket();
  };

  return (
    <ThemeProvider theme={theme}>
      <Grid container sx={{ height: '100vh' }}>
        <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Image src="/static/images/Pyfactor.png" alt="Pyfactor Logo" width={150} height={50} priority />
          <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>Almost there!</Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>We're setting up your account</Typography>
          <Box sx={{ position: 'relative', width: 300, height: 300, mb: 4 }}>
            <Image src={images[currentImageIndex]} alt="Setup in progress" layout="fill" objectFit="contain" />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 10, borderRadius: 5 }} 
            />
          </Box>
          <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
            {!isComplete ? currentStep : 'Setup complete! Redirecting to dashboard...'}
          </Typography>
          <Box sx={{ width: '100%', mt: 2 }}>
            {progressSteps.map((step, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    backgroundColor: progress >= step.progress ? 'primary.main' : 'grey.300',
                    mr: 2 
                  }} 
                />
                <Typography variant="body2" color={progress >= step.progress ? 'textPrimary' : 'textSecondary'}>
                  {step.step}
                </Typography>
              </Box>
            ))}
          </Box>
          {error && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography color="error">{error}</Typography>
              <Button onClick={handleRetry} variant="contained" sx={{ mt: 2 }}>
                Retry Connection
              </Button>
            </Box>
          )}
          {!isConnected && !error && (
            <Typography sx={{ mt: 2, textAlign: 'center' }}>
              Connecting...
            </Typography>
          )}
        </Grid>
      </Grid>
    </ThemeProvider>
  );
};

export default OnboardingStep4;