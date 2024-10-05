'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import OnboardingStep1 from './step1/page';
import OnboardingStep2 from './step2/page';

export default function Onboarding() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const apiUrl = 'http://localhost:8000'; // Ensure this is correct

  // Refresh token function
  const refreshToken = async (session) => {
    console.log("Attempting to refresh token...");
    try {
      const response = await fetch(`${apiUrl}/api/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: session.refreshToken,  // Using refresh token from the session
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Token refresh successful:", data);

        // Update session with the new access token and expiry time
        await update({
          accessToken: data.access,            // New access token
          expires: Date.now() + data.expires_in * 1000, // New expiry time
        });

        return data.access;  // Return the new access token
      } else {
        const errorData = await response.text();
        console.error("Token refresh failed:", response.status, errorData);
        throw new Error(`Failed to refresh token: ${response.status} ${errorData}`);
      }
    } catch (error) {
      console.error("Error in refreshToken:", error);
      throw error;
    }
  };

  // Check and refresh token if necessary
  useEffect(() => {
    console.log('Onboarding - session:', JSON.stringify(session, null, 2));
    console.log('Onboarding - status:', status);

    if (status === 'unauthenticated') {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    } else if (status === 'authenticated') {
      // Check if the user is onboarded
      if (session.user.isOnboarded) {
        console.log('User is onboarded, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        console.log('User is not onboarded, showing onboarding steps');
        
        // Check if the token needs to be refreshed
        const tokenExpiryTime = new Date(session.expires);
        const currentTime = new Date();
        const tokenBufferTime = 60 * 1000; // 1-minute buffer

        if (tokenExpiryTime - currentTime <= tokenBufferTime) {
          console.log("Access token expired or about to expire, attempting to refresh...");
          refreshToken(session).then(newToken => {
            console.log("Token refreshed successfully:", newToken);
          }).catch(err => {
            console.error("Token refresh failed:", err);
            router.push('/login');
          });
        }
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
    switch (step) {
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
