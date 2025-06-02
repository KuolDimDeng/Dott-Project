'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { logger } from '@/utils/logger';
import LoadingScreen from '@/components/LoadingScreen';

/**
 * Higher-order component for route authentication
 * Wraps page components to ensure they're only accessible to authenticated users
 * 
 * @param {React.Component} Component - The component to wrap with authentication
 * @returns {React.Component} The wrapped component
 */
export function authenticatedRoute(Component) {
  return function AuthenticatedComponent(props) {
    const router = useRouter();
    const { user, error, isLoading } = useUser();
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
      // Only check auth when Auth0 has finished loading
      if (!isLoading) {
        if (error) {
          logger.error('[AuthenticatedRoute] Auth0 error', error);
          router.push('/auth/signin?redirect=' + encodeURIComponent(window.location.pathname));
        } else if (user) {
          logger.debug('[AuthenticatedRoute] User is authenticated', { userId: user.sub, email: user.email });
          setAuthChecked(true);
        } else {
          logger.debug('[AuthenticatedRoute] No authenticated user found');
          router.push('/auth/signin?redirect=' + encodeURIComponent(window.location.pathname));
        }
      }
    }, [user, error, isLoading, router]);

    // Show loading screen while checking authentication
    if (isLoading || !authChecked) {
      return <LoadingScreen message="Checking authentication..." />;
    }

    // Render the wrapped component if authenticated
    return user ? <Component {...props} /> : null;
  };
}

export default authenticatedRoute; 