'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { redirect } from 'next/navigation';
import TenantInitializer from './TenantInitializer';
import StandardSpinner from '@/components/ui/StandardSpinner';

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

      // Check for session ID cookie on client side
      const hasSessionId = document.cookie.includes('sid=');
      
      console.log('[TenantLayoutWrapper] Client-side session check:', {
        hasSessionId,
        tenantId
      });

      if (!hasSessionId) {
        // No session at all, redirect to home
        router.push('/');
        return;
      }

      // Try to get session from API
      try {
        const response = await fetch('/api/auth/session-v2', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData && sessionData.authenticated) {
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
        <StandardSpinner size="large" />
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