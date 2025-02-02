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

  useEffect(() => {
    logger.debug('AuthLoadingState effect triggered:', {
      status,
      hasSession: !!session,
      pathname: window.location.pathname,
      accessToken: !!session?.user?.accessToken,
      onboarding_status: session?.user?.onboarding_status
    });
  }, [status, session]);

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
    if (!isInitialized || status === 'loading') return;
  
    // Define checkAuth without parameters since we're using closure variables
    const checkAuth = async () => {
      // Check for required values
      if (!status || !session || !router) {
        console.error('Missing required authentication parameters', { 
          status, 
          hasSession: !!session, 
          hasRouter: !!router 
        });
        return;
      }
  
      const requestId = crypto.randomUUID();
  
      logger.debug('Running checkAuth', {
        requestId,
        status,
        sessionExists: !!session,
        accessToken: session?.user?.accessToken || null,
        pathname: window.location.pathname,
      });
  
      if (status === 'authenticated' && session?.user?.accessToken) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/onboarding/token/verify/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-Request-ID': crypto.randomUUID()
            },
            body: JSON.stringify({
              token: accessToken
            }),
            credentials: 'include'
          });
  
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token verification failed: ${errorText}`);
          }
  
          logger.info('Token verified successfully', { requestId });
  
          if (window.location.pathname === '/auth/signin') {
            router.replace('/onboarding/business-info');
            logger.info('Redirecting to onboarding page', { requestId });
          }
        } catch (error) {
          logger.error('Auth check failed', {
            requestId,
            error: error.message,
            stack: error.stack,
          });
        }
      }
    };
  
    checkAuth();
  }, [isInitialized, status, session, router]);
  
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