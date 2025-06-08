'use client';

import { appCache } from '@/utils/appCache';


import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cognitoAuth } from '@/lib/cognitoDirectAuth';
import { logger } from '@/utils/logger';

export default function DirectOAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('[Direct OAuth] Callback params:', { 
          code: code ? code.slice(0, 10) + '...' : 'none', 
          state: !!state, 
          error: errorParam,
          hasParams: searchParams.toString() !== ''
        });

        // Check if this is an OAuth error response
        if (errorParam) {
          const errorMessage = errorDescription || errorParam;
          throw new Error(`OAuth error: ${errorMessage}`);
        }

        // Check if we have any parameters at all
        if (!searchParams.toString()) {
          console.error('[Direct OAuth] No parameters received - page accessed directly');
          setError('Invalid request. Please sign in with Google from the sign-in page.');
          setStatus('');
          
          // Redirect to sign-in page after a delay
          setTimeout(() => {
            router.push('/auth/signin');
          }, 3000);
          return;
        }

        // Check if we have the authorization code
        if (!code) {
          throw new Error('No authorization code received. Please try signing in again.');
        }

        setStatus('Exchanging code for tokens...');

        // Exchange the authorization code for tokens
        const tokens = await cognitoAuth.exchangeCodeForTokens(code);
        console.log('[Direct OAuth] Tokens received:', { 
          idToken: !!tokens.id_token, 
          accessToken: !!tokens.access_token 
        });

        // Store the tokens
        cognitoAuth.storeAuthTokens(tokens);

        // Get user info from the stored tokens
        const user = cognitoAuth.getCurrentUser();
        console.log('[Direct OAuth] User authenticated:', user.email);

        // Store auth session flags
        setCacheValue('auth_had_session', true);
        setCacheValue('oauth_provider', 'google');
        setCacheValue('oauth_user_email', user.email);
        
        if (typeof window !== 'undefined' && appCache.getAll()) {
          if (!appCache.getAll()) appCache.init();
          if (!appCache.get('auth')) appCache.set('auth', {});
          appCache.set('auth.had_session', true);
          appCache.set('auth.last_login', new Date().toISOString());
          appCache.set('auth.provider', 'google');
          appCache.set('auth.oauth_user', user);
        }

        setStatus('Completing sign in...');

        // Redirect to a common auth handler that will check user status
        // This handler will have access to Amplify functions to properly check the user
        router.push('/auth/oauth-success');

      } catch (error) {
        console.error('[Direct OAuth] Authentication failed:', error);
        setError(error.message);
        
        setTimeout(() => {
          router.push('/auth/signin?error=' + encodeURIComponent(error.message));
        }, 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {error ? 'Authentication Error' : 'Completing Sign In'}
          </h2>
          <div className="mt-8 space-y-4">
            {!error && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            {status && <p className="text-sm text-gray-600">{status}</p>}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="text-sm font-medium">{error}</p>
                <p className="text-xs mt-2">Redirecting to sign-in page...</p>
              </div>
            )}
            {error && (
              <div className="mt-4">
                <a
                  href="/auth/signin"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  Go to Sign In →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 