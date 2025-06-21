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
        
        // Check if we have a session token from the URL params
        const urlParams = new URLSearchParams(window.location.search);
        const sessionToken = urlParams.get('session_token');
        const backendTenantId = urlParams.get('tenant_id');
        const onboardingCompleted = urlParams.get('onboarding_completed') === 'true';
        
        if (sessionToken) {
          console.log('[Auth0Callback] Received session token from backend:', {
            sessionToken: sessionToken.substring(0, 8) + '...',
            tenantId: backendTenantId,
            onboardingCompleted: onboardingCompleted
          });
          
          // If we have a session token, establish the session immediately
          setStatus('Establishing session...');
          
          // Create a form to submit to establish-session endpoint
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/api/auth/establish-session';
          form.style.display = 'none';
          
          const tokenInput = document.createElement('input');
          tokenInput.type = 'hidden';
          tokenInput.name = 'token';
          tokenInput.value = sessionToken;
          
          const redirectInput = document.createElement('input');
          redirectInput.type = 'hidden';
          redirectInput.name = 'redirectUrl';
          
          // Always trust backend's onboarding status
          if (!onboardingCompleted) {
            // Backend says onboarding is not complete - go to onboarding
            redirectInput.value = '/onboarding';
          } else if (backendTenantId) {
            // Onboarding is complete and we have a tenant
            redirectInput.value = `/${backendTenantId}/dashboard`;
          } else {
            // Onboarding complete but no tenant ID - shouldn't happen
            console.error('[Auth0Callback] Onboarding complete but no tenant ID!');
            redirectInput.value = '/dashboard'; // Let middleware handle redirect
          }
          
          form.appendChild(tokenInput);
          form.appendChild(redirectInput);
          document.body.appendChild(form);
          
          console.log('[Auth0Callback] Submitting form to establish session with redirect:', redirectInput.value);
          form.submit();
          return;
        }
        
        // Only try to get session if we don't have a session token from URL
        console.log('[Auth0Callback] No session token in URL, checking for existing session');
        const sessionResponse = await fetch('/api/auth/session-v2', {
          credentials: 'include'
        });
        
        if (!sessionResponse.ok) {
          throw new Error(`Session API returned ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        
        if (!sessionData || !sessionData.user) {
          throw new Error('No user session found');
        }
        
        // Only update tenant ID from backend if provided
        if (backendTenantId) {
          sessionData.user.tenantId = backendTenantId;
          sessionData.user.tenant_id = backendTenantId;
        }
        // Trust backend session data for onboarding status - don't override
        
        setUser(sessionData);
        
        console.log('[Auth0Callback] Authentication successful, session data:', {
          hasUser: !!sessionData.user,
          hasAccessToken: !!sessionData.accessToken,
          email: sessionData.user?.email,
          hasSessionToken: !!sessionToken,
          tenantId: sessionData.user?.tenantId
        });
        
        setStatus('Loading your profile...');
        
        // Get access token for backend API calls
        const tokenResponse = await fetch('/api/auth/access-token');
        let accessToken = null;
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          accessToken = tokenData.access_token;
        }
        
        // Use unified auth flow handler V3 with deletion check
        setStatus('Setting up your account...');
        const { handlePostAuthFlow } = await import('@/utils/authFlowHandler.v3');
        const backendUser = await handlePostAuthFlow({
          user: sessionData.user,
          accessToken: sessionData.accessToken || accessToken,
          idToken: sessionData.idToken
        }, 'oauth');
        
        // Check if auth flow returned null (deleted account)
        if (!backendUser) {
          console.log('[Auth0Callback] Account is deleted, auth flow returned null');
          return; // The auth flow handler already redirected
        }
        
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
          isNewUser: backendUser.isNewUser,
          redirectUrl: backendUser.redirectUrl
        });
        
        // Mark redirect as handled to prevent loops
        setRedirectHandled(true);
        
        // Only create a session if we don't have one from the backend
        console.log('[Auth0Callback] No session token from backend, creating session');
        
        try {
          const sessionCreateResponse = await fetch('/api/auth/session-v2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              accessToken: sessionData.accessToken || accessToken,
              idToken: sessionData.idToken,
              user: {
                ...sessionData.user,
                ...backendUser,
                tenantId: backendUser.tenantId,
                needsOnboarding: backendUser.needsOnboarding,
                onboardingCompleted: backendUser.onboardingCompleted
              }
            })
          });
          
          if (sessionCreateResponse.ok) {
            console.log('[Auth0Callback] Session created successfully');
            
            // Get the session token from the response to include in redirect
            const sessionResult = await sessionCreateResponse.json();
            console.log('[Auth0Callback] Session creation result:', {
              success: sessionResult.success,
              hasUser: !!sessionResult.user,
              sessionToken: sessionResult.session_token
            });
            
            // Wait a bit for cookies to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error('[Auth0Callback] Error creating session:', error);
        }
        
        // CRITICAL: Always use the redirect URL from the flow handler
        if (backendUser.redirectUrl) {
          const displayStatus = backendUser.redirectUrl.includes('/onboarding')
            ? 'Setting up your account...' 
            : 'Loading your dashboard...';
          
          setStatus(displayStatus);
          
          console.log('[Auth0Callback] Redirecting to:', backendUser.redirectUrl);
          
          // Use secure session bridge for non-onboarding flows
          const token = sessionToken || sessionData.accessToken || sessionResult?.session_token;
          
          if (!backendUser.needsOnboarding && token) {
            // Store session data in sessionStorage for bridge
            const bridgeData = {
              token: token,
              redirectUrl: backendUser.redirectUrl,
              timestamp: Date.now()
            };
            
            sessionStorage.setItem('session_bridge', JSON.stringify(bridgeData));
            
            // Redirect to session bridge
            router.replace('/auth/session-bridge');
          } else {
            // Direct redirect for onboarding
            router.replace(backendUser.redirectUrl);
          }
          return;
        }
        
        // This should never happen with the new flow handler
        console.error('[Auth0Callback] No redirect URL provided by flow handler!');
        
        // Emergency fallback based on state
        if (backendUser.onboardingCompleted && backendUser.tenantId) {
          setStatus('Loading your dashboard...');
          setTimeout(() => {
            router.replace(`/${backendUser.tenantId}/dashboard`);
          }, 1000);
        } else {
          setStatus('Setting up your account...');
          setTimeout(() => {
            router.replace('/onboarding');
          }, 1000);
        }
        
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