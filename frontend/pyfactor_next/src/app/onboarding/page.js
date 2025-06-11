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
        // First check local session
        const localSession = sessionManager.getSession();
        const accessToken = sessionManager.getAccessToken();
        
        if (!localSession && !accessToken) {
          logger.warn('[OnboardingPage] No local session found, checking server');
        }
        
        const sessionResponse = await fetch('/api/auth/session', {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });
        
        if (!sessionResponse.ok || sessionResponse.status === 204) {
          // If no server session and no local session, redirect to login
          if (!localSession) {
            logger.warn('[OnboardingPage] No active session, redirecting to login');
            router.push('/auth/email-signin');
            return;
          }
        }

        const session = localSession || await sessionResponse.json();
        if (!session || !session.user) {
          logger.warn('[OnboardingPage] Invalid session data, redirecting to login');
          router.push('/auth/email-signin');
          return;
        }

        // Check if user has already completed onboarding
        const profileResponse = await fetch('/api/auth/profile');
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          
          if (profile.onboardingCompleted === true && profile.tenantId) {
            logger.info('[OnboardingPage] User already completed onboarding, redirecting to dashboard');
            router.push(`/tenant/${profile.tenantId}/dashboard`);
            return;
          }
        }

        logger.info('[OnboardingPage] User authenticated, showing onboarding form');
      } catch (error) {
        logger.error('[OnboardingPage] Error checking auth:', error);
        router.push('/auth/email-signin');
      }
    };

    checkAuth();
  }, [router]);

  return <SimplifiedOnboardingForm />;
}