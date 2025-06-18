'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { redirect } from 'next/navigation';
import TenantInitializer from './TenantInitializer';

export default function TenantLayoutWrapper({ children, tenantId, initialSession }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState(initialSession);

  useEffect(() => {
    async function checkSession() {
      // If we already have a session from the server, we're good
      if (initialSession) {
        setIsReady(true);
        return;
      }

      // Check for session in cookies on client side
      const hasDottAuth = document.cookie.includes('dott_auth_session');
      const hasSessionToken = document.cookie.includes('session_token');
      
      console.log('[TenantLayoutWrapper] Client-side cookie check:', {
        hasDottAuth,
        hasSessionToken,
        cookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
      });

      if (!hasDottAuth && !hasSessionToken) {
        // No session at all, redirect to home
        router.push('/');
        return;
      }

      // Try to get session from API
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData && sessionData.user) {
            setSession(sessionData);
            
            // Check if user needs onboarding
            if (sessionData.user.needsOnboarding && !sessionData.user.onboardingCompleted) {
              router.push('/onboarding');
              return;
            }
            
            // Check if user has access to this tenant
            const userTenantId = sessionData.user.tenantId || sessionData.user.tenant_id;
            if (userTenantId && userTenantId !== tenantId) {
              router.push(`/${userTenantId}/dashboard`);
              return;
            }
          }
        }
      } catch (error) {
        console.error('[TenantLayoutWrapper] Error checking session:', error);
      }

      setIsReady(true);
    }

    checkSession();
  }, [tenantId, router, initialSession]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <TenantInitializer tenantId={tenantId} />
      {children}
    </>
  );
}