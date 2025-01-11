///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Setup/Setup.js
'use client';

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Container, Box, Typography, CircularProgress, Alert } from '@mui/material';
import Image from 'next/image';
import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress';
import { useSetupForm } from './useSetupForm';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { logger } from '@/utils/logger';
import {
  SetupContainer,
  ProgressContainer,
  ProgressIndicator,
  SlideShowContainer
} from './Setup.styles';

const SetupComponent = ({ metadata }) => {
  const { canNavigateToStep } = useOnboarding();
  
  const {
    progress,
    currentStep,
    isComplete,
    currentImageIndex,
    wsConnected,
    isInitializing,
    requestId,
    selectedTier
  } = useSetupForm();

  // Verify setup access
  if (!canNavigateToStep('setup')) {
    logger.warn('Invalid setup page access:', {
      requestId,
      selectedTier
    });
    
    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ mt: 2 }}>
          Please complete previous steps before proceeding to setup
        </Alert>
      </Container>
    );
  }

  // Update steps based on tier and validation
  const steps = [
    { 
      label: 'Business Info', 
      current: false, 
      completed: true,
      isAccessible: canNavigateToStep('business-info')
    },
    { 
      label: 'Subscription', 
      current: false, 
      completed: true,
      isAccessible: canNavigateToStep('subscription')
    },
    ...(selectedTier === 'professional' ? [
      { 
        label: 'Payment', 
        current: false, 
        completed: true,
        isAccessible: canNavigateToStep('payment')
      }
    ] : []),
    { 
      label: 'Setup', 
      current: true, 
      completed: false,
      isAccessible: canNavigateToStep('setup')
    }
  ];

  // Calculate current step number based on tier
  const currentStepNumber = selectedTier === 'professional' ? 4 : 3;
  const totalSteps = selectedTier === 'professional' ? 4 : 3;

  // Log setup progress
  React.useEffect(() => {
    logger.debug('Setup progress update:', {
      requestId,
      progress,
      currentStep,
      isComplete,
      wsConnected,
      selectedTier
    });
  }, [progress, currentStep, isComplete, wsConnected, requestId, selectedTier]);

  return (
    <Container maxWidth="md">
      <StepProgress 
        steps={steps} 
        currentStep={currentStepNumber}
      />

      <SetupContainer>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Image
            src="/static/images/Pyfactor.png"
            alt="Pyfactor Logo"
            width={150}
            height={50}
            priority
          />
        </Box>

        <StepHeader
          title={metadata.title}
          description={metadata.description}
          currentStep={currentStepNumber}
          totalSteps={totalSteps}
          stepName="Setup"
        />

        <ProgressContainer>
          <ProgressIndicator value={progress} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {currentStep}
          </Typography>
          {(isInitializing || !wsConnected) && (
            <Typography variant="body2" color="text.secondary">
              Establishing connection...
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Setting up {selectedTier} tier - {progress}% Complete
          </Typography>
          {!wsConnected && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Connection lost. Attempting to reconnect...
            </Typography>
          )}
        </ProgressContainer>

        <SlideShowContainer>
          {/* Add your slideshow images here */}
        </SlideShowContainer>

        {isComplete && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {selectedTier} tier setup complete! Redirecting...
            </Typography>
          </Box>
        )}

        {!wsConnected && progress > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Connection interrupted. Your progress is saved and setup will continue when connection is restored.
          </Alert>
        )}
      </SetupContainer>
    </Container>
  );
};

SetupComponent.propTypes = {
  metadata: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    nextStep: PropTypes.string,
    prevStep: PropTypes.string
  }).isRequired
};

const Setup = memo(SetupComponent);

export default Setup;