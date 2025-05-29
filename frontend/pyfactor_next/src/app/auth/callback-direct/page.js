'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cognitoAuth } from '@/lib/cognitoDirectAuth';

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
        const error = searchParams.get('error');

        console.log('[Direct OAuth] Callback params:', { code: code?.slice(0, 10) + '...', state: !!state, error });

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
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

        // Get user info
        const user = cognitoAuth.getCurrentUser();
        console.log('[Direct OAuth] User authenticated:', user.email);

        setStatus('Authentication successful! Redirecting...');

        // Parse state to get redirect URL
        let redirectUrl = '/dashboard';
        if (state) {
          try {
            const stateObj = JSON.parse(decodeURIComponent(state));
            redirectUrl = stateObj.redirectUrl || '/dashboard';
          } catch (e) {
            console.log('[Direct OAuth] Could not parse state, using default redirect');
          }
        }

        // Redirect after a short delay
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1000);

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
            Completing Sign In
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