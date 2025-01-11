// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/shared/StepProgress/StepProgress.js
import React from 'react';
import PropTypes from 'prop-types';
import { Step, StepLabel, Typography } from '@mui/material';
import { CustomStepper } from './StepProgress.styles';

const StepProgress = ({ 
    steps, 
    orientation = 'horizontal' // Default value
}) => {
    return (
        <CustomStepper 
            activeStep={steps.findIndex(step => step.current)}
            orientation={orientation}
        >
            {steps.map((step, index) => (
                <Step
                    key={step.label}
                    completed={step.completed}
                    skipped={step.skipped}
                >
                    <StepLabel>
                        <Typography
                            variant="body2"
                            color={step.current ? 'primary' : 'textSecondary'}
                        >
                            {step.label}
                        </Typography>
                    </StepLabel>
                </Step>
            ))}
        </CustomStepper>
    );
};
// Define prop types for type checking
StepProgress.propTypes = {
    steps: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            completed: PropTypes.bool.isRequired,
            current: PropTypes.bool.isRequired,
            skipped: PropTypes.bool
        })
    ).isRequired,
    orientation: PropTypes.oneOf(['horizontal', 'vertical'])
};



export default StepProgress;