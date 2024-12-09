// /src/app/onboarding/components/Step4/Step4.js
'use client';

import React, { memo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Container, 
  Grid, 
  Typography, 
  LinearProgress, 
  Alert, 
  Button, 
  Fade 
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';
import { useOnboarding } from '@/app/onboarding/hooks/useOnboarding';
import { OnboardingErrorBoundary } from '@/components/ErrorBoundary/OnboardingErrorBoundary';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { logger } from '@/utils/logger';
import { useStep4Form } from './useStep4Form';
import { PROGRESS_STEPS, SLIDESHOW_IMAGES } from './Step4.constants';
import { useToast } from '@/components/Toast/ToastProvider';
import {
  theme,
  StyledPaper,
  LeftSideGrid,
  RightSideGrid,
  ImageContainer,
  ProgressContainer,
  StyledLinearProgress,
  ProgressIndicator,
  ErrorState,
  SignInPrompt,
  ConnectionStatus,
  StatusIndicator
} from './Step4.styles';

function Step4Content({ metadata }) {
const toast = useToast();

  const router = useRouter();
  const { data: session } = useSession();
  const { 
    formData, 
    loading: storeLoading, 
    error: storeError, 
    saveStep, 
    initialized, 
    initialize 
  } = useOnboarding();

  const {
    progress,
    currentStep,
    error,
    isComplete,
    currentImageIndex,
    wsConnected,
    initSetup,
    setLocalError
  } = useStep4Form(session, formData, metadata, saveStep);

  // Initialize setup
// Step4.js
useEffect(() => {
    const startSetup = async () => {
      if (!initialized || !session?.user?.id) {
        logger.debug('Waiting for initialization...', { initialized, userId: session?.user?.id });
        return;
      }
  
      try {
        logger.debug('Starting setup initialization');
        await initSetup();
      } catch (error) {
        logger.error('Setup initialization failed:', error);
        setLocalError(error.message);
      }
    };
  
    // Only run startSetup when initialized and session are both available
    if (initialized && session?.user?.id) {
      startSetup();
    }
  }, [initialized, session?.user?.id, initSetup]);


// Loading state
// Loading state
if (!initialized || storeLoading) {
    const loadingState = {
      initialization: !initialized,
      storeLoading,
      saving: false,
      sessionExists: !!session?.user?.id,
      formSubmitting: false,
      isSubmitting: false,
      resultingLoadingState: !initialized || storeLoading
    };
    
    logger.debug('Loading state:', loadingState);
    
    // If we have a session but aren't initialized, trigger initialization
    if (session?.user?.id && !initialized && !storeLoading) {
      initSetup();
    }
    
    return <LoadingStateWithProgress message="Preparing..." />;
  }

  // Authentication check
  if (!session) {
    return <SignInPrompt onSignIn={() => router.push('/auth/signin')} />;
  }

  // Error state
  if (error || storeError) {
    return (
      <ErrorState 
        error={error || storeError}
        onRetry={() => {
          setLocalError(null);
          initSetup();
        }}
      />
    );
  }

  return (
    <OnboardingErrorBoundary
    onError={(error) => {
      logger.error('Step4 error boundary caught:', error);
    }}
    onRetry={async () => {
      try {
        logger.debug('Retrying Step4 initialization');
        setLocalError(null);
        await initSetup();
      } catch (error) {
        logger.error('Error recovery failed:', error);
      }
    }}
  >
      <ThemeProvider theme={theme}>
        <Container maxWidth="lg" sx={{ height: '100vh', py: 4 }}>
          <StyledPaper>
            <Grid container sx={{ height: '100%' }}>
              {/* Left side with logo and animation */}
              <Grid item xs={12} md={6}>
                <LeftSideGrid>
                
                    <Image
                      src="/static/images/Pyfactor.png"
                      alt="Pyfactor Logo"
                      width={180}
                      height={60}
                      priority
                      style={{ marginBottom: '2rem' }}
                    />

                  <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>
                    {metadata.title}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 4 }}>
                    {metadata.description}
                  </Typography>

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

                  <ImageContainer>
                  <AnimatePresence mode='wait'>
                        {SLIDESHOW_IMAGES[currentImageIndex] && (
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
                                    onError={(e) => {
                                        logger.error('Failed to load slideshow image:', e);
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                  </ImageContainer>
                </LeftSideGrid>
              </Grid>

              {/* Right side with progress */}
              <Grid item xs={12} md={6}>
                <RightSideGrid>
                  <ProgressContainer>
                    <StyledLinearProgress>
                    <LinearProgress
                            variant="determinate"
                            value={Math.min(Math.max(progress, 0), 100)} // Ensure progress is between 0 and 100
                        />
                    </StyledLinearProgress>

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
                        {Math.round(progress)}% Complete
                    </Typography>
                  </ProgressContainer>

                  {error && (
                    <Fade in>
                      <Alert
                        severity="error"
                        action={
                          <Button
                            color="inherit"
                            size="small"
                            onClick={() => {
                              setLocalError(null);
                              initSetup();
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

                  <ConnectionStatus>
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
                      <StatusIndicator connected={wsConnected} />
                      {wsConnected ? 'Connected' : 'Connecting...'}
                    </Typography>
                  </ConnectionStatus>
                </RightSideGrid>
              </Grid>
            </Grid>
          </StyledPaper>
        </Container>
      </ThemeProvider>
    </OnboardingErrorBoundary>
  );
}

// PropTypes for development
if (process.env.NODE_ENV !== 'production') {
  const PropTypes = require('prop-types');
  
  Step4Content.propTypes = {
    metadata: PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      nextStep: PropTypes.string,
      prevStep: PropTypes.string
    }).isRequired
  };
}

const Step4 = memo(Step4Content);

export default Step4;