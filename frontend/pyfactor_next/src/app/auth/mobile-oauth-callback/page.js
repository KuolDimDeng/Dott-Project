'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function MobileOAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing OAuth callback...');
  const [error, setError] = useState(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      console.log('[Mobile OAuth Callback] Processing callback');
      
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      if (!code || !state) {
        throw new Error('Missing authorization code or state');
      }

      // Decode the state to get platform info
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
      } catch (e) {
        console.error('[Mobile OAuth Callback] Failed to decode state:', e);
        stateData = { returnUrl: '/dashboard' };
      }

      console.log('[Mobile OAuth Callback] State data:', stateData);

      // Exchange the code for tokens
      const response = await fetch('/api/auth/exchange-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          code,
          state,
          platform: stateData.platform || 'web',
          device: stateData.device
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to exchange authorization code');
      }

      console.log('[Mobile OAuth Callback] Exchange successful:', result);
      setStatus('Authentication successful! Redirecting...');

      // For mobile platform, redirect to mobile app using custom scheme
      if (stateData.platform === 'mobile') {
        // Build the mobile deep link with session info
        const mobileUrl = `capacitor://app.dottapps.com/mobile-auth.html?authenticated=true&session_token=${encodeURIComponent(result.session_token || '')}&user_id=${encodeURIComponent(result.user?.id || '')}`;
        
        console.log('[Mobile OAuth Callback] Redirecting to mobile app:', mobileUrl);
        
        // Try to redirect to the mobile app
        window.location.href = mobileUrl;
        
        // Fallback message if redirect doesn't work
        setTimeout(() => {
          setStatus('Please return to the Dott app');
          // Also show a button to manually redirect
          setError(
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <p>If you're not automatically redirected, please return to the Dott app.</p>
              <button 
                onClick={() => window.location.href = mobileUrl}
                style={{
                  marginTop: '10px',
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Open Dott App
              </button>
            </div>
          );
        }, 2000);
      } else {
        // For web, redirect normally
        const returnUrl = stateData.returnUrl || result.returnUrl || '/dashboard';
        window.location.href = returnUrl;
      }

    } catch (err) {
      console.error('[Mobile OAuth Callback] Error:', err);
      setError(err.message || 'Authentication failed');
      setStatus('');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          marginBottom: '20px',
          color: '#1e293b'
        }}>
          Dott Authentication
        </h1>
        
        {status && (
          <p style={{ 
            color: '#64748b',
            marginBottom: '15px'
          }}>
            {status}
          </p>
        )}
        
        {error && typeof error === 'string' && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '10px',
            borderRadius: '5px',
            marginTop: '10px'
          }}>
            {error}
          </div>
        )}

        {error && typeof error !== 'string' && error}
        
        {!error && !status && (
          <div style={{ marginTop: '20px' }}>
            <div className="spinner" style={{
              border: '3px solid #f3f4f6',
              borderTop: '3px solid #2563eb',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}