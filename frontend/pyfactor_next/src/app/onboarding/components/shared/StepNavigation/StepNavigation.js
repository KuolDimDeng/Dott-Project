'use client';


import { useRouter } from 'next/navigation';
import React, { memo, useCallback, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import PropTypes from 'prop-types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { logger } from '@/utils/logger';
import { updateUserAttributes } from '@/config/amplifyUnified';

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
    <div className="flex justify-between items-center mt-8 gap-4">
      <div className="flex gap-2">
        {onBack && (
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleBack}
            disabled={isSubmitting || loading}
          >
            {backLabel}
          </button>
        )}
        {onNext && (
          <button
            className="px-4 py-2 bg-primary-main text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleNext}
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 mr-2">
                  <LoadingSpinner size="small" />
                </div>
                <span>Processing...</span>
              </div>
            ) : (
              nextLabel
            )}
          </button>
        )}
      </div>
    </div>
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
