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

        console.log('🔄 [OAuthCallback] ========== STEP 3: AUTH0 REDIRECTED TO /auth/oauth-callback ==========');
        console.log('🔄 [OAuthCallback] Timestamp:', new Date().toISOString());
        console.log('🔄 [OAuthCallback] Full URL:', window.location.href);
        console.log('🔄 [OAuthCallback] Search params:', window.location.search);
        console.log('🔄 [OAuthCallback] Authorization code:', code ? `${code.substring(0, 10)}...` : 'MISSING');
        console.log('🔄 [OAuthCallback] Code length:', code?.length);
        console.log('🔄 [OAuthCallback] State:', state || 'MISSING');
        console.log('🔄 [OAuthCallback] Error param:', error || 'none');
        console.log('🔄 [OAuthCallback] Cookies available:', document.cookie);
        console.log('🔄 [OAuthCallback] Next step: Exchange code for tokens');
        console.log('🔄 [OAuthCallback] ========== END STEP 3 ==========');

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

        console.log('🔄 [OAuthCallback] ========== STEP 4: STARTING TOKEN EXCHANGE ==========');
        console.log('🔄 [OAuthCallback] Exchange URL:', `/api/auth/exchange?code=${code}&state=${state}`);
        console.log('🔄 [OAuthCallback] Code preview:', code.substring(0, 20) + '...');
        console.log('🔄 [OAuthCallback] State:', state);
        console.log('🔄 [OAuthCallback] About to call /api/auth/exchange...');
        console.log('🔄 [OAuthCallback] Expected: Exchange will retrieve PKCE verifier from cookie');
        console.log('🔄 [OAuthCallback] ========== END STEP 4 ==========');

        // Call our API to exchange the code for tokens - Fixed URL to match dynamic route
        const exchangeResponse = await fetch(`/api/auth/exchange?code=${code}&state=${state}`);
        
        console.log('🔄 [OAuthCallback] Exchange response status:', exchangeResponse.status);
        console.log('🔄 [OAuthCallback] Exchange response headers:', Object.fromEntries(exchangeResponse.headers.entries()));
        
        if (!exchangeResponse.ok) {
          const errorData = await exchangeResponse.json();
          console.error('❌ [OAuthCallback] ========== TOKEN EXCHANGE FAILED ==========');
          console.error('❌ [OAuthCallback] Status:', exchangeResponse.status);
          console.error('❌ [OAuthCallback] Error data:', errorData);
          console.error('❌ [OAuthCallback] Error message:', errorData.message);
          console.error('❌ [OAuthCallback] Error details:', errorData.details);
          console.error('❌ [OAuthCallback] Error code:', errorData.error_code);
          console.error('❌ [OAuthCallback] ========== END EXCHANGE ERROR ==========');
          
          // Use the user-friendly message if available
          const errorMessage = errorData.message || errorData.error || 'Authentication failed';
          setError(errorMessage);
          
          // Check for specific error types
          if (errorData.error_code === 'invalid_grant' || errorData.details?.includes('redirect_uri')) {
            console.error('[OAuth Callback] Redirect URI mismatch detected');
            setTimeout(() => {
              router.push('/auth/signin?error=oauth_configuration_error');
            }, 3000);
          } else {
            setTimeout(() => {
              router.push('/auth/signin?error=token_exchange_failed');
            }, 3000);
          }
          return;
        }

        const exchangeData = await exchangeResponse.json();
        console.log('✅ [OAuthCallback] ========== TOKEN EXCHANGE SUCCESS ==========');
        console.log('✅ [OAuthCallback] Success:', exchangeData.success);
        console.log('✅ [OAuthCallback] User email:', exchangeData.user?.email);
        console.log('✅ [OAuthCallback] User name:', exchangeData.user?.name);
        console.log('✅ [OAuthCallback] Authenticated:', exchangeData.authenticated);
        console.log('✅ [OAuthCallback] Needs onboarding:', exchangeData.needsOnboarding);
        console.log('✅ [OAuthCallback] Exchange data keys:', Object.keys(exchangeData));
        console.log('✅ [OAuthCallback] ========== END EXCHANGE SUCCESS ==========');

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