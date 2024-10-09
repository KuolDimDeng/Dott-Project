import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/app/dashboard/components/components/axiosConfig';

const OnboardingContext = createContext();

export const OnboardingProvider = ({ children }) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});


  const goToNextStep = () => {
    setStep((prevStep) => {
      const newStep = prevStep + 1;
      console.log("Advancing to Step:", newStep); // Debugging step state
      return newStep;
    });
  };  const goToPrevStep = () => setStep((prevStep) => prevStep - 1);



  const updateFormData = (data) => {
    setFormData((prevData) => ({ ...prevData, ...data }));
  };

  const completeOnboarding = async (data) => {
    try {
      const response = await axiosInstance.post('/api/complete-onboarding/', {
        business: data.business,
        selectedPlan: data.selectedPlan,
        billingCycle: data.billingCycle
      });

      if (response.status === 200) {
        console.log("Onboarding completed successfully:", response.data);
        router.push('/dashboard');
      } else {
        console.error("Unexpected response during onboarding completion:", response.data);
      }
    } catch (error) {
      console.error("Error completing onboarding:", error.message);
    }
  };

  return (
    <OnboardingContext.Provider value={{ step, formData, goToNextStep, goToPrevStep, updateFormData, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
