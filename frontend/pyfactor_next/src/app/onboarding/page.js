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
  const [formData, setFormData] = useState({});

  useEffect(() => {
    console.log('Onboarding - session:', JSON.stringify(session, null, 2));
    console.log('Onboarding - status:', status);
    if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session.user.isOnboarded) {
        console.log('User is onboarded, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        console.log('User is not onboarded, showing onboarding steps');
        console.log('Session access token:', session.accessToken);
        console.log('Session refresh token:', session.refreshToken);
      }
    }
  }, [session, status, router]);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return null;

  const nextStep = (data) => {
    console.log('Moving to next step with data:', data);
    setFormData(prevData => ({ ...prevData, ...data }));
    setStep(step + 1);
  };

  const prevStep = () => {
    console.log('Moving to previous step');
    setStep(step - 1);
  };

  const renderStep = () => {
    console.log('Rendering step:', step);
    switch(step) {
      case 1:
        return <OnboardingStep1 nextStep={nextStep} />;
      case 2:
        return <OnboardingStep2 nextStep={nextStep} prevStep={prevStep} formData={formData} />;
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