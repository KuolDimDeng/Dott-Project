'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    let hubListenerRemove = null;
    let timeoutId = null;
    
    const processOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('[OAuth Callback] Query params:', { code: code?.slice(0, 10) + '...', state, error });

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Check for redirect loop by counting attempts in sessionStorage
        const attemptKey = 'oauth_callback_attempts';
        const attempts = parseInt(sessionStorage.getItem(attemptKey) || '0');
        
        if (attempts >= 3) {
          sessionStorage.removeItem(attemptKey);
          throw new Error('OAuth callback failed after 3 attempts. Please try signing in again.');
        }
        
        sessionStorage.setItem(attemptKey, (attempts + 1).toString());
        setStatus('Processing authorization code...');

        // Since we have both code and state, try automatic OAuth processing first
        if (code && state) {
          console.log('[OAuth Callback] Both code and state present, trying automatic OAuth processing...');
          
          // Set up Hub listener for OAuth completion
          const onHubCapsule = ({ payload }) => {
            console.log('[OAuth Callback] Hub event received:', payload.event);
            if (payload.event === 'signedIn' || payload.event === 'signInWithRedirect') {
              console.log('[OAuth Callback] OAuth sign-in successful via Hub');
              sessionStorage.removeItem(attemptKey);
              setStatus('Authentication successful! Redirecting...');
              setTimeout(() => {
                const stateObj = JSON.parse(state);
                const redirectUrl = stateObj.redirectUrl || '/dashboard';
                router.push(redirectUrl);
              }, 1000);
            }
          };

          hubListenerRemove = Hub.listen('auth', onHubCapsule);

          // Wait a moment for automatic processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if authentication completed
          try {
            const currentUser = await getCurrentUser();
            console.log('[OAuth Callback] Automatic OAuth successful:', currentUser.username);
            sessionStorage.removeItem(attemptKey);
            setStatus('Authentication successful! Redirecting...');
            setTimeout(() => {
              const stateObj = JSON.parse(state);
              const redirectUrl = stateObj.redirectUrl || '/dashboard';
              router.push(redirectUrl);
            }, 1000);
            return;
          } catch (userError) {
            console.log('[OAuth Callback] Automatic OAuth not completed yet, trying manual methods...');
          }
        }

        // Method 1: Try to trigger OAuth completion with fetchAuthSession and forceRefresh
        console.log('[OAuth Callback] Attempting to trigger OAuth completion...');
        
        try {
          // Force a session refresh which should trigger OAuth token exchange
          await fetchAuthSession({ forceRefresh: true });
          
          // Check if we're now authenticated
          const currentUser = await getCurrentUser();
          console.log('[OAuth Callback] Successfully authenticated:', currentUser.username);
          
          // Clear attempt counter on success
          sessionStorage.removeItem(attemptKey);
          
          setStatus('Authentication successful! Redirecting...');
          setTimeout(() => {
            const redirectUrl = state ? JSON.parse(state).redirectUrl || '/dashboard' : '/dashboard';
            router.push(redirectUrl);
          }, 1000);
          return;
          
        } catch (sessionError) {
          console.log('[OAuth Callback] fetchAuthSession failed:', sessionError.message);
          
          // Method 2: Try to process URL parameters manually using Amplify Auth  
          console.log('[OAuth Callback] Attempting manual OAuth processing...');
          
          try {
            // Import the Auth module dynamically
            const { Amplify } = await import('aws-amplify');
            
            // Get current URL before any modifications
            const currentUrl = window.location.href;
            const urlParams = new URLSearchParams(window.location.search);
            const authCode = urlParams.get('code');
            
            console.log('[OAuth Callback] Processing URL:', currentUrl);
            console.log('[OAuth Callback] Auth code from URL:', authCode?.slice(0, 10) + '...');
            
            // Try to use Amplify's internal auth methods
            if (Amplify && Amplify.getConfig && authCode) {
              const config = Amplify.getConfig();
              console.log('[OAuth Callback] Amplify config available:', !!config.Auth);
              
              console.log('[OAuth Callback] Found auth code, attempting manual completion...');
              
              // Try different approaches for manual OAuth completion
              try {
                // Method 2a: Try to manually trigger the OAuth flow completion
                const { signInWithRedirect } = await import('aws-amplify/auth');
                console.log('[OAuth Callback] Attempting signInWithRedirect completion...');
                
                // Don't clear URL yet, let signInWithRedirect process it
                await signInWithRedirect({ provider: 'Google' });
                
                // Wait a bit and check authentication
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const currentUser = await getCurrentUser();
                console.log('[OAuth Callback] Manual OAuth successful:', currentUser.username);
                
                // Clear attempt counter on success
                sessionStorage.removeItem(attemptKey);
                
                setStatus('Authentication successful! Redirecting...');
                setTimeout(() => {
                  const redirectUrl = state ? JSON.parse(state).redirectUrl || '/dashboard' : '/dashboard';
                  router.push(redirectUrl);
                }, 1000);
                return;
                
              } catch (signInError) {
                console.log('[OAuth Callback] signInWithRedirect failed:', signInError.message);
                
                // Method 2b: Clear URL and try force refresh again
                console.log('[OAuth Callback] Clearing URL and retrying session refresh...');
                window.history.replaceState({}, document.title, window.location.pathname);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                await fetchAuthSession({ forceRefresh: true });
                
                const currentUser = await getCurrentUser();
                console.log('[OAuth Callback] URL clear + refresh successful:', currentUser.username);
                
                sessionStorage.removeItem(attemptKey);
                setStatus('Authentication successful! Redirecting...');
                setTimeout(() => {
                  const redirectUrl = state ? JSON.parse(state).redirectUrl || '/dashboard' : '/dashboard';
                  router.push(redirectUrl);
                }, 1000);
                return;
              }
            }
            
          } catch (manualError) {
            console.error('[OAuth Callback] Manual OAuth processing failed:', manualError);
          }
          
          // Method 3: Only redirect to Cognito if we haven't tried too many times
          if (attempts < 2) {
            console.log('[OAuth Callback] Attempting redirect to Cognito... (Attempt:', attempts + 1, ')');
            
            const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
            const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
            const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
            
            if (cognitoDomain && clientId) {
              // Try the authorize endpoint instead of token endpoint
              const cognitoUrl = `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com/oauth2/authorize` +
                `?response_type=code` +
                `&client_id=${clientId}` +
                `&redirect_uri=${redirectUri}` +
                `&scope=openid+profile+email` +
                `&identity_provider=Google`;
              
              console.log('[OAuth Callback] Redirecting to Cognito authorize endpoint:', cognitoUrl);
              window.location.href = cognitoUrl;
              return;
            }
          } else {
            // Clear attempt counter and fail
            sessionStorage.removeItem(attemptKey);
            throw new Error('OAuth processing failed after multiple attempts. Please try signing in again.');
          }
          
          throw sessionError;
        }

      } catch (error) {
        console.error('[OAuth Callback] OAuth processing failed:', error);
        
        // Clear attempt counter on error
        sessionStorage.removeItem('oauth_callback_attempts');
        
        setError(error.message);
        setStatus('Authentication failed');
        
        setTimeout(() => {
          router.push('/auth/signin?error=' + encodeURIComponent(error.message));
        }, 3000);
      }
    };

    // Start processing immediately
    processOAuthCallback();

    // Cleanup function
    return () => {
      if (hubListenerRemove) {
        hubListenerRemove();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router, searchParams]);

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
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-2">Redirecting to sign-in page...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
