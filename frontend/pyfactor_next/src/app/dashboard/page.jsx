///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/page.jsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardContent from './DashboardContent';
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { LoadingStateWithProgress } from '@/components/LoadingState';
import { ErrorStep } from '@/components/ErrorStep';

export default function Dashboard() {
  // Get session and navigation tools
  const { data: session, status } = useSession();
  const router = useRouter();
  const { onboardingStatus, loading: onboardingLoading } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Create a flag to handle component unmounting
    let mounted = true;

    const checkAccess = async () => {
      try {
        if (status === 'loading') {
          return;
        }

        if (status === 'unauthenticated') {
          logger.info('Redirecting unauthenticated user to signin');
          router.replace('/auth/signin');
          return;
        }

        if (status === 'authenticated' && session?.user?.accessToken) {
          const response = await axiosInstance.get('/api/onboarding/status/');

          if (!mounted) return;

          const backendStatus = response.data.status;

          // Important change: Don't check session status since it might be stale
          logger.debug('Checking user access:', {
            backendStatus,
            userId: session.user.id,
          });

          // Only check backend status
          if (backendStatus !== 'complete') {
            const currentStep = response.data.currentStep || 'step1';
            logger.info(`Redirecting to onboarding step: ${currentStep}`);
            router.replace(`/onboarding/${currentStep}`);
            return;
          }

          // User is properly authenticated and onboarded
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Dashboard access check failed:', error);
        setError(error);
        setIsLoading(false);
      }
    };

    checkAccess();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [session, status, router]);

  // Show loading state
  if (status === 'loading' || isLoading) {
    return <LoadingStateWithProgress message="Loading your dashboard..." showProgress={true} />;
  }

  // Show error state if something went wrong
  if (error) {
    return (
      <ErrorStep
        error={error}
        onRetry={() => {
          setError(null);
          setIsLoading(true);
        }}
      />
    );
  }

  // Show nothing while redirecting unauthenticated users
  if (!session || status !== 'authenticated') {
    return null;
  }

  // Render dashboard for authenticated and onboarded users
  return (
    <div className="dashboard-container">
      <h1>Welcome to Your Dashboard</h1>
      <DashboardContent token={session.accessToken} user={session.user} />
    </div>
  );
}
