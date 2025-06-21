'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

export default function SessionLoading() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Preparing your session...');
  
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // Increased for Google OAuth which can be slower
    let isActive = true;

    const checkSession = async () => {
      if (!isActive) return;
      
      try {
        logger.info('[SessionLoading] Checking complete session data, attempt:', attempts + 1);
        setStatus('Verifying your account...');
        
        // Check session-v2 for complete data including onboarding status
        const response = await fetch('/api/auth/session-v2', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          logger.info('[SessionLoading] Session response:', {
            authenticated: sessionData.authenticated,
            hasUser: !!sessionData.user,
            needsOnboarding: sessionData.user?.needsOnboarding,
            tenantId: sessionData.user?.tenantId
          });
          
          if (sessionData.authenticated && sessionData.user) {
            setStatus('Loading your workspace...');
            
            // CRITICAL: Make routing decision based on complete session data
            const user = sessionData.user;
            let destination;
            
            if (user.needsOnboarding === true) {
              logger.info('[SessionLoading] User needs onboarding, redirecting to /onboarding');
              destination = '/onboarding';
            } else if (user.tenantId) {
              logger.info('[SessionLoading] User onboarded, redirecting to dashboard');
              destination = `/${user.tenantId}/dashboard`;
            } else {
              // Fallback - shouldn't happen but handle gracefully
              logger.warn('[SessionLoading] No tenant ID found, checking onboarding');
              destination = '/onboarding';
            }
            
            // Add slight delay for smooth transition
            setTimeout(() => {
              if (isActive) {
                router.push(destination);
              }
            }, 300);
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Exponential backoff for retries
          const delay = Math.min(500 * Math.pow(1.5, attempts), 3000);
          setTimeout(checkSession, delay);
          
          if (attempts > 5) {
            setStatus('Taking a bit longer than usual...');
          }
        } else {
          logger.error('[SessionLoading] Session not ready after max attempts');
          setStatus('Session setup failed. Redirecting to sign in...');
          setTimeout(() => {
            if (isActive) {
              router.push('/auth/signin?error=session_timeout');
            }
          }, 1500);
        }
      } catch (error) {
        logger.error('[SessionLoading] Error checking session:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkSession, 1000);
        } else {
          setStatus('An error occurred. Please try again.');
          setTimeout(() => {
            if (isActive) {
              router.push('/auth/signin?error=session_error');
            }
          }, 1500);
        }
      }
    };

    // Start checking immediately for faster experience
    checkSession();
    
    // Cleanup function
    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <h2 className="mt-4 text-lg font-medium text-gray-900">Setting up your session...</h2>
        <p className="mt-2 text-sm text-gray-500">{status}</p>
      </div>
    </div>
  );
}