'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { logger } from '@/utils/logger';

export default function Auth0Callback() {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    logger.debug('[Auth0 Callback] Component mounted', { hasUser: !!user, hasError: !!error, isLoading });

    if (isLoading) {
      setStatus('Completing authentication with Auth0...');
      return;
    }

    if (error) {
      logger.error('[Auth0 Callback] Authentication error:', error);
      setStatus('Authentication failed');
      setTimeout(() => {
        router.push('/auth/signin?error=' + encodeURIComponent(error.message));
      }, 3000);
      return;
    }

    if (user) {
      logger.info('[Auth0 Callback] Authentication successful:', user.email);
      setStatus('Authentication successful! Redirecting...');
      
      // Check if user needs onboarding
      const isNewUser = !user.updated_at || user.logins_count === 1;
      const redirectPath = isNewUser ? '/onboarding' : '/dashboard';
      
      setTimeout(() => {
        router.push(redirectPath);
      }, 1000);
      return;
    }

    // If we reach here, something went wrong
    setStatus('Waiting for authentication...');
    
    // Fallback timeout
    const fallbackTimeout = setTimeout(() => {
      logger.warn('[Auth0 Callback] Fallback timeout reached, redirecting to signin');
      router.push('/auth/signin');
    }, 10000);

    return () => clearTimeout(fallbackTimeout);
  }, [user, error, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Processing Authentication
          </h2>
          <div className="mt-8 space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-sm text-gray-600">{status}</p>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="text-sm">{error.message}</p>
                <p className="text-xs mt-2">Redirecting to sign-in page...</p>
              </div>
            )}
            <div className="text-xs text-gray-500">
              <p>✅ Auth0 Integration</p>
              <p>🔄 Processing callback...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
