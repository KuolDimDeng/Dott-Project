'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';
import axios from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

export default function Onboarding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.isOnboarded) {
        router.push('/dashboard');
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  const nextStep = (data) => {
    setFormData(prevData => ({ ...prevData, ...data }));
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const completeOnboarding = async (finalData) => {
    try {
      const response = await axios.post(`${apiBaseUrl}/api/complete-onboarding/`, 
        { ...formData, ...finalData },
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

  const renderStep = () => {
    if (step === 1) return <OnboardingStep1 nextStep={nextStep} />;
    if (step === 2) return <OnboardingStep2 nextStep={completeOnboarding} prevStep={prevStep} formData={formData} />;
    return null;
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return null;

  return <div>{renderStep()}</div>;
}