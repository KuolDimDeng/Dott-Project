'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
        
        // Get session from our session API route (returns { user, accessToken, idToken })
        const sessionResponse = await fetch('/api/auth/session');
        
        if (!sessionResponse.ok) {
          throw new Error(`Session API returned ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        
        if (!sessionData || !sessionData.user) {
          throw new Error('No user session found');
        }
        
        setUser(sessionData);
        
        console.log('[Auth0Callback] Authentication successful, session data:', {
          hasUser: !!sessionData.user,
          hasAccessToken: !!sessionData.accessToken,
          email: sessionData.user?.email
        });
        
        setStatus('Loading your profile...');
        
        // Get access token for backend API calls
        const tokenResponse = await fetch('/api/auth/access-token');
        let accessToken = null;
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
        }
        
        // Use unified auth flow handler
        setStatus('Setting up your account...');
        const { handlePostAuthFlow } = await import('@/utils/authFlowHandler');
        const backendUser = await handlePostAuthFlow({
          user: sessionData.user,
          accessToken: sessionData.accessToken || accessToken,
          idToken: sessionData.idToken
        }, 'oauth');
        
        console.log('[Auth0Callback] Unified auth flow completed:', {
          email: backendUser.email,
          tenantId: backendUser.tenantId,
          needsOnboarding: backendUser.needsOnboarding,
          redirectUrl: backendUser.redirectUrl
        });
        
        console.log('[Auth0Callback] User profile loaded:', {
          email: backendUser.email,
          needsOnboarding: backendUser.needsOnboarding,
          onboardingCompleted: backendUser.onboardingCompleted,
          tenantId: backendUser.tenantId,
          isNewUser: backendUser.isNewUser
        });
        
        // Mark redirect as handled to prevent loops
        setRedirectHandled(true);
        
        // Use the redirect URL from the unified flow handler
        if (backendUser.redirectUrl) {
          const displayStatus = backendUser.needsOnboarding 
            ? 'Setting up your account...' 
            : 'Loading your dashboard...';
          
          setStatus(displayStatus);
          
          setTimeout(() => {
            router.push(backendUser.redirectUrl);
          }, 1500);
          return;
        }
        
        // Fallback routing if no redirect URL was set
        if (backendUser.tenantId) {
          setStatus('Loading your dashboard...');
          console.log('[Auth0Callback] Fallback: Redirecting to tenant dashboard');
          
          setTimeout(() => {
            router.push(`/tenant/${backendUser.tenantId}/dashboard`);
          }, 1500);
          return;
        }
        
        // Final fallback - redirect to onboarding
        setStatus('Setting up your account...');
        console.log('[Auth0Callback] Fallback: Redirecting to onboarding');
        
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);
        
      } catch (error) {
        console.error('[Auth0Callback] Error during callback:', error);
        setError(error.message || 'Authentication failed');
        setIsLoading(false);
        
        // Redirect to login page after showing error
        setTimeout(() => {
          router.push('/auth/email-signin?error=auth_failed');
        }, 3000);
      }
    };

    handleCallback();
  }, [router, redirectHandled]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Authentication Error
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">
            {status}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we complete your authentication...
          </p>
        </div>
      </div>
    </div>
  );
}