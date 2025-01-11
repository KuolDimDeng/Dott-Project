// src/components/LoadingState/AuthLoadingState.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoadingStateWithProgress } from './LoadingStateWithProgress';
import { RoutingManager } from '@/lib/routingManager';
import { logger } from '@/utils/logger';

export function AuthLoadingState() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleRedirect = useCallback((path) => {
    try {
      setIsRedirecting(true);
      logger.debug('Initiating redirect:', {
        from: window.location.pathname,
        to: path,
        status,
        hasSession: !!session?.user
      });
      router.replace(path);
    } catch (error) {
      logger.error('Navigation failed:', { error, path });
      setError(error.message);
    }
  }, [router, status, session]);

  useEffect(() => {
    // Skip if already redirecting or loading
    if (isRedirecting || status === 'loading') return;

    const checkAuthState = () => {
      try {
        logger.debug('Checking auth state:', {
          status,
          hasSession: !!session?.user,
          currentPath: window.location.pathname,
          onboardingStatus: session?.user?.onboardingStatus
        });

        // Handle unauthenticated users
        if (status === 'unauthenticated') {
          const currentPath = window.location.pathname;
          if (currentPath !== RoutingManager.ROUTES.AUTH.SIGNIN) {
            handleRedirect(`${RoutingManager.ROUTES.AUTH.SIGNIN}?callbackUrl=${encodeURIComponent(currentPath)}`);
          }
          return;
        }

        // Handle authenticated users
        if (status === 'authenticated' && session?.user) {
          const currentPath = window.location.pathname;

          // Allow direct access to business-info
          if (currentPath === RoutingManager.ROUTES.ONBOARDING.BUSINESS_INFO) {
            return;
          }

          // Allow subscription access during transition
          if (currentPath === RoutingManager.ROUTES.ONBOARDING.SUBSCRIPTION &&
              (session.user.onboardingStatus === 'subscription' || 
               session.user.onboardingStatus === 'business-info')) {
            return;
          }

          // Determine target path
          const targetPath = RoutingManager.handleInitialRoute(
            currentPath,
            session,
            session.user.selectedPlan
          );

          if (currentPath !== targetPath) {
            handleRedirect(targetPath);
          }
        }
      } catch (error) {
        logger.error('Auth state check failed:', {
          error: error.message,
          status,
          currentPath: window.location.pathname
        });
        setError(error.message);
      }
    };

    checkAuthState();
  }, [status, session, handleRedirect, isRedirecting]);

  // Show loading state during authentication or redirection
  if (status === 'loading' || isRedirecting) {
    return (
      <LoadingStateWithProgress
        message={isRedirecting ? "Redirecting..." : "Setting up your workspace..."}
        isLoading={true}
        image={{
          src: '/static/images/Pyfactor.png',
          alt: 'Pyfactor Logo',
          width: 150,
          height: 100,
        }}
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <LoadingStateWithProgress
        message="Authentication Error"
        isLoading={false}
        error={error}
        onRetry={() => {
          setError(null);
          handleRedirect(RoutingManager.ROUTES.AUTH.SIGNIN);
        }}
        image={{
          src: '/static/images/Pyfactor.png',
          alt: 'Pyfactor Logo',
          width: 150,
          height: 100,
        }}
      />
    );
  }

  // Default loading state
  return (
    <LoadingStateWithProgress
      message="Preparing your workspace..."
      isLoading={true}
      image={{
        src: '/static/images/Pyfactor.png',
        alt: 'Pyfactor Logo',
        width: 150,
        height: 100,
      }}
    />
  );
}