'use client';


import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../auth.module.css';

/**
 * Auth0 Cross-Origin Verification Page
 * 
 * This component serves as a fallback verification mechanism when third-party cookies 
 * are disabled in browsers like Safari and Firefox with strict privacy settings.
 * 
 * It receives verification data via URL parameters from Auth0 and sends it back
 * via postMessage to complete the authentication flow.
 */
export default function VerifyPage() {
  const [status, setStatus] = useState('verifying');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Extract verification parameters from URL
    const state = searchParams.get('state');
    const domain = searchParams.get('domain');
    
    if (!state || !domain) {
      setStatus('error');
      return;
    }

    try {
      // Create verification message for Auth0
      const message = { type: 'authorization_response', response: { state } };
      const targetOrigin = `https://${domain}`;
      
      // Log verification attempt
      console.log('Sending verification message to Auth0:', { targetOrigin });
      
      // Send message to Auth0 domain
      window.opener.postMessage(message, targetOrigin);
      
      // Set success status
      setStatus('success');
      
      // Redirect to home page after short delay
      setTimeout(() => {
        if (window.opener) {
          window.close(); // Close popup if opened as popup
        } else {
          router.push('/'); // Redirect to home page if not popup
        }
      }, 2000);
    } catch (error) {
      console.error('Auth0 verification error:', error);
      setStatus('error');
    }
  }, [searchParams, router]);

  return (
    <div className={styles.container}>
      <h1>Authentication Verification</h1>
      
      {status === 'verifying' && (
        <>
          <div className={styles.loadingSpinner}></div>
          <p>Verifying your authentication...</p>
        </>
      )}
      
      {status === 'success' && (
        <>
          <p>Authentication verified successfully!</p>
          <p>Redirecting you to the application...</p>
        </>
      )}
      
      {status === 'error' && (
        <>
          <p>There was a problem verifying your authentication.</p>
          <p>Please try signing in again.</p>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Sign In
          </button>
        </>
      )}
    </div>
  );
}
