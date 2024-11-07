
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
  const queryClient = useQueryClient();

  const { data: session } = useSession({
    required: true,
    onSuccess: (session) => {
      if (!session?.accessToken) {
        console.error('No access token found in session');
      }
    }
  });

    // Add the completion mutation
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
  
    // Add the WebSocket message handler
    const handleWebSocketMessage = useCallback((data) => {
      console.log('Processing WebSocket message:', data);
      switch (data.type) {
        case 'onboarding_progress':
          console.log('Updating progress:', data.progress);
          console.log('Updating step:', data.step);
          setProgress(data.progress);
          setCurrentStep(data.step);
          break;
        case 'onboarding_complete':
          console.log('Onboarding complete, initiating completion mutation');
          completeMutation.mutate();
          break;
        case 'task_started':
          console.log('Task started with ID:', data.taskId);
          setTaskId(data.taskId);
          break;
        case 'error':
          console.error('Received error message:', data.message);
          if (retryCount < MAX_RETRIES) {
            console.log(`Attempting retry. Count: ${retryCount + 1}/${MAX_RETRIES}`);
            setRetryCount(prev => prev + 1);
            reconnect();
          } else {
            console.error('Max retries reached, throwing error');
            throw new Error(data.message);
          }
          break;
        default:
          console.warn('Unknown message type received:', data.type);
      }
    }, [completeMutation, retryCount, reconnect]);

// Add new mutation for task creation
const createTaskMutation = useMutation({
  mutationFn: async () => {
    console.log('Creating new database setup task');
    const response = await axiosInstance.post('/api/onboarding/save-step4/start/', {
      userId: session?.user?.id
    });
    console.log('Task creation response:', response.data);
    return response.data;
  },
  onSuccess: (data) => {
    if (data.taskId) {
      console.log('Setting new task ID:', data.taskId);
      setTaskId(data.taskId);
    }
  },
  onError: (error) => {
    console.error('Error creating database setup task:', error);
  }
});

// Task status polling
const { data: taskStatus, error: taskError } = useQuery({
  queryKey: ['taskStatus', taskId],
  queryFn: async () => {
    if (!taskId) {
      console.log('No task ID available for status check');
      return null;
    }
    console.log('Polling task status for ID:', taskId);
    try {
      const response = await axiosInstance.get(`/api/onboarding/task/${taskId}/status/`);
      console.log('Task status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Task status polling error:', error);
      throw error;
    }
  },
  enabled: !!taskId,
  refetchInterval: 3000,
  retry: 3,
  onSuccess: (data) => {
    console.log('Task status update received:', data);
    if (data?.status === 'SUCCESS') {
      console.log('Task completed successfully');
      completeMutation.mutate();
    } else if (data?.status === 'PROGRESS') {
      console.log('Task in progress:', {
        progress: data.progress,
        currentStep: data.currentStep
      });
      setProgress(data.progress);
      setCurrentStep(data.currentStep);
    }
  }
});

const connectWebSocket = useCallback(() => {
  if (!session?.user?.id) {
    console.log('Session data:', session);
    console.error('WebSocket connection failed: No user ID in session');
    return null;
  }

  // Get the token from the session
  const token = session?.user?.accessToken || session?.accessToken;
  console.log('Session user:', session?.user);
  console.log('Access token:', token);

  if (!token) {
    console.error('WebSocket connection failed: No access token in session');
    console.log('Full session data:', session);
    return null;
  }

  try {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = '127.0.0.1:8000';
    const wsUrl = `${wsProtocol}//${wsBaseUrl}/ws/onboarding/${session.user.id}/?token=${encodeURIComponent(token)}`;
    
    console.log('Attempting WebSocket connection to:', wsUrl);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connection established successfully');
      setIsConnected(true);
      setRetryCount(0);
      
      if (!taskId) {
        console.log('Initiating database setup task');
        createTaskMutation.mutate();
      }
    };

    socket.onmessage = (event) => {
      try {
        console.log('Received WebSocket message:', event.data);
        const data = JSON.parse(event.data);
        console.log('Parsed WebSocket message:', data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        console.error('Raw message data:', event.data);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error occurred:', error);
      setIsConnected(false);
      if (retryCount < MAX_RETRIES) {
        const nextRetry = retryCount + 1;
        console.log(`Attempting reconnection. Retry count: ${nextRetry}/${MAX_RETRIES}`);
        setRetryCount(nextRetry);
        setTimeout(() => reconnect(), 1000 * Math.pow(2, retryCount));
      } else {
        console.error('Max retry attempts reached');
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      setIsConnected(false);
      if (!event.wasClean && retryCount < MAX_RETRIES) {
        const nextRetry = retryCount + 1;
        console.log(`Attempting reconnection after unclean close. Retry count: ${nextRetry}/${MAX_RETRIES}`);
        setRetryCount(nextRetry);
        setTimeout(() => reconnect(), 1000 * Math.pow(2, retryCount));
      }
    };

    return socket;
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
    throw error;
  }
}, [session, taskId, retryCount, createTaskMutation]);



// Initialize WebSocket connection
const { error: wsError, refetch: reconnect } = useQuery({
  queryKey: ['websocket'],
  queryFn: connectWebSocket,
  enabled: !!session?.user?.id,
  retry: 3,
});

// Add error tracking effect
useEffect(() => {
  if (wsError) {
    console.error('WebSocket connection error:', wsError);
  }
  if (taskError) {
    console.error('Task status polling error:', taskError);
  }
}, [wsError, taskError]);

// Cleanup effect
useEffect(() => {
  return () => {
    if (taskId) {
      console.log('Cleaning up task:', taskId);
      axiosInstance.post(`/api/onboarding/task/${taskId}/cancel/`)
        .catch(error => console.error('Error canceling task:', error));
    }
  };
}, [taskId]);

// Image rotation effect
useEffect(() => {
  const intervalId = setInterval(() => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, 3000);
  return () => clearInterval(intervalId);
}, []);


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