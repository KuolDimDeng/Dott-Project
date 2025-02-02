// /src/app/onboarding/components/shared/StepNavigation/StepNavigation.js
// StepNavigation.js
import { useRouter } from 'next/navigation';
import React, { memo, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import PropTypes from 'prop-types';
import { Button, CircularProgress, Box } from '@mui/material';
import { NavigationContainer } from './StepNavigation.styles';
import { logger } from '@/utils/logger';
import { useStepTransition } from '@/app/onboarding/hooks/useStepTransition';
import { generateRequestId } from '@/lib/authUtils';
import { useToast } from '@/components/Toast/ToastProvider';
import { ONBOARDING_STEPS, getnext_step, getPreviousStep } from '@/config/steps';

const StepNavigation = ({
  onNext = null,
  onPrevious = null,
  onSkip = null,
  loading = false,
  disableNext = false,
  disablePrevious = false,
  current_step,
  next_step,
  session = null,
  showSkip = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();
  const { transition, isTransitioning } = useStepTransition();
  const router = useRouter();
  const requestId = React.useRef(crypto.randomUUID()).current;

  // Handle next step transition
  const handleNext = useCallback(async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    if (isTransitioning || isProcessing || disableNext || loading) {
      logger.debug('Navigation prevented:', {
        requestId,
        isTransitioning,
        isProcessing,
        disableNext,
        loading
      });
      return;
    }

    try {
      setIsProcessing(true);
      logger.debug('Step navigation - before transition:', {
        requestId,
        current_step,
        next_step,
        sessionStatus: session?.user?.onboarding_status,
        timestamp: new Date().toISOString()
      });

      if (typeof onNext === 'function') {
        const result = await onNext();
        if (!result?.success) {
          throw new Error(result?.error || 'Form submission failed');
        }
      }

      const success = await transition(current_step, next_step, {
        onboarding_status: next_step,
        requestId
      });

      if (!success) {
        throw new Error('Failed to transition to next step');
      }

       // After transition success
       logger.debug('Step navigation - after transition:', {
        requestId,
        previousStep: current_step,
        newStep: next_step,
        success: true,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('Step transition failed:', {
        requestId,
        error: error.message,
        current_step,
        next_step
      });
      toast.error(error.message || 'Failed to proceed');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [current_step, next_step, onNext, isProcessing, isTransitioning, disableNext, loading, transition, toast, requestId]);

  // Handle previous step transition
  const handlePrevious = useCallback(async () => {
    if (isTransitioning || isProcessing || disablePrevious || loading) return;

    try {
      setIsProcessing(true);
      const previousStep = getPreviousStep(current_step, session);
      
      logger.debug('Starting previous step transition:', {
        requestId,
        current_step,
        previousStep
      });

      if (!previousStep) {
        throw new Error('No previous step available');
      }

      if (typeof onPrevious === 'function') {
        await onPrevious();
      }

      const success = await transition(current_step, previousStep, {
        requestId
      });
      
      if (!success) {
        throw new Error('Failed to navigate to previous step');
      }

    } catch (error) {
      logger.error('Previous step transition failed:', {
        requestId,
        error: error.message,
        current_step
      });
      toast.error(error.message || 'Failed to return to previous step');
    } finally {
      setIsProcessing(false);
    }
  }, [current_step, session, onPrevious, isProcessing, isTransitioning, disablePrevious, loading, transition, toast, requestId]);

  // Handle skip functionality
  const handleSkip = useCallback(async () => {
    if (isTransitioning || isProcessing || loading) return;

    try {
      setIsProcessing(true);
      const skipToStep = getnext_step(current_step, { skipped: true }, session);

      logger.debug('Starting skip transition:', {
        requestId,
        current_step,
        skipToStep
      });

      if (typeof onSkip === 'function') {
        await onSkip();
      }

      const success = await transition(current_step, skipToStep, { 
        skipped: true,
        requestId 
      });

      if (!success) {
        throw new Error('Failed to skip step');
      }

    } catch (error) {
      logger.error('Skip transition failed:', {
        requestId,
        error: error.message,
        current_step
      });
      toast.error(error.message || 'Failed to skip step');
    } finally {
      setIsProcessing(false);
    }
  }, [current_step, session, onSkip, isProcessing, isTransitioning, loading, transition, toast, requestId]);

  return (
    <NavigationContainer>
      <Box sx={{
        mt: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }}>
        {onPrevious && (
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={disablePrevious || isProcessing || isTransitioning || loading}
          >
            Previous
          </Button>
        )}

        <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
          {showSkip && (
            <Button
              variant="text"
              onClick={handleSkip}
              disabled={isProcessing || isTransitioning || loading}
            >
              Skip
            </Button>
          )}

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={disableNext || isProcessing || isTransitioning || loading}
          >
            {(isProcessing || isTransitioning || loading) ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Next'
            )}
          </Button>
        </Box>
      </Box>
    </NavigationContainer>
  );
};

StepNavigation.propTypes = {
  onNext: PropTypes.func,
  onPrevious: PropTypes.func,
  onSkip: PropTypes.func,
  loading: PropTypes.bool,
  disableNext: PropTypes.bool,
  disablePrevious: PropTypes.bool,
  current_step: PropTypes.string.isRequired,
  next_step: PropTypes.string.isRequired,
  session: PropTypes.shape({
    user: PropTypes.object
  }),
  showSkip: PropTypes.bool
};

export default memo(StepNavigation);