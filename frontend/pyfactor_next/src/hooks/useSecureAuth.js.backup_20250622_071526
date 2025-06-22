/**
 * Secure Authentication Hook
 * Integrates device fingerprinting with auth flow
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import deviceFingerprint from '@/utils/deviceFingerprint';
import { useSession } from '@/hooks/useSession-v2';

export const useSecureAuth = () => {
  const router = useRouter();
  const { setSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Establish secure session with device fingerprinting
   */
  const establishSecureSession = useCallback(async (accessToken, user) => {
    setLoading(true);
    setError(null);

    try {
      // Collect device fingerprint
      console.log('[SecureAuth] Collecting device fingerprint...');
      const fingerprintData = await deviceFingerprint.collect();
      
      // Create session with fingerprint
      console.log('[SecureAuth] Creating secure session...');
      const response = await fetch('/api/sessions/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          deviceFingerprint: fingerprintData,
          session_type: 'web',
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const sessionData = await response.json();
      console.log('[SecureAuth] Session created successfully');
      
      // Check security status
      if (sessionData.security) {
        const { risk_score, requires_verification, device_trusted } = sessionData.security;
        
        // Handle high-risk sessions
        if (risk_score > 70 && !device_trusted) {
          console.warn('[SecureAuth] High-risk session detected:', risk_score);
          // Could redirect to additional verification
        }
        
        // Store security info in session
        sessionData.securityInfo = {
          riskScore: risk_score,
          requiresVerification: requires_verification,
          deviceTrusted: device_trusted,
        };
      }

      // Update session state
      setSession({
        user: sessionData.user,
        accessToken,
        sessionToken: sessionData.session_token,
        expiresAt: sessionData.expires_at,
        needsOnboarding: sessionData.needs_onboarding,
        tenantId: sessionData.tenant?.id,
        subscriptionPlan: sessionData.subscription_plan,
        securityInfo: sessionData.securityInfo,
      });

      // Handle post-auth navigation
      if (sessionData.needs_onboarding) {
        router.push('/onboarding');
      } else if (sessionData.tenant?.id) {
        router.push(`/tenant/${sessionData.tenant.id}/dashboard`);
      } else {
        router.push('/dashboard');
      }

      return sessionData;
    } catch (err) {
      console.error('[SecureAuth] Session establishment failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router, setSession]);

  /**
   * Handle failed login with device tracking
   */
  const handleFailedLogin = useCallback(async (email, error) => {
    try {
      // Get minimal fingerprint for failed login tracking
      const fingerprintData = deviceFingerprint.getMinimal();
      
      const response = await fetch('/api/sessions/security/failed-login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          deviceFingerprint: fingerprintData,
          error: error.message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.action === 'block') {
          return {
            blocked: true,
            reason: data.reason,
            blockedUntil: data.blocked_until,
          };
        }
        
        return {
          blocked: false,
          remainingAttempts: data.remaining_attempts,
        };
      }
    } catch (err) {
      console.error('[SecureAuth] Failed to report failed login:', err);
    }
    
    return { blocked: false };
  }, []);

  /**
   * Sign in with enhanced security
   */
  const secureSignIn = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // First attempt authentication
      const authResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        
        // Handle failed login
        const failedLoginResult = await handleFailedLogin(email, new Error(errorData.error));
        
        if (failedLoginResult.blocked) {
          throw new Error(`Account temporarily blocked. Try again after ${new Date(failedLoginResult.blockedUntil).toLocaleTimeString()}`);
        }
        
        if (failedLoginResult.remainingAttempts !== undefined) {
          throw new Error(`${errorData.error}. ${failedLoginResult.remainingAttempts} attempts remaining.`);
        }
        
        throw new Error(errorData.error || 'Authentication failed');
      }

      const authData = await authResponse.json();
      
      // Establish secure session
      return await establishSecureSession(authData.access_token, authData.user);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [establishSecureSession, handleFailedLogin]);

  /**
   * Handle Auth0 callback with security
   */
  const handleSecureCallback = useCallback(async (code, state) => {
    setLoading(true);
    setError(null);

    try {
      // Exchange code for tokens
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await response.json();
      
      // Establish secure session
      return await establishSecureSession(data.access_token, data.user);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [establishSecureSession]);

  return {
    loading,
    error,
    secureSignIn,
    handleSecureCallback,
    establishSecureSession,
    handleFailedLogin,
  };
};