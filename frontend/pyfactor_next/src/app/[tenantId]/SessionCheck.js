'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { sessionManagerEnhanced } from '@/utils/sessionManager-v2-enhanced';
import StandardSpinner from '@/components/ui/StandardSpinner';

export default function SessionCheck({ children }) {
  const router = useRouter();
  const params = useParams();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        // Simple check - is user authenticated?
        const session = await sessionManagerEnhanced.getSession();
        const authenticated = session && session.authenticated;
        
        if (authenticated) {
          console.log('[SessionCheck] User is authenticated');
          setHasSession(true);
        } else {
          // No session, redirect to sign-in
          console.log('[SessionCheck] No session found, redirecting...');
          router.push(`/auth/signin?returnTo=/${params.tenantId}/dashboard`);
        }
      } catch (error) {
        console.error('[SessionCheck] Error checking session:', error);
        router.push(`/auth/signin?returnTo=/${params.tenantId}/dashboard`);
      } finally {
        setIsChecking(false);
      }
    }

    checkSession();
  }, [router, params.tenantId]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <StandardSpinner size="large" />
          <p className="text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null; // Will redirect
  }

  return <>{children}</>;
}