///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/Setup/Setup.js
'use client';

import React, { memo, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Container, Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { StepHeader } from '@/app/onboarding/components/shared/StepHeader';
import { StepProgress } from '@/app/onboarding/components/shared/StepProgress';
import { useSetupForm } from './useSetupForm';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { logger } from '@/utils/logger';
import { canNavigateToStep } from '@/app/onboarding/constants/onboardingConstants';
import { toast } from 'react-toastify'; 
import { onboardingApi } from '@/services/api/onboarding';
import axios from 'axios';

import {
  SetupContainer,
  ProgressContainer,
  ProgressIndicator,
  SlideShowContainer
} from './Setup.styles';

const SetupComponent = ({ metadata }) => {
  const router = useRouter();
  const {
    onboarding_status,
    user_profile,
    current_onboarding_step,
    isLoading: contextLoading,
    refreshStatus
  } = useOnboarding();  
  
  const [localLoading, setLocalLoading] = useState(true);
  const [verifyingSubscription, setVerifyingSubscription] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  
  const {
    progress,
    current_step,
    isComplete,
    currentImageIndex,
    wsConnected,
    isInitializing,
    requestId,
    selected_plan,
    redirectUrl
  } = useSetupForm();

  useEffect(() => {
    const verifySubscriptionStatus = async () => {
      if (!onboardingApi?.validateSubscriptionAccess) {
        logger.error('Subscription validation API not available');
        return;
      }
      
      try {
        setVerifyingSubscription(true);
        const result = await onboardingApi.validateSubscriptionAccess();
        
        logger.debug('Subscription validation response:', result.data);

        // Free plan special case
        if (selected_plan === 'free' && user_profile?.onboarding_status === 'setup') {
          return;
        }

        if (!result.data.can_access) {
          if (result.data.current_status === 'subscription') {
            router.push('/onboarding/subscription');
            return;
          }

          if (!result.data.has_business_info) {
            router.push('/onboarding/business-info');
            return;
          }
        }

      } catch (error) {
        logger.error('Subscription verification failed:', {
          error: error.message,
          status: error.response?.status
        });
        if (error.response?.status === 401) {
          router.push('/auth/signin');
        }
      } finally {
        setVerifyingSubscription(false);
        setValidationAttempted(true);
      }
    };

    // Only validate once when ready
    if (!validationAttempted && !localLoading && !contextLoading) {
      verifySubscriptionStatus();
    }
  }, [
    validationAttempted,
    localLoading, 
    contextLoading,
    selected_plan,
    user_profile?.onboarding_status,
    router
  ]);


  useEffect(() => {
    const timer = setTimeout(() => {
      if (!contextLoading && selected_plan) {
        setLocalLoading(false);
      }
    }, 500); // Add small delay to prevent flashing
  
    return () => clearTimeout(timer);
  }, [contextLoading, selected_plan]);

  // Handle redirection after setup completion
  useEffect(() => {
    if (redirectUrl) {
      const redirectTimer = setTimeout(() => {
        setLocalLoading(false);
        setVerifyingSubscription(false);
        setValidationAttempted(false);
        router.replace(redirectUrl);
      }, 100); // Small delay to ensure cleanup completes

      return () => {
        clearTimeout(redirectTimer);
      };
    }
  }, [redirectUrl, router]);

  // Simplified and more accurate canAccess
  const canAccess = useCallback(() => {
    // Loading states
    if (verifyingSubscription || localLoading || contextLoading) return true;
    
    // Special cases
    if (process.env.NODE_ENV === 'development' && localStorage.getItem('DEV_OVERRIDE')) return true;
    if (user_profile?.role === 'admin') return true;
  
    // Always allow access for free plan during setup
    if (selected_plan === 'free' && user_profile?.onboarding_status === 'setup') {
      return true;
    }
  
    // Handle undefined subscription_status
    const subscription_status = user_profile?.subscription_status || 'not_started';
    
    // Consider setup status as valid for subscription
    const hasValidSubscription = 
      subscription_status === 'complete' || 
      (selected_plan === 'free' && user_profile?.onboarding_status === 'setup');
  
    const hasValidPayment = selected_plan === 'professional' ? 
      user_profile?.payment_status === 'complete' : true;
  
    logger.debug('Access check:', {
      hasValidSubscription,
      hasValidPayment,
      subscription_status: subscription_status,
      paymentStatus: user_profile?.payment_status,
      selected_plan: selected_plan,
      onboarding_status: user_profile?.onboarding_status
    });
  
    return hasValidSubscription && hasValidPayment;
  }, [
    user_profile,
    selected_plan,
    localLoading,
    contextLoading,
    verifyingSubscription
  ]);



useEffect(() => {
  logger.debug('Profile status changed:', {
    subscription_status: user_profile?.subscription_status,
    loading: localLoading || contextLoading,
    verifying: verifyingSubscription
  });
}, [user_profile?.subscription_status, localLoading, contextLoading, verifyingSubscription]);

  if (localLoading || contextLoading || verifyingSubscription) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            {verifyingSubscription ? 'Verifying subscription...' : 'Loading setup...'}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!canAccess()) {
    return (
      <Container maxWidth="sm">
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Action Required
          </Typography>
          
          <Box sx={{ mt: 1, pl: 2 }}>
            {/* Only show for professional plan or non-setup status */}
            {(selected_plan !== 'free' || user_profile?.onboarding_status !== 'setup') && 
             user_profile?.subscription_status !== 'complete' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Subscription incomplete {user_profile?.subscription_status ? 
                    `(${user_profile.subscription_status})` : 
                    '(not started)'}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => router.push('/onboarding/subscription')}
                >
                  Complete Subscription
                </Button>
              </Box>
            )}

            {selected_plan === 'professional' && user_profile?.payment_status !== 'complete' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Payment {user_profile?.payment_status === 'pending' 
                    ? 'authorization needed' 
                    : 'method required'}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => router.push('/onboarding/payment')}
                >
                  Complete Payment
                </Button>
              </Box>
            )}
          </Box>
        </Alert>
      </Container>
    );
  }

  // Progress steps configuration
  const steps = [
    { 
      label: 'Business Info', 
      completed: user_profile?.business_info_status === 'complete',
      isAccessible: true,
      current: false
    },
    { 
      label: 'Subscription', 
      completed: user_profile?.subscription_status === 'complete',
      isAccessible: canNavigateToStep('subscription'),
      current: false
    },
    ...(selected_plan === 'professional' ? [
      { 
        label: 'Payment', 
        completed: user_profile?.payment_status === 'complete',
        isAccessible: canNavigateToStep('payment'),
        current: false
      }
    ] : []),
    { 
      label: 'Setup', 
      completed: user_profile?.database_status === 'complete',
      isAccessible: canNavigateToStep('setup'),
      current: true
    }
  ];

  const stepConfig = {
    current: selected_plan === 'professional' ? 4 : 3,
    total: selected_plan === 'professional' ? 4 : 3
  };

  const getSetupStatusText = () => {
    if (!user_profile?.database_status) return 'Finalizing configuration...';
    if (isInitializing || !wsConnected) return 'Establishing secure connection...';
    if (isComplete) return `${selected_plan} setup complete!`;
    return `${selected_plan} setup progress: ${progress}%`;
  };

  return (
    <Container maxWidth="md">
      <StepProgress 
        steps={steps} 
        current_step={stepConfig.current}
        data-testid="setup-progress"
      />

      <SetupContainer>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Image
            src="/static/images/Pyfactor.png"
            alt="Pyfactor Logo"
            width={150}
            height={50}
            priority
            data-testid="company-logo"
          />
        </Box>

        <StepHeader
          title={metadata.title}
          description={metadata.description}
          current_step={stepConfig.current}
          totalSteps={stepConfig.total}
          stepName="Setup"
          data-testid="setup-header"
        />

        <ProgressContainer data-testid="setup-progress-container">
          <ProgressIndicator 
            value={progress} 
            data-testid="setup-progress-indicator"
          />
          
          <Typography variant="h6" sx={{ mt: 2 }}>
            {current_step}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {getSetupStatusText()}
          </Typography>

          {!wsConnected && progress > 0 && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Reconnecting to setup service...
            </Typography>
          )}
        </ProgressContainer>

        <SlideShowContainer data-testid="setup-slideshow">
          {/* Slideshow content */}
        </SlideShowContainer>

        {isComplete && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Preparing your dashboard...
            </Typography>
          </Box>
        )}

        {!wsConnected && progress > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Connection lost - your setup will automatically resume
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
    next_step: PropTypes.string,
    prevStep: PropTypes.string
  }).isRequired,
  user_profile: PropTypes.shape({
    role: PropTypes.string,
    subscription_status: PropTypes.string,
    payment_status: PropTypes.string,
    business_info_status: PropTypes.string,
    database_status: PropTypes.string,
    onboarding_status: PropTypes.string
  }),
  selected_plan: PropTypes.string,
  onboarding_status: PropTypes.string,
  current_onboarding_step: PropTypes.string,
  isLoading: PropTypes.bool,
  contextLoading: PropTypes.bool
};

const Setup = memo(SetupComponent);

export default Setup;
