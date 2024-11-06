// src/app/AuthWrapper/page.js
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { CircularProgress, Box, Typography, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

const PUBLIC_ROUTES = [
  '/', 
  '/about', 
  '/contact', 
  '/auth/signin', 
  '/auth/signup',
  '/auth/forgot-password'
];

const ONBOARDING_ROUTES = [
  '/onboarding',
  '/onboarding/step1',
  '/onboarding/step2',
  '/onboarding/step3',
  '/onboarding/step4'
];

export default function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);

  // Initialize mounted state
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch onboarding status
  const { data: onboardingData, isLoading: onboardingLoading } = useQuery({
    queryKey: ['onboardingStatus', session?.user?.email],
    queryFn: async () => {
      try {
        if (!session?.user?.accessToken) {
          return null;
        }

        const response = await axiosInstance.get('/api/onboarding/status/', {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`
          }
        });
        
        logger.debug('Onboarding status response:', response.data);
        return response.data;
      } catch (error) {
        logger.error('Error fetching onboarding status:', error);
        if (error.response?.status === 401) {
          setError('Session expired. Please sign in again.');
          router.push('/auth/signin');
        }
        throw error;
      }
    },
    enabled: !!session?.user?.accessToken && status === 'authenticated',
    staleTime: 30000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false
  });

  // Handle routing logic
  useEffect(() => {
    if (!mounted) return;

    const handleRouting = async () => {
      try {
        // Allow public routes regardless of auth status
        if (PUBLIC_ROUTES.includes(pathname)) {
          return;
        }

        // Handle unauthenticated users
        if (status === 'unauthenticated') {
          logger.debug('User is unauthenticated, redirecting to signin');
          router.push('/auth/signin');
          return;
        }

        // Handle authenticated users
        if (status === 'authenticated' && onboardingData) {
          const { onboarding_status } = onboardingData;
          const isOnboardingRoute = ONBOARDING_ROUTES.some(route => 
            pathname.startsWith(route)
          );

          // Redirect incomplete users to appropriate onboarding step
          if (onboarding_status !== 'complete' && !isOnboardingRoute) {
            logger.debug('User onboarding incomplete, redirecting to:', onboarding_status);
            router.push(`/onboarding/${onboarding_status || 'step1'}`);
            return;
          }

          // Redirect completed users away from onboarding
          if (onboarding_status === 'complete' && isOnboardingRoute) {
            logger.debug('User onboarding complete, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
        }
      } catch (err) {
        logger.error('Error in routing logic:', err);
        setError('An error occurred while checking your authentication status.');
      }
    };

    handleRouting();
  }, [status, pathname, router, mounted, onboardingData]);

  // Show loading state
  if (!mounted || status === 'loading' || onboardingLoading) {
    return (
      <Box 
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="textSecondary">
          {!mounted ? 'Initializing...' : 
            status === 'loading' ? 'Checking authentication...' : 
            'Loading your information...'}
        </Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box 
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        p={3}
      >
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ maxWidth: 400 }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Render children
  return children;
}