import { useOnboarding } from './contexts/onboardingContext';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';
import OnboardingStep3 from './step3/page';
import OnboardingStep4 from './step4/page';
import { CircularProgress, Typography } from '@mui/material';

function OnboardingContent() {
  const { onboardingStatus, loading, error } = useOnboarding();
  console.log('Current onboarding status in OnboardingContent:', onboardingStatus);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <>
      {onboardingStatus === 'step1' && <OnboardingStep1 />}
      {onboardingStatus === 'step2' && <OnboardingStep2 />}
      {onboardingStatus === 'step3' && <OnboardingStep3 />}
      {onboardingStatus === 'step4' && <OnboardingStep4 />}
    </>
  );
}

export default OnboardingContent;