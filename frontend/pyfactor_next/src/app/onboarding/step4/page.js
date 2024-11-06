'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Grid, LinearProgress, Button, Alert } from '@mui/material';
import Image from 'next/image';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const progressSteps = [
  { progress: 0, step: 'Initializing' },
  { progress: 25, step: 'Verifying Data' },
  { progress: 40, step: 'Setting Up Business Profile' },
  { progress: 60, step: 'Creating User Database' },
  { progress: 75, step: 'Setting Up Database Tables' },
  { progress: 90, step: 'Finalizing Setup' },
  { progress: 100, step: 'Onboarding Complete' },
];

const OnboardingStep4 = ({ onComplete }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing');
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { updateFormData } = useOnboarding();

  // Query to verify session if present
  const { data: sessionVerification } = useQuery({
    queryKey: ['sessionVerification'],
    queryFn: async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      if (sessionId) {
        const response = await axiosInstance.get(`/api/onboarding/save-step4/?session_id=${sessionId}`);
        return response.data;
      }
      return null;
    },
    enabled: typeof window !== 'undefined',
    retry: 1,
  });

  // Mutation for completing onboarding
  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/api/onboarding/save-step4/', {
        status: 'complete'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingStatus']);
      setIsComplete(true);
      setProgress(100);
      if (onComplete) {
        onComplete();
      }
      setTimeout(() => router.push('/dashboard'), 2000);
    },
    onError: (error) => {
      console.error('Error completing onboarding:', error);
    }
  });

  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'onboarding_progress':
        setProgress(data.progress);
        setCurrentStep(data.step);
        break;
      case 'onboarding_complete':
        completeMutation.mutate();
        break;
      case 'error':
        throw new Error(data.message);
        break;
    }
  }, [completeMutation]);

  const connectWebSocket = useCallback(() => {
    if (!session?.user?.id) return null;

    const token = session.user.accessToken;
    if (!token) throw new Error('Authentication error. Please try logging in again.');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = axiosInstance.defaults.baseURL.replace(/^https?:/, wsProtocol);
    const socket = new WebSocket(`${wsBaseUrl}/ws/onboarding/${session.user.id}/?token=${token}`);

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: 'start_onboarding' }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = () => {
      setIsConnected(false);
      throw new Error('WebSocket connection error');
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      if (!event.wasClean) {
        throw new Error('Connection lost');
      }
    };

    return socket;
  }, [session, handleWebSocketMessage]);

  // WebSocket connection management
  const { error: wsError, refetch: reconnect } = useQuery({
    queryKey: ['websocket'],
    queryFn: connectWebSocket,
    enabled: !!session && !!sessionVerification,
    retry: 3,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Grid container sx={{ height: '100vh' }}>
        <Grid item xs={12} sm={6} sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          flexDirection: 'column' 
        }}>
          <Image 
            src="/static/images/Pyfactor.png" 
            alt="Pyfactor Logo" 
            width={150} 
            height={50} 
            priority 
          />
          <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>
            Almost there!
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            We're setting up your account
          </Typography>
          <Box sx={{ position: 'relative', width: 300, height: 300, mb: 4 }}>
            <Image 
              src={images[currentImageIndex]} 
              alt="Setup in progress" 
              layout="fill" 
              objectFit="contain" 
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          flexDirection: 'column',
          p: 4 
        }}>
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

          {wsError && (
            <Alert 
              severity="error" 
              action={
                <Button color="inherit" size="small" onClick={() => reconnect()}>
                  Retry
                </Button>
              }
              sx={{ mb: 2, width: '100%' }}
            >
              {wsError.message}
            </Alert>
          )}

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
                <Typography 
                  variant="body2" 
                  color={progress >= step.progress ? 'textPrimary' : 'textSecondary'}
                >
                  {step.step}
                </Typography>
              </Box>
            ))}
          </Box>

          {!isConnected && !wsError && (
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