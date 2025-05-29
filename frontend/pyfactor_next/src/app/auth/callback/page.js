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
            router.push('/dashboard');
          }, 1000);
          return;
          
        } catch (sessionError) {
          console.log('[OAuth Callback] fetchAuthSession failed:', sessionError.message);
          
          // Method 2: Try to process URL parameters manually using Amplify Auth
          console.log('[OAuth Callback] Attempting manual OAuth processing...');
          
          try {
            // Import the Auth module dynamically
            const { Amplify } = await import('aws-amplify');
            
            // Get current URL
            const currentUrl = window.location.href;
            console.log('[OAuth Callback] Processing URL:', currentUrl);
            
            // Try to use Amplify's internal auth methods
            if (Amplify && Amplify.getConfig) {
              const config = Amplify.getConfig();
              console.log('[OAuth Callback] Amplify config available:', !!config.Auth);
              
              // Try to manually complete the OAuth flow by processing the URL
              const urlParams = new URLSearchParams(window.location.search);
              const authCode = urlParams.get('code');
              
              if (authCode) {
                console.log('[OAuth Callback] Found auth code, attempting manual completion...');
                
                // Clear the URL to prevent processing the same code again
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Try to complete the OAuth flow
                const { signInWithRedirect } = await import('aws-amplify/auth');
                await signInWithRedirect({ provider: 'Google' });
                
                // Wait a bit and check authentication
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const currentUser = await getCurrentUser();
                console.log('[OAuth Callback] Manual OAuth successful:', currentUser.username);
                
                // Clear attempt counter on success
                sessionStorage.removeItem(attemptKey);
                
                setStatus('Authentication successful! Redirecting...');
                setTimeout(() => {
                  router.push('/dashboard');
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
              const cognitoUrl = `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com/oauth2/token` +
                `?grant_type=authorization_code` +
                `&client_id=${clientId}` +
                `&code=${encodeURIComponent(code)}` +
                `&redirect_uri=${redirectUri}`;
              
              console.log('[OAuth Callback] Redirecting to Cognito token endpoint:', cognitoUrl);
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
