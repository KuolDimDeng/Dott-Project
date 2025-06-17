'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { sessionPropagation } from '@/middleware/sessionPropagation';
import DashboardLoader from '@/components/DashboardLoader';

/**
 * Client-side session check component
 * Handles cookie propagation delays and verifies session availability
 */
export default function SessionCheck({ children }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        logger.info('[SessionCheck] Starting client-side session verification');
        
        // Check if we're in a pending auth state
        const isPending = sessionPropagation.isSessionPending();
        if (isPending) {
          logger.info('[SessionCheck] Session pending, waiting for propagation...');
          const propagated = await sessionPropagation.waitForPropagation();
          
          if (!propagated) {
            logger.error('[SessionCheck] Cookie propagation failed');
            router.push('/auth/signin?error=session_failed');
            return;
          }
        }
        
        // Check for session cookies
        const hasDottSession = document.cookie.includes('dott_auth_session=');
        const hasAppSession = document.cookie.includes('appSession=');
        const hasSessionToken = document.cookie.includes('session_token=');
        
        logger.info('[SessionCheck] Cookie check:', {
          hasDottSession,
          hasAppSession,
          hasSessionToken,
          cookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
        });
        
        // If we have any session cookie, verify with backend
        if (hasDottSession || hasAppSession || hasSessionToken) {
          // Verify session is valid
          const verifyResponse = await fetch('/api/auth/session', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (verifyResponse.ok) {
            const sessionData = await verifyResponse.json();
            if (sessionData && sessionData.authenticated) {
              logger.info('[SessionCheck] Session verified successfully');
              setHasSession(true);
              setIsChecking(false);
              return;
            }
          }
        }
        
        // Check for pending session in sessionStorage
        const pendingSession = sessionStorage.getItem('pendingSession');
        if (pendingSession) {
          try {
            const sessionData = JSON.parse(pendingSession);
            const age = Date.now() - sessionData.timestamp;
            
            if (age < 30000) { // Less than 30 seconds old
              logger.info('[SessionCheck] Found recent pending session, waiting...');
              
              // Wait a bit more for cookies to propagate
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Try one more time
              const retryResponse = await fetch('/api/auth/session', {
                credentials: 'include',
                headers: {
                  'Cache-Control': 'no-cache',
                  'x-pending-auth': 'true'
                }
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                if (retryData && retryData.authenticated) {
                  logger.info('[SessionCheck] Session verified on retry');
                  setHasSession(true);
                  setIsChecking(false);
                  return;
                }
              }
            }
          } catch (e) {
            logger.error('[SessionCheck] Error parsing pending session:', e);
          }
        }
        
        // No valid session found
        logger.error('[SessionCheck] No valid session found, redirecting to sign in');
        router.push('/auth/signin');
        
      } catch (error) {
        logger.error('[SessionCheck] Error checking session:', error);
        router.push('/auth/signin?error=session_check_failed');
      }
    };
    
    checkSession();
  }, [router]);
  
  if (isChecking) {
    return <DashboardLoader message="Verifying your session..." />;
  }
  
  if (!hasSession) {
    return <DashboardLoader message="Redirecting to sign in..." />;
  }
  
  return <>{children}</>;
}