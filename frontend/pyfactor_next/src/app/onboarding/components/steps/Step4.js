////Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/Step4.js
'use client';

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, Container, Paper, Typography, LinearProgress, 
  CircularProgress, Alert, Button, Fade, Grid 
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { toast } from 'react-toastify';

// Theme configuration
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
});

// Progress step definitions
const PROGRESS_STEPS = [
  { progress: 0, step: 'Initializing', description: 'Setting up your workspace' },
  { progress: 25, step: 'Creating Database', description: 'Creating your secure database' },
  { progress: 50, step: 'Configuring Settings', description: 'Configuring your account settings' },
  { progress: 75, step: 'Loading Templates', description: 'Loading your document templates' },
  { progress: 100, step: 'Completing Setup', description: 'Finalizing your setup' }
];



// Image slideshow configuration
const SLIDESHOW_IMAGES = [
  '/static/images/Work-Life-Balance-1--Streamline-Brooklyn.png',
  '/static/images/Payment-With-Card-2--Streamline-Brooklyn.png',
  '/static/images/Business-Growth--Streamline-Brooklyn.png'
];

// WebSocket constants
const WS_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  POLL_INTERVAL: 2000,
  SLIDESHOW_INTERVAL: 5000,
  TIMEOUT: 5000,
};
// Memoized sub-components
const ProgressIndicator = memo(function ProgressIndicator({ progress, step, description, isActive }) {
  return (
    <Box sx={{ mb: 2, opacity: isActive ? 1 : 0.5 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        mb: 0.5 
      }}>
        <Box sx={{ 
          width: 24, 
          height: 24, 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: isActive ? 'primary.main' : 'grey.300',
          color: '#fff',
          mr: 2
        }}>
          {isActive ? (
            <CircularProgress 
              size={16} 
              thickness={6} 
              sx={{ color: '#fff' }} 
            />
          ) : (
            progress
          )}
        </Box>
        <Typography 
          variant="subtitle1"
          sx={{ 
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'text.primary' : 'text.secondary'
          }}
        >
          {step}
        </Typography>
      </Box>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ pl: 5.5 }}
      >
        {description}
      </Typography>
    </Box>
  );
});

const LoadingState = memo(function LoadingState({ message = 'Preparing setup...' }) {
  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="body2">
        {message}
      </Typography>
    </Box>
  );
});

const ErrorState = memo(function ErrorState({ error, onRetry }) {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="100vh"
      p={3}
    >
      <Alert 
        severity="error"
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={onRetry}
          >
            Retry
          </Button>
        }
        sx={{ maxWidth: 500, width: '100%' }}
      >
        {error?.message || 'Failed to start setup process'}
      </Alert>
    </Box>
  );
});

const SignInPrompt = memo(function SignInPrompt({ onSignIn }) {
  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="100vh"
    >
      <Typography>
        Please sign in to continue setup.
      </Typography>
      <Button 
        variant="contained" 
        onClick={onSignIn}
        sx={{ mt: 2 }}
      >
        Sign In
      </Button>
    </Box>
  );
});

// Helper functions
const getWebSocketUrl = (userId, token) => {
  const protocol = window?.location?.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window?.location?.hostname || 'localhost';
  return `${protocol}//${hostname}:8000/ws/onboarding/${userId}/?token=${token}`;
};

const cleanupRef = (ref) => {
  if (ref.current) {
    if (typeof ref.current.close === 'function') {
      ref.current.close();
    }
    if (typeof ref.current.clear === 'function') {
      ref.current.clear();
    }
    ref.current = null;
  }
};

function Step4Content() {
  // State management
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing');
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  // Refs for cleanup
  const ws = useRef(null);
  const intervalRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const slideShowIntervalRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Hooks
  const router = useRouter();
  const { data: session } = useSession();
  const { saveStep4Data } = useOnboarding();

  // Setup WebSocket handlers
  const handleWebSocketOpen = useCallback(() => {
    logger.info('WebSocket connected');
    clearTimeout(connectionTimeoutRef.current);
    setWsConnected(true);
    startSlideshow();
  }, []);

  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'progress':
          setProgress(data.progress);
          setCurrentStep(data.step);
          break;
        case 'complete':
          handleSetupComplete(data);
          break;
        case 'error':
          handleError(new Error(data.message));
          break;
        default:
          logger.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  }, []);

  const handleWebSocketError = useCallback((error) => {
    logger.error('WebSocket error:', error);
    setWsConnected(false);
    startPolling();
  }, []);

  const handleWebSocketClose = useCallback((event) => {
    logger.info(`WebSocket closed with code ${event.code}`);
    setWsConnected(false);
    
    if (!isComplete) {
      retryTimeoutRef.current = setTimeout(() => {
        setupWebSocket();
      }, WS_CONFIG.RETRY_DELAY);
    }
  }, [isComplete]);

  // WebSocket setup
  const setupWebSocket = useCallback(() => {
    if (!session?.user?.id || wsConnected) return;

    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }

      const wsUrl = getWebSocketUrl(session.user.id, session.user.accessToken);
      ws.current = new WebSocket(wsUrl);
      
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
          logger.warn('WebSocket connection timeout');
          ws.current?.close();
          startPolling();
        }
      }, WS_CONFIG.TIMEOUT);

      ws.current.onopen = handleWebSocketOpen;
      ws.current.onmessage = handleWebSocketMessage;
      ws.current.onerror = handleWebSocketError;
      ws.current.onclose = handleWebSocketClose;

    } catch (error) {
      logger.error('Error setting up WebSocket:', error);
      startPolling();
    }
  }, [session?.user?.id, session?.user?.accessToken, wsConnected, handleWebSocketOpen, handleWebSocketMessage, handleWebSocketError, handleWebSocketClose]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axiosInstance.get('/api/onboarding/status/');
        const data = response.data;

        if (data.status === 'complete') {
          handleSetupComplete(data);
        } else if (data.status === 'failed') {
          handleError(new Error(data.error || 'Setup failed'));
        } else {
          setProgress(data.progress || 0);
          setCurrentStep(data.step || 'Processing');
        }
      } catch (error) {
        logger.error('Error polling status:', error);
      }
    }, WS_CONFIG.POLL_INTERVAL);
  }, []);

  // Slideshow management
  const startSlideshow = useCallback(() => {
    if (slideShowIntervalRef.current) return;

    slideShowIntervalRef.current = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % SLIDESHOW_IMAGES.length);
    }, WS_CONFIG.SLIDESHOW_INTERVAL);
  }, []);

  // Setup completion handler
  const handleSetupComplete = useCallback(async (data) => {
    try {
      setProgress(100);
      setIsComplete(true);
      
      await saveStep4Data({
        status: 'complete',
        database_name: data.database_name
      });

      toast.success('Setup completed successfully!');
      
      setTimeout(() => {
        router.replace('/dashboard');
      }, 2000);

    } catch (error) {
      handleError(error);
    }
  }, [router, saveStep4Data]);

  // Error handler
  const handleError = useCallback((error) => {
    logger.error('Setup error:', error);
    setError(error.message || 'An unexpected error occurred');
    toast.error(error.message || 'An unexpected error occurred');
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      [intervalRef, pollIntervalRef, slideShowIntervalRef].forEach(cleanupRef);
      [connectionTimeoutRef, retryTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setWsConnected(false);
    };
  }, []);

  // Setup mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/api/onboarding/step4/start/');
      return response.data;
    },
    onSuccess: (data) => {
      logger.info('Setup initiated:', data);
      setProgress(0);
      setCurrentStep('Initializing');
      toast.info('Setup process started');
    },
    onError: handleError
  });

  // Continuing inside Step4Content...

  useEffect(() => {
    if (!session?.user?.id) return;
    
    setupWebSocket();
    startSlideshow();
  }, [session?.user?.id, setupWebSocket, startSlideshow]);

  // Start setup when component mounts
  useEffect(() => {
    if (!setupMutation.isSuccess && !setupMutation.isLoading && !error) {
      setupMutation.mutate();
    }
  }, [setupMutation, error]);

  // Conditional renders
  if (!session) {
    return (
      <SignInPrompt 
        onSignIn={() => router.push('/auth/signin')} 
      />
    );
  }

  if (setupMutation.isLoading) {
    return <LoadingState message="Preparing setup..." />;
  }

  if (setupMutation.isError || error) {
    return (
      <ErrorState 
        error={error || setupMutation.error}
        onRetry={() => {
          setError(null);
          setupMutation.reset();
          setupMutation.mutate();
        }}
      />
    );
  }

  // Main render
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
            {/* Left side with logo and animation */}
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
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                {isComplete ? 'All Set!' : 'Almost there!'}
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
                {isComplete 
                  ? 'Your workspace is ready to use'
                  : "We're setting up your workspace"}
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
                      src={SLIDESHOW_IMAGES[currentImageIndex]}
                      alt="Setup in progress"
                      fill
                      style={{ objectFit: "contain" }}
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
              </Box>
            </Grid>

            {/* Right side with progress */}
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
                  {!isComplete 
                    ? currentStep 
                    : 'Setup complete! Redirecting to dashboard...'}
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

              {error && (
                <Fade in>
                  <Alert
                    severity="error"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                          setError(null);
                          setupMutation.mutate();
                        }}
                      >
                        Retry
                      </Button>
                    }
                    sx={{ mb: 4 }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}

              <Box sx={{ flex: 1 }}>
                {PROGRESS_STEPS.map((step, index) => (
                  <ProgressIndicator
                    key={step.progress}
                    progress={step.progress}
                    step={step.step}
                    description={step.description}
                    isActive={
                      progress >= step.progress && 
                      progress < (PROGRESS_STEPS[index + 1]?.progress ?? 101)
                    }
                  />
                ))}
              </Box>

              {/* Connection Status */}
              <Box sx={{ mt: 4 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: wsConnected ? 'success.main' : 'warning.main'
                    }}
                  />
                  {wsConnected ? 'Connected' : 'Connecting...'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

// Memoize the component
const Step4 = memo(Step4Content);

// Add prop types in development
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  ProgressIndicator.propTypes = {
    progress: PropTypes.number.isRequired,
    step: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    isActive: PropTypes.bool.isRequired
  };
  
  LoadingState.propTypes = {
    message: PropTypes.string
  };
  
  ErrorState.propTypes = {
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    onRetry: PropTypes.func.isRequired
  };
  
  SignInPrompt.propTypes = {
    onSignIn: PropTypes.func.isRequired
  };
}

// Export
export default Step4;