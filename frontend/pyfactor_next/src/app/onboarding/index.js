import { useOnboarding } from './contexts/onboardingContext';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';

function OnboardingContent() {
  const { step } = useOnboarding();

  return (
    <>
      {step === 1 && <OnboardingStep1 />}
      {step === 2 && <OnboardingStep2 />}
    </>
  );
}

export default OnboardingContent;
