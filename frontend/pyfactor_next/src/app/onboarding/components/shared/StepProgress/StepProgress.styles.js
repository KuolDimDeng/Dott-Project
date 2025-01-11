// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/shared/StepProgress/StepProgress.styles.js
import { styled } from '@mui/material/styles';
import { Stepper } from '@mui/material';

export const CustomStepper = styled(Stepper)(({ theme }) => ({
    marginBottom: theme.spacing(4),
    '& .MuiStepLabel-label': {
        fontSize: '0.875rem'
    }
}));