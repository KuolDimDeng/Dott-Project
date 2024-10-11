import { useOnboarding } from './contexts/onboardingContext';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';
import { CircularProgress, Typography } from '@mui/material';

function OnboardingContent() {
  const { step, loading, error } = useOnboarding();
  console.log('Current step in OnboardingContent:', step);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <>
      {step === 1 && <OnboardingStep1 />}
      {step === 2 && <OnboardingStep2 />}
    </>
  );
}

export default OnboardingContent;