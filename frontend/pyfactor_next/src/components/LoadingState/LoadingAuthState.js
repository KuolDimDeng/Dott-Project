// src/components/LoadingState/LoadingAuthState.js
'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { LoadingStateWithProgress } from './LoadingStateWithProgress';

export function LoadingAuthState() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const checkAuthAndRedirect = async () => {
      // Wait for session to be fully loaded
      if (status === 'loading' || !session?.user) {
        return;
      }

      // If not authenticated, redirect to signin
      if (status === 'unauthenticated') {
        if (mounted) {
          router.replace('/auth/signin');
        }
        return;
      }

      try {
        // User is authenticated, check onboarding status
        const response = await axiosInstance.get('/api/onboarding/status/');

        if (!mounted) return;

        logger.info('Checking auth status for redirect:', {
          status: response.data.status,
          isAuthenticated: !!session,
        });

        if (response.data.status === 'complete') {
          // Add small delay to ensure session is fully established
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (mounted) {
            router.replace('/dashboard');
          }
        } else {
          if (mounted) {
            router.replace('/onboarding/step1');
          }
        }
      } catch (error) {
        logger.error('Error checking auth status:', error);
        if (mounted && error?.response?.status === 401) {
          router.replace('/auth/signin');
        }
      }
    };

    checkAuthAndRedirect();

    return () => {
      mounted = false;
    };
  }, [status, session, router]);

  return (
    <LoadingStateWithProgress
      message="Setting up your dashboard..."
      showProgress={true}
      isActive={true}
      image={{
        src: '/static/images/Pyfactor.png',
        alt: 'Logo',
        width: 150,
        height: 100,
      }}
    />
  );
}
