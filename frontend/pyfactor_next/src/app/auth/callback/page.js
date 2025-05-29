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

        setStatus('Processing authorization code...');

        // Method 1: Try to trigger OAuth completion with fetchAuthSession and forceRefresh
        console.log('[OAuth Callback] Attempting to trigger OAuth completion...');
        
        try {
          // Force a session refresh which should trigger OAuth token exchange
          await fetchAuthSession({ forceRefresh: true });
          
          // Check if we're now authenticated
          const currentUser = await getCurrentUser();
          console.log('[OAuth Callback] Successfully authenticated:', currentUser.username);
          
          setStatus('Authentication successful! Redirecting...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
          return;
          
        } catch (sessionError) {
          console.log('[OAuth Callback] fetchAuthSession failed:', sessionError.message);
          
          // Method 2: Manual OAuth processing using private API (last resort)
          if (window.Amplify && window.Amplify.Auth && window.Amplify.Auth._config) {
            console.log('[OAuth Callback] Attempting manual OAuth processing...');
            
            try {
              // Get the current URL for processing
              const currentUrl = window.location.href;
              console.log('[OAuth Callback] Processing URL:', currentUrl);
              
              // Try to use Amplify's internal OAuth handler
              const { Auth } = await import('aws-amplify');
              
              // Check if the internal OAuth handler exists
              if (Auth._oAuthHandler && Auth._oAuthHandler.handleAuthResponse) {
                console.log('[OAuth Callback] Using internal OAuth handler...');
                await Auth._oAuthHandler.handleAuthResponse(currentUrl);
                
                // Verify authentication
                const currentUser = await getCurrentUser();
                console.log('[OAuth Callback] Manual OAuth successful:', currentUser.username);
                
                setStatus('Authentication successful! Redirecting...');
                setTimeout(() => {
                  router.push('/dashboard');
                }, 1000);
                return;
              }
              
            } catch (manualError) {
              console.error('[OAuth Callback] Manual OAuth processing failed:', manualError);
            }
          }
          
          // Method 3: Redirect back to Cognito with the authorization code
          console.log('[OAuth Callback] Attempting redirect to Cognito...');
          
          const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
          const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
          const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
          
          if (cognitoDomain && clientId) {
            const cognitoUrl = `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com/oauth2/authorize` +
              `?client_id=${clientId}` +
              `&response_type=code` +
              `&scope=openid+profile+email` +
              `&redirect_uri=${redirectUri}` +
              `&code=${encodeURIComponent(code)}`;
            
            console.log('[OAuth Callback] Redirecting to Cognito:', cognitoUrl);
            window.location.href = cognitoUrl;
            return;
          }
          
          throw sessionError;
        }

      } catch (error) {
        console.error('[OAuth Callback] OAuth processing failed:', error);
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
