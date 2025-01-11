// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/shared/StepHeader/StepHeader.js
import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@mui/material';
import { HeaderContainer, StepIndicator } from './StepHeader.styles';

const StepHeader = ({ title, description, currentStep, totalSteps, stepName }) => (
    <HeaderContainer>
        <StepIndicator>
            Step {currentStep} of {totalSteps} - {stepName}
        </StepIndicator>
        <Typography variant="h4" component="h1" gutterBottom>
            {title}
        </Typography>
        {description && (
            <Typography variant="body1" color="text.secondary">
                {description}
            </Typography>
        )}
    </HeaderContainer>
);

// Add PropTypes for type checking
StepHeader.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    currentStep: PropTypes.number.isRequired,
    totalSteps: PropTypes.number.isRequired,
    stepName: PropTypes.string.isRequired
};

export default StepHeader;