// /src/app/onboarding/components/shared/StepProgress/StepProgress.js
import React from 'react';
import PropTypes from 'prop-types';
import { Step, StepLabel, Typography, Box } from '@mui/material';
import { CustomStepper } from './StepProgress.styles';
import { ONBOARDING_STEPS } from '@/config/steps';

const StepProgress = ({ current_step, orientation = 'horizontal' }) => {
  // Convert ONBOARDING_STEPS into array format
  const steps = Object.entries(ONBOARDING_STEPS)
    .filter(([key]) => key !== 'complete')
    .map(([key, config]) => ({
      key,
      label: config.title,
      description: config.description,
      step: config.step,
      isCurrent: key === current_step,
      isCompleted: config.step < ONBOARDING_STEPS[current_step]?.step || false
    }))
    .sort((a, b) => a.step - b.step);

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <CustomStepper
        activeStep={steps.findIndex(step => step.isCurrent)}
        orientation={orientation}
        alternativeLabel
      >
        {steps.map((step) => (
          <Step
            key={step.key}
            completed={step.isCompleted}
          >
            <StepLabel>
              <Typography
                variant="body2"
                color={step.isCurrent ? 'primary' : 'textSecondary'}
                sx={{ 
                  fontWeight: step.isCurrent ? 600 : 400,
                  fontSize: '0.875rem'
                }}
              >
                {step.label}
              </Typography>
              {step.isCurrent && (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  {step.description}
                </Typography>
              )}
            </StepLabel>
          </Step>
        ))}
      </CustomStepper>
    </Box>
  );
};

StepProgress.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      completed: PropTypes.bool
  })).isRequired,
  current_step: PropTypes.string.isRequired  // Changed from number
};

export default React.memo(StepProgress);