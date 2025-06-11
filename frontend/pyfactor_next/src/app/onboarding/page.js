'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SimplifiedOnboardingForm from '@/components/Onboarding/SimplifiedOnboardingForm';
import { logger } from '@/utils/logger';
import { sessionManager } from '@/utils/sessionManager';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        console.log('[OnboardingPage] Starting auth check...');
        
        // First check local session
        const localSession = sessionManager.getSession();
        const accessToken = sessionManager.getAccessToken();
        
        console.log('[OnboardingPage] Local session check:', {
          hasLocalSession: !!localSession,
          hasAccessToken: !!accessToken,
          localSessionUser: localSession?.user?.email
        });
        
        if (!localSession && !accessToken) {
          logger.warn('[OnboardingPage] No local session found, checking server');
        }
        
        console.log('[OnboardingPage] Fetching server session...');
        const sessionResponse = await fetch('/api/auth/session', {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });
        
        console.log('[OnboardingPage] Session response:', {
          ok: sessionResponse.ok,
          status: sessionResponse.status
        });
        
        if (!sessionResponse.ok || sessionResponse.status === 204) {
          // If no server session and no local session, redirect to login
          if (!localSession) {
            logger.warn('[OnboardingPage] No active session, redirecting to login');
            router.push('/auth/email-signin');
            return;
          }
        }

        let session = null;
        try {
          if (sessionResponse.ok && sessionResponse.status !== 204) {
            session = await sessionResponse.json();
          } else {
            session = localSession;
          }
        } catch (jsonError) {
          console.error('[OnboardingPage] Error parsing session JSON:', jsonError);
          session = localSession;
        }
        
        console.log('[OnboardingPage] Final session data:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email
        });
        
        if (!session || !session.user) {
          logger.warn('[OnboardingPage] Invalid session data, redirecting to login');
          router.push('/auth/email-signin');
          return;
        }

        // Check if user has already completed onboarding
        console.log('[OnboardingPage] Checking profile for onboarding status...');
        const profileResponse = await fetch('/api/auth/profile', {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });
        
        console.log('[OnboardingPage] Profile response:', {
          ok: profileResponse.ok,
          status: profileResponse.status
        });
        
        if (profileResponse.ok) {
          let profile = null;
          try {
            profile = await profileResponse.json();
            console.log('[OnboardingPage] Profile data:', {
              hasProfile: !!profile,
              onboardingCompleted: profile?.onboardingCompleted,
              tenantId: profile?.tenantId,
              needsOnboarding: profile?.needsOnboarding
            });
          } catch (profileError) {
            console.error('[OnboardingPage] Error parsing profile JSON:', profileError);
          }
          
          if (profile && profile.onboardingCompleted === true && profile.tenantId) {
            logger.info('[OnboardingPage] User already completed onboarding, redirecting to dashboard');
            router.push(`/tenant/${profile.tenantId}/dashboard`);
            return;
          }
        }

        logger.info('[OnboardingPage] User authenticated, showing onboarding form');
      } catch (error) {
        console.error('[OnboardingPage] Full error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        logger.error('[OnboardingPage] Error checking auth:', error);
        router.push('/auth/email-signin');
      }
    };

    checkAuth();
  }, [router]);

  return <SimplifiedOnboardingForm />;
}