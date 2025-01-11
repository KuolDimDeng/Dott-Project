// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/shared/StepHeader/StepHeader.styles.js
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const HeaderContainer = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(6),
  width: '100%'
}));

export const StepIndicator = styled(Box)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
  fontSize: '0.875rem'
}));