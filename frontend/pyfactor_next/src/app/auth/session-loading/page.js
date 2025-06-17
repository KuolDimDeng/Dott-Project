'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

export default function SessionLoading() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkSession = async () => {
      try {
        logger.info('[SessionLoading] Checking session status, attempt:', attempts + 1);
        
        // Check if session is ready
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && !data.sessionPending) {
            logger.info('[SessionLoading] Session ready, redirecting to:', redirectUrl);
            router.push(redirectUrl);
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Wait and retry
          setTimeout(checkSession, 500);
        } else {
          logger.error('[SessionLoading] Session not ready after max attempts');
          router.push('/auth/signin?error=session_timeout');
        }
      } catch (error) {
        logger.error('[SessionLoading] Error checking session:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkSession, 500);
        } else {
          router.push('/auth/signin?error=session_error');
        }
      }
    };

    // Start checking after a brief delay
    setTimeout(checkSession, 500);
  }, [redirectUrl, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <h2 className="mt-4 text-lg font-medium text-gray-900">Setting up your session...</h2>
        <p className="mt-2 text-sm text-gray-500">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
}