import React from 'react';
import PropTypes from 'prop-types';
import { Button, CircularProgress, Box } from '@mui/material';
import { NavigationContainer } from './StepNavigation.styles';
import { logger } from '@/utils/logger';
import { useOnboarding } from '@/app/onboarding/contexts/OnboardingContext';
import { generateRequestId } from '@/lib/authUtils';  // Add this import


const StepNavigation = ({
    onNext,
    onPrevious,
    onSkip,
    nextLabel = 'Next',
    previousLabel = 'Previous',
    skipLabel = 'Skip',
    loading = false,
    disableNext = false,
    disablePrevious = false,
    showSkip = false,
    nextStep = 'subscription', // Default value
    currentStep = 'business-info' // Default value
}) => {
    const { canNavigateToStep } = useOnboarding();

    const handleNextClick = (e) => {
        logger.debug('Next button clicked:', {
          requestId: generateRequestId(),
          loading,
          disableNext,
          hasOnNext: !!onNext,
          currentStep,
          nextStep,
          event: {
            type: e.type,
            defaultPrevented: e.defaultPrevented
          }
        });
      
        try {
          onNext(e);
        } catch (error) {
          logger.error('Error in next button handler:', {
            error: error.message,
            stack: error.stack
          });
        }
      };

    const handlePreviousClick = (e) => {
        logger.debug('Previous button clicked:', {
            loading,
            disablePrevious,
            previousLabel,
            hasPreviousHandler: !!onPrevious
        });
        onPrevious?.(e);
    };

    const handleSkipClick = (e) => {
        logger.debug('Skip button clicked:', {
            loading,
            skipLabel,
            hasSkipHandler: !!onSkip
        });
        onSkip?.(e);
    };

    // Log component state on mount and state changes
    React.useEffect(() => {
        logger.debug('StepNavigation state:', {
            currentStep,
            nextStep,
            hasNextHandler: !!onNext,
            hasPreviousHandler: !!onPrevious,
            hasSkipHandler: !!onSkip,
            loading,
            disableNext,
            disablePrevious,
            showSkip,
            canNavigateToNext: canNavigateToStep(nextStep),
            navigationValidation: {
                currentStep,
                nextStep,
                isValid: canNavigateToStep(nextStep)
            }
        });
    }, [onNext, onPrevious, onSkip, loading, disableNext, disablePrevious, showSkip, nextStep, canNavigateToStep, currentStep]);

    return (
        <NavigationContainer>
            {onPrevious && (
                <Button
                    variant="outlined"
                    onClick={handlePreviousClick}
                    disabled={loading || disablePrevious}
                >
                    {previousLabel}
                </Button>
            )}
            
            <Box sx={{ display: 'flex', gap: 2 }}>
                {showSkip && onSkip && (
                    <Button
                        variant="text"
                        onClick={handleSkipClick}
                        disabled={loading}
                    >
                        {skipLabel}
                    </Button>
                )}
                
                {onNext && (
                    <Button
                    variant="contained"
                    onClick={handleNextClick}
                    disabled={loading || disableNext}
                    sx={{ position: 'relative', minWidth: 100 }}
                >
                    {loading ? (
                        <CircularProgress 
                            size={24} 
                            sx={{ position: 'absolute' }} 
                        />
                    ) : nextLabel}
                </Button>
                )}
            </Box>
        </NavigationContainer>
    );
};

StepNavigation.propTypes = {
    onNext: PropTypes.func,
    onPrevious: PropTypes.func,
    onSkip: PropTypes.func,
    nextLabel: PropTypes.string,
    previousLabel: PropTypes.string,
    skipLabel: PropTypes.string,
    loading: PropTypes.bool,
    disableNext: PropTypes.bool,
    disablePrevious: PropTypes.bool,
    showSkip: PropTypes.bool,
    currentStep: PropTypes.string,
    nextStep: PropTypes.string // Add prop type for nextStep
};



export default React.memo(StepNavigation);