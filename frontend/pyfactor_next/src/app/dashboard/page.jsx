'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardContent from './DashboardContent';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('Dashboard: Session status:', status);
    console.log('Dashboard: Session data:', session);

    if (status === 'loading') {
      // While loading, do not do anything yet
      return;
    }

    if (status === 'unauthenticated') {
      console.log('Dashboard: User is unauthenticated, redirecting to signin');
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      const onboardingStatus = session?.user?.onboardingStatus;
      console.log('Dashboard: Onboarding status:', onboardingStatus);

      // If onboarding is not complete, redirect to onboarding page
      if (onboardingStatus !== 'complete') {
        console.log('Dashboard: Onboarding not complete, redirecting to onboarding page');
        router.push(`/onboarding/${onboardingStatus || 'step1'}`); // Redirect to the first step or current step of onboarding
      }
    }
  }, [session, status, router]);

  // While loading, show a loading indicator
  if (status === 'loading') return <div>Loading...</div>;

  // Prevent rendering dashboard content if onboarding is not complete
  if (!session || (session?.user?.onboardingStatus !== 'complete')) {
    console.log('Dashboard: User is not allowed to access this page.');
    return null; // Return null to not render anything
  }

  console.log('Dashboard: Rendering dashboard content');
  return (
    <div>
      <h1>Dashboard</h1>
      <DashboardContent token={session.accessToken} />
    </div>
  );
}
