'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser  } from '@/config/amplifyUnified';
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
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      // Check if user is authenticated
      const checkAuth = async () => {
        try {
          setIsLoading(true);
          
          // Get current authenticated user using Amplify v6 API
          const currentUser = await getCurrentUser().catch(() => null);
          
          if (currentUser) {
            logger.debug('[AuthenticatedRoute] User is authenticated', { userId: currentUser.userId });
            setIsAuthenticated(true);
          } else {
            logger.debug('[AuthenticatedRoute] No authenticated user found');
            router.push('/auth/signin?redirect=' + encodeURIComponent(window.location.pathname));
          }
        } catch (error) {
          logger.error('[AuthenticatedRoute] Authentication error', error);
          router.push('/auth/signin?redirect=' + encodeURIComponent(window.location.pathname));
        } finally {
          setIsLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    // Show loading screen while checking authentication
    if (isLoading) {
      return <LoadingScreen message="Checking authentication..." />;
    }

    // Render the wrapped component if authenticated
    return isAuthenticated ? <Component {...props} /> : null;
  };
}

export default authenticatedRoute; 