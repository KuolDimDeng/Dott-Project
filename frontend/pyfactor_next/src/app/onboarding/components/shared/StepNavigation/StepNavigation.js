'use client';

import { useRouter } from 'next/navigation';
import React, { memo, useCallback, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import PropTypes from 'prop-types';
import { Button, CircularProgress, Box } from '@mui/material';
import { NavigationContainer } from './StepNavigation.styles';
import { logger } from '@/utils/logger';
import { updateUserAttributes } from '@/config/amplify';

const StepNavigation = memo(({ onNext, onBack, nextLabel = 'Next', backLabel = 'Back', loading = false }) => {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = useCallback(async () => {
    if (onNext) {
      setIsSubmitting(true);
      try {
        await onNext();
      } catch (error) {
        logger.error('Navigation next failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [onNext]);

  const handleBack = useCallback(async () => {
    if (onBack) {
      setIsSubmitting(true);
      try {
        // Get current onboarding status
        const currentStatus = session?.user?.['custom:onboarding'];
        if (!currentStatus) {
          throw new Error('No onboarding status found');
        }

        // Map current status to previous step
        const statusMap = {
          'subscription': 'business-info',
          'payment': 'subscription',
          'setup': 'subscription'
        };

        const previousStep = statusMap[currentStatus];
        if (!previousStep) {
          throw new Error('Cannot determine previous step');
        }

        // Update user attributes in Cognito
        await updateUserAttributes({
          'custom:onboarding': previousStep
        });

        // Update session to reflect new status
        await update();

        // Call onBack callback
        await onBack();

        logger.debug('Navigation back successful', {
          from: currentStatus,
          to: previousStep
        });
      } catch (error) {
        logger.error('Navigation back failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [onBack, session, update]);

  return (
    <NavigationContainer>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {onBack && (
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={isSubmitting || loading}
          >
            {backLabel}
          </Button>
        )}
        {onNext && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading ? (
              <CircularProgress size={24} />
            ) : (
              nextLabel
            )}
          </Button>
        )}
      </Box>
    </NavigationContainer>
  );
});

StepNavigation.displayName = 'StepNavigation';

StepNavigation.propTypes = {
  onNext: PropTypes.func,
  onBack: PropTypes.func,
  nextLabel: PropTypes.string,
  backLabel: PropTypes.string,
  loading: PropTypes.bool,
};

export default StepNavigation;
