'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress } from '@/components/ui/TailwindComponents';

export default function Auth0OAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        console.log('[OAuth Callback] Received:', { 
          hasCode: !!code, 
          hasState: !!state, 
          error 
        });

        if (error) {
          console.error('[OAuth Callback] Auth0 error:', error);
          setError(`Authentication error: ${error}`);
          setTimeout(() => {
            router.push('/auth/signin?error=' + error);
          }, 3000);
          return;
        }

        if (!code) {
          console.error('[OAuth Callback] Missing authorization code');
          setError('Missing authorization code');
          setTimeout(() => {
            router.push('/auth/signin?error=missing_code');
          }, 3000);
          return;
        }

        setStatus('Exchanging authorization code...');

        // Call our API to exchange the code for tokens - Fixed URL to match dynamic route
        const exchangeResponse = await fetch(`/api/auth/exchange?code=${code}&state=${state}`);
        
        if (!exchangeResponse.ok) {
          const errorData = await exchangeResponse.json();
          console.error('[OAuth Callback] Token exchange failed:', errorData);
          setError('Token exchange failed: ' + (errorData.error || 'Unknown error'));
          setTimeout(() => {
            router.push('/auth/signin?error=token_exchange_failed');
          }, 3000);
          return;
        }

        const exchangeData = await exchangeResponse.json();
        console.log('[OAuth Callback] Token exchange successful:', { 
          success: exchangeData.success,
          user: exchangeData.user?.email 
        });

        setStatus('Authentication successful! Redirecting...');

        // Redirect to the main callback handler for onboarding logic
        setTimeout(() => {
          router.push('/auth/callback');
        }, 1000);

      } catch (error) {
        console.error('[OAuth Callback] Unexpected error:', error);
        setError('Unexpected error: ' + error.message);
        setTimeout(() => {
          router.push('/auth/signin?error=unexpected_error');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <CircularProgress size={48} />
        <h2 className="text-xl font-semibold text-gray-900">Completing Authentication</h2>
        <p className="text-gray-600">{status}</p>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
            <p className="text-red-600 text-xs mt-1">Redirecting to sign in...</p>
          </div>
        )}
        
        <div className="text-sm text-gray-500 space-y-1 mt-6">
          <p>🔄 Processing OAuth callback</p>
          <div className="text-xs text-left bg-gray-100 p-2 rounded">
            <div>✓ Bypass Vercel DDoS protection</div>
            <div>✓ Frontend callback handling</div>
            <div>✓ Secure token exchange</div>
          </div>
        </div>
      </div>
    </div>
  );
} 