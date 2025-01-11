// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/components/steps/BusinessInfo/BusinessInfo.styles.js
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

export const FormContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));