'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';

export default function Onboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);

  useEffect(() => {
    console.log('Onboarding - session:', session, 'status:', status);
    if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session.user.isOnboarded) {
        console.log('User is onboarded, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        console.log('User is not onboarded, showing onboarding steps');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return null;

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const renderStep = () => {
    switch(step) {
      case 1:
        return <OnboardingStep1 nextStep={nextStep} />;
      case 2:
        return <OnboardingStep2 nextStep={nextStep} prevStep={prevStep} />;
      default:
        return <OnboardingStep1 nextStep={nextStep} />;
    }
  };

  return (
    <div>
      {renderStep()}
    </div>
  );
}