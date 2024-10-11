'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import { useOnboarding } from '@/app/onboarding/contexts/onboardingContext';

export default function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const { checkOnboardingStatus } = useOnboarding();
  const [onboardingStatus, setOnboardingStatus] = useState(null);

  const checkAndRedirect = useCallback(async () => {
    console.log('AuthWrapper: Check and Redirect', { status, pathname });
    console.log('Session:', session);

    if (status === 'loading') {
      console.log('AuthWrapper: Session is loading');
      return;
    }

    setIsChecking(true);

    const publicRoutes = ['/', '/about', '/contact', '/auth/signin', '/auth/signup'];

    try {
      if (status === 'authenticated') {
        console.log('AuthWrapper: User is authenticated');

        // Always check onboarding status to ensure it's up to date
        try {
          const onboardingResponse = await checkOnboardingStatus();
          console.log('Onboarding Response:', onboardingResponse);
          const newOnboardingStatus = onboardingResponse?.onboarding_status || 'step1';
          setOnboardingStatus(newOnboardingStatus);

          console.log('New Onboarding Status:', newOnboardingStatus);

          if (newOnboardingStatus !== 'complete') {
            if (!pathname.startsWith('/onboarding')) {
              console.log('Redirecting to onboarding');
              router.push(`/onboarding/${newOnboardingStatus}`);
            }
          } else if (pathname === '/' || pathname.startsWith('/onboarding')) {
            console.log('Redirecting to dashboard');
            router.push('/dashboard');
          } else {
            console.log('User is on an appropriate page');
          }
        } catch (error) {
          console.error('Error fetching onboarding status:', error);
          // In case of error, don't change the route
        }
      } else if (status === 'unauthenticated') {
        console.log('AuthWrapper: User is unauthenticated');
        if (!publicRoutes.includes(pathname)) {
          console.log('Redirecting to signin');
          router.push('/auth/signin');
        }
      }
    } catch (error) {
      console.error('AuthWrapper: Error during redirection', error);
    } finally {
      setIsChecking(false);
    }
  }, [status, pathname, session, router, checkOnboardingStatus]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        checkAndRedirect();
      }
    }, 1000); // Add a 1-second delay to reduce frequency of checks

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [checkAndRedirect]);

  if (status === 'loading' || isChecking) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}