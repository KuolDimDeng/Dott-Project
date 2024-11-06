'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { CircularProgress, Box, Alert, Button, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useCallback, useEffect } from 'react';

const publicRoutes = ['/', '/about', '/contact', '/auth/signin', '/auth/signup'];
const authRoutes = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
const onboardingRoutes = ['/onboarding/step1', '/onboarding/step2', '/onboarding/step3', '/onboarding/step4'];

export default function AuthWrapper({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const handleRouting = useCallback((onboardingStatus) => {
    if (!onboardingStatus) return;

    // Don't redirect if we're already on the correct page
    if (pathname === `/onboarding/${onboardingStatus}`) return;

    if (onboardingStatus !== 'complete') {
      if (!onboardingRoutes.includes(pathname)) {
        logger.info('Redirecting to onboarding', { status: onboardingStatus });
        router.push(`/onboarding/${onboardingStatus}`);
      }
    } else if (pathname === '/' || pathname.startsWith('/onboarding')) {
      logger.info('Redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [pathname, router]);

  // Query for onboarding status
  const { 
    data: onboardingData, 
    isLoading: onboardingLoading,
    error: onboardingError,
    refetch: refetchOnboarding
  } = useQuery({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      if (status !== 'authenticated' || !session?.user?.accessToken) {
        return null;
      }
      
      try {
        const response = await axiosInstance.get('/api/onboarding/status/', {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`
          }
        });
        logger.info('Onboarding status response:', response.data);
        return response.data;
      } catch (error) {
        logger.error('Error fetching onboarding status:', error);
        throw error;
      }
    },
    enabled: status === 'authenticated' && !!session?.user?.accessToken,
    staleTime: 30000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 2;
    },
    onSuccess: (data) => {
      if (data?.onboarding_status) {
        handleRouting(data.onboarding_status);
      }
    },
  });

  // Route protection query
  const { isLoading: routeCheckLoading } = useQuery({
    queryKey: ['routeProtection', pathname, status],
    queryFn: async () => {
      // Allow public routes always
      if (publicRoutes.includes(pathname)) {
        return true;
      }

      // Redirect unauthenticated users to signin
      if (status === 'unauthenticated' && !authRoutes.includes(pathname)) {
        logger.info('Redirecting unauthenticated user to signin');
        router.push('/auth/signin');
        return null;
      }

      // Allow authenticated users to proceed
      return true;
    },
    enabled: status !== 'loading',
    staleTime: Infinity,
  });

  // Prefetch dashboard data
  useQuery({
    queryKey: ['prefetchDashboard'],
    queryFn: async () => {
      if (onboardingData?.onboarding_status === 'complete' && session?.user?.accessToken) {
        try {
          await queryClient.prefetchQuery({
            queryKey: ['dashboardData'],
            queryFn: () => axiosInstance.get('/api/dashboard/data', {
              headers: {
                Authorization: `Bearer ${session.user.accessToken}`
              }
            }),
          });
        } catch (error) {
          logger.error('Error prefetching dashboard data:', error);
        }
      }
      return null;
    },
    enabled: !!onboardingData?.onboarding_status && status === 'authenticated',
    staleTime: Infinity,
  });

  // Handle session changes
  useEffect(() => {
    if (status === 'unauthenticated' && !publicRoutes.includes(pathname)) {
      router.push('/auth/signin');
    }
  }, [status, pathname, router]);

  // Loading state
  if (status === 'loading' || onboardingLoading || routeCheckLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body1" color="textSecondary">
          {status === 'loading' && 'Checking authentication...'}
          {onboardingLoading && 'Checking onboarding status...'}
          {routeCheckLoading && 'Verifying route access...'}
        </Typography>
      </Box>
    );
  }

  // Error state
  if (onboardingError) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
        p={3}
      >
        <Alert 
          severity="error" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => refetchOnboarding()}
            >
              Retry
            </Button>
          }
          sx={{ width: '100%', maxWidth: 500 }}
        >
          {onboardingError.message || 'Failed to check onboarding status'}
        </Alert>
        <Typography 
          variant="body2" 
          color="text.secondary"
          align="center"
        >
          Please try again or contact support if the problem persists.
        </Typography>
      </Box>
    );
  }

  // Everything is good, render children
  return <>{children}</>;
}