
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/step4/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Grid, 
  LinearProgress, 
  Button, 
  Alert,
  Container,
  Paper,
  Fade,
  CircularProgress
} from '@mui/material';
import Image from 'next/image';
import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOnboarding } from '../contexts/onboardingContext';
import { useSession } from 'next-auth/react';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';
import { motion, AnimatePresence } from 'framer-motion';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#2196f3' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: alpha('#1976d2', 0.12),
        },
        bar: {
          borderRadius: 10,
        },
      },
    },
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
  { progress: 0, step: 'Initializing', description: 'Setting up your workspace' },
  { progress: 25, step: 'Verifying Data', description: 'Confirming your information' },
  { progress: 40, step: 'Setting Up Business Profile', description: 'Creating your business profile' },
  { progress: 60, step: 'Creating User Database', description: 'Initializing your database' },
  { progress: 75, step: 'Setting Up Database Tables', description: 'Structuring your data' },
  { progress: 90, step: 'Finalizing Setup', description: 'Putting everything together' },
  { progress: 100, step: 'Onboarding Complete', description: 'Ready to go!' }
];

const ProgressIndicator = ({ currentProgress, step, description, isActive }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box
        component={motion.div}
        animate={{
          scale: isActive ? 1.1 : 1,
          backgroundColor: isActive ? theme.palette.primary.main : '#e0e0e0'
        }}
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          mr: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
      >
        {isActive && (
          <CircularProgress
            size={16}
            thickness={6}
            sx={{ color: '#fff' }}
          />
        )}
      </Box>
      <Box>
        <Typography
          variant="body1"
          sx={{
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'text.primary' : 'text.secondary'
          }}
        >
          {step}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block' }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  </motion.div>
);

const OnboardingStep4 = ({ onComplete }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing');
  const [isComplete, setIsComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Query to verify session and start task
  const { data: sessionVerification } = useQuery({
    queryKey: ['sessionVerification'],
    queryFn: async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      if (sessionId) {
        const response = await axiosInstance.get(`/api/onboarding/save-step4/?session_id=${sessionId}`);
        if (response.data.taskId) {
          setTaskId(response.data.taskId);
        }
        return response.data;
      }
      return null;
    },
    enabled: typeof window !== 'undefined',
    retry: 1,
  });

  // Task status polling
  const { data: taskStatus } = useQuery({
    queryKey: ['taskStatus', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const response = await axiosInstance.get(`/api/tasks/${taskId}/status/`);
      return response.data;
    },
    enabled: !!taskId,
    refetchInterval: 5000,
    onSuccess: (data) => {
      if (data?.status === 'SUCCESS') {
        completeMutation.mutate();
      } else if (data?.status === 'PROGRESS') {
        setProgress(data.progress);
        setCurrentStep(data.currentStep);
      }
    },
  });

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
      case 'task_started':
        setTaskId(data.taskId);
        break;
      case 'error':
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          reconnect();
        } else {
          throw new Error(data.message);
        }
        break;
    }
  }, [completeMutation, retryCount]);

  const connectWebSocket = useCallback(() => {
    if (!session?.user?.id) return null;

    const token = session.user.accessToken;
    if (!token) throw new Error('Authentication error. Please try logging in again.');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = axiosInstance.defaults.baseURL.replace(/^https?:/, wsProtocol);
    const socket = new WebSocket(`${wsBaseUrl}/ws/onboarding/${session.user.id}/?token=${token}`);

    socket.onopen = () => {
      setIsConnected(true);
      setRetryCount(0);
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
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => reconnect(), 1000 * Math.pow(2, retryCount));
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      if (!event.wasClean && retryCount < MAX_RETRIES) {
        setTimeout(() => reconnect(), 1000 * Math.pow(2, retryCount));
      }
    };

    return socket;
  }, [session, handleWebSocketMessage, retryCount]);

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

  useEffect(() => {
    return () => {
      if (taskId) {
        axiosInstance.post(`/api/tasks/${taskId}/cancel/`).catch(console.error);
      }
    };
  }, [taskId]);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ height: '100vh', py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: 'background.paper',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          }}
        >
          <Grid container sx={{ height: '100%' }}>
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4,
                background: 'linear-gradient(to bottom, #f0f9ff, #ffffff)'
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Image
                  src="/static/images/Pyfactor.png"
                  alt="Pyfactor Logo"
                  width={180}
                  height={60}
                  priority
                  style={{ marginBottom: '2rem' }}
                />
              </motion.div>

              <Typography
                variant="h4"
                component={motion.h4}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent'
                }}
              >
                Almost there!
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                component={motion.h6}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                sx={{ mb: 4 }}
              >
                We're setting up your workspace
              </Typography>

              <Box
                sx={{
                  position: 'relative',
                  width: 300,
                  height: 300,
                  borderRadius: 4,
                  overflow: 'hidden'
                }}
              >
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Image
                      src={images[currentImageIndex]}
                      alt="Setup in progress"
                      layout="fill"
                      objectFit="contain"
                    />
                  </motion.div>
                </AnimatePresence>
              </Box>
            </Grid>

            <Grid
              item
              xs={12}
              md={6}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                p: 4,
                backgroundColor: '#ffffff'
              }}
            >
              <Box sx={{ mb: 4 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    mb: 2,
                    '& .MuiLinearProgress-bar': {
                      transition: 'transform 0.5s ease'
                    }
                  }}
                />

                <Typography
                  variant="body1"
                  align="center"
                  sx={{
                    fontWeight: 500,
                    color: 'text.primary',
                    mb: 1
                  }}
                >
                  {!isComplete ? currentStep : 'Setup complete! Redirecting to dashboard...'}
                </Typography>

                <Typography
                  variant="body2"
                  align="center"
                  color="text.secondary"
                  sx={{ mb: 4 }}
                >
                  {progress}% Complete
                </Typography>
              </Box>

              {wsError && (
                <Fade in>
                  <Alert
                    severity="error"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => reconnect()}
                      >
                        Retry
                      </Button>
                    }
                    sx={{ mb: 4 }}
                  >
                    {wsError.message}
                  </Alert>
                </Fade>
              )}

              <Box sx={{ flex: 1 }}>
                {progressSteps.map((step, index) => (
                  <ProgressIndicator
                    key={step.progress}
                    currentProgress={progress}
                    step={step.step}
                    description={step.description}
                    isActive={progress >= step.progress && progress < (progressSteps[index + 1]?.progress ?? 101)}
                  />
                ))}
              </Box>

          {!isConnected && !wsError && (
            <Typography sx={{ mt: 2, textAlign: 'center' }}>
              Connecting...
            </Typography>
          )}
        </Grid>
      </Grid>
      </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default OnboardingStep4;