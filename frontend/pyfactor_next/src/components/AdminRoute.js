'use client';


import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession-v2';
import { logger } from '@/utils/logger';
import StandardSpinner from '@/components/ui/StandardSpinner';

export default function AdminRoute({ children }) {
  const router = useRouter();
  const { user, loading } = useSession();
  const session = { user };
  const status = loading ? 'loading' : user ? 'authenticated' : 'unauthenticated';

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // If we're not loading and there's no session, redirect to sign in
        if (status === 'unauthenticated') {
          logger.debug('No session found, redirecting to sign in');
          router.push('/auth/signin');
          return;
        }

        // If we have a session, check admin role
        if (status === 'authenticated') {
          const isAdmin = session?.user?.['custom:role'] === 'admin';
          if (!isAdmin) {
            logger.debug('User is not admin, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }

          // Check onboarding status
          const isSetupDone = session?.user?.['custom:onboarding']?.toLowerCase() === 'true';
          const isOnboardingComplete = session?.user?.['custom:onboarding']?.toLowerCase() === 'complete';

          if (!isSetupDone && !isOnboardingComplete) {
            logger.debug('Onboarding not completed, redirecting to onboarding');
            // Generate redirect URL with same-origin location for security
            const baseUrl = origin || window.location.origin;
            const redirectUrl = `${baseUrl}/onboarding/business-info?from=admin&ts=${Date.now()}`;
            window.location.replace(redirectUrl);
            return null;
          }
        }
      } catch (error) {
        logger.error('Admin access check failed:', error);
      }
    };

    checkAdminAccess();
  }, [router, session, status]);

  // Show loading state while checking auth
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <StandardSpinner size="large" />
      </div>
    );
  }

  // If we have a valid session and user is admin, render the children
  // Case-insensitive comparison for onboarding status
  const onboardingComplete = session?.user?.['custom:onboarding']?.toLowerCase() === 'complete' || 
                           session?.user?.['custom:onboarding']?.toLowerCase() === 'completed';
  
  if (status === 'authenticated' && 
      session?.user?.['custom:role'] === 'admin' &&
      onboardingComplete) {
    return children;
  }

  // Don't render anything while redirecting
  return null;
}