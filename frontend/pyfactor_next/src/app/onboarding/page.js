'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';
import axios from 'axios';
import { OnboardingProvider, useOnboarding } from './contexts/page';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

function OnboardingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { step, formData } = useOnboarding();

  console.log('Current formData:', formData);
  console.log('Current step:', step);  // Add this line



  useEffect(() => {
    console.log('Current step:', step);
    console.log('Current formData:', formData);
  }, [step, formData]);

  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.isOnboarded) {
        router.push('/dashboard');
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  const completeOnboarding = async (finalData) => {
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/complete-onboarding/`,
        finalData,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        }
      );
      if (response.data.message === "Onboarding completed successfully") {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return null;

  return (
    <>
      {step === 1 && <OnboardingStep1 formData={formData} goToNextStep={goToNextStep} />}
      {step === 2 && <OnboardingStep2 formData={formData} completeOnboarding={completeOnboarding} />}
    </>
  );
}

export default function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}