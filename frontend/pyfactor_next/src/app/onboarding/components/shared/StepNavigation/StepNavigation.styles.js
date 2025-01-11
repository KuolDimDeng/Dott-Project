// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/shared/StepNavigation/StepNavigation.styles.js
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const NavigationContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(4),
    gap: theme.spacing(2)
}));