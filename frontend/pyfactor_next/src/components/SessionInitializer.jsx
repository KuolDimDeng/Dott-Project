'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import DashboardLoader from '@/components/DashboardLoader';

/**
 * SessionInitializer - Handles session establishment with bridge tokens
 * This component resolves the timing issue between backend session creation
 * and frontend cookie availability
 */
export default function SessionInitializer({ children }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  
  const bridgeToken = searchParams.get('bridge');
  
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // If no bridge token, check if session already exists
        if (!bridgeToken) {
          logger.info('[SessionInitializer] No bridge token, checking existing session');
          
          // Wait a moment for cookies to be available
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const sessionResponse = await fetch('/api/auth/session', {
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (sessionResponse.ok) {
            const session = await sessionResponse.json();
            if (session && session.authenticated) {
              logger.info('[SessionInitializer] Existing session found');
              setIsInitializing(false);
              return;
            }
          }
          
          // No session and no bridge token - redirect to login
          logger.error('[SessionInitializer] No session or bridge token found');
          router.push('/auth/signin');
          return;
        }
        
        logger.info('[SessionInitializer] Using bridge token to establish session');
        
        // Get session data from bridge
        const bridgeResponse = await fetch(`/api/auth/bridge-session?token=${bridgeToken}`, {
          credentials: 'include'
        });
        
        if (!bridgeResponse.ok) {
          throw new Error('Invalid or expired bridge token');
        }
        
        const bridgeData = await bridgeResponse.json();
        logger.info('[SessionInitializer] Bridge data retrieved:', {
          userId: bridgeData.userId,
          tenantId: bridgeData.tenantId,
          email: bridgeData.email
        });
        
        // Wait for cookies to propagate with exponential backoff
        let attempts = 0;
        let delay = 100;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
          logger.info(`[SessionInitializer] Checking session (attempt ${attempts + 1}/${maxAttempts})`);
          
          // Check if session is now available
          const verifyResponse = await fetch('/api/auth/session', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'x-pending-auth': 'true',
              'x-retry-count': attempts.toString()
            }
          });
          
          if (verifyResponse.ok) {
            const session = await verifyResponse.json();
            if (session && session.authenticated) {
              logger.info('[SessionInitializer] Session established successfully');
              
              // Clean up URL by removing bridge token
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('bridge');
              window.history.replaceState({}, '', newUrl.toString());
              
              setIsInitializing(false);
              return;
            }
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            logger.info(`[SessionInitializer] Waiting ${delay}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, 2000); // Cap at 2 seconds
          }
        }
        
        // If we get here, session establishment failed
        throw new Error('Failed to establish session after multiple attempts');
        
      } catch (error) {
        logger.error('[SessionInitializer] Error:', error);
        setError(error.message);
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          router.push('/auth/signin?error=session_init_failed');
        }, 2000);
      }
    };
    
    initializeSession();
  }, [bridgeToken, router, searchParams]);
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-medium text-red-600 mb-4">Session Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }
  
  if (isInitializing) {
    return <DashboardLoader message="Establishing your session..." />;
  }
  
  return <>{children}</>;
}