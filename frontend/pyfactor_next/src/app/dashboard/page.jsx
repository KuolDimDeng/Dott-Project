'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardContent from './DashboardContent';
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { checkOnboardingStatus } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Dashboard: Session status:', status);
    console.log('Dashboard: Session data:', session);

    const checkStatus = async () => {
      if (status === 'loading') {
        return;
      }

      if (status === 'unauthenticated') {
        console.log('Dashboard: User is unauthenticated, redirecting to signin');
        router.push('/auth/signin');
        return;
      }

      if (status === 'authenticated') {
        try {
          const onboardingResponse = await checkOnboardingStatus();
          console.log('Dashboard: Onboarding status from backend:', onboardingResponse);

          if (onboardingResponse.onboarding_status !== 'complete') {
            console.log('Dashboard: Onboarding not complete, redirecting to onboarding page');
            router.push(`/onboarding/${onboardingResponse.onboarding_status}`);
          } else {
            console.log('Dashboard: Onboarding complete, staying on dashboard');
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          // Handle error (e.g., show error message)
        }
      }
    };

    checkStatus();
  }, [session, status, router, checkOnboardingStatus]);

  if (status === 'loading' || isLoading) {
    return <div>Loading...</div>;
  }

  if (!session || status !== 'authenticated') {
    console.log('Dashboard: User is not allowed to access this page.');
    return null;
  }

  console.log('Dashboard: Rendering dashboard content');
  return (
    <div>
      <h1>Dashboard</h1>
      <DashboardContent token={session.accessToken} />
    </div>
  );
}