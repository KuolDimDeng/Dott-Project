'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress } from '@/components/ui/TailwindComponents';

export default function Auth0CallbackPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('Completing authentication...');
  const [redirectHandled, setRedirectHandled] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple redirects
      if (redirectHandled) {
        return;
      }

      try {
        setStatus('Verifying authentication...');
        
        // Get session from our API route
        const sessionResponse = await fetch('/api/auth/session');
        
        if (!sessionResponse.ok) {
          throw new Error(`Session API returned ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.user) {
          throw new Error(sessionData.error || 'No user session found');
        }
        
        setUser(sessionData.user);
        setIsLoading(false);
        
        // Mark redirect as handled to prevent loops
        setRedirectHandled(true);

        console.log('[Auth0Callback] Processing Auth0 callback for user:', {
          email: sessionData.user.email,
          sub: sessionData.user.sub
        });
        
        setStatus('Setting up your account...');
        
        // For now, always redirect to onboarding for debugging
        console.log('[Auth0Callback] Redirecting to onboarding');
        setTimeout(() => {
          router.push('/onboarding/business-info');
        }, 1500);
        
      } catch (error) {
        console.error('[Auth0Callback] Error in callback handler:', error);
        setError(error.message || 'Authentication failed');
        setIsLoading(false);
        setRedirectHandled(true);
        
        // Delay redirect to show error
        setTimeout(() => {
          router.push('/auth/signin?error=callback_failed');
        }, 3000);
      }
    };

    handleCallback();
  }, [router, redirectHandled]);

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <CircularProgress size={48} />
          <h2 className="text-xl font-semibold text-gray-900">Authenticating...</h2>
          <p className="text-gray-600">{status}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <div className="text-red-600">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Error</h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to sign in...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <CircularProgress size={48} />
            <h2 className="text-xl font-semibold text-gray-900">{status}</h2>
            {user && (
              <div className="text-sm text-gray-600">
                <p>Welcome back, {user.name || user.email}!</p>
              </div>
            )}
            <div className="text-sm text-gray-500 space-y-1">
              <p>🎯 Authentication successful! Redirecting...</p>
              <div className="text-xs text-left bg-gray-100 p-2 rounded">
                <div>✓ Token exchange complete</div>
                <div>✓ Session established</div>
                <div>✓ Routing to onboarding...</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}