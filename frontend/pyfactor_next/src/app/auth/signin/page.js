'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import SignInForm from '@/components/auth/SignInForm';
import { useAuthContext } from '@/contexts/AuthContext';
import { getCurrentUser } from '@aws-amplify/auth';

export default function SignInPage() {
  const router = useRouter();
  const { hasSession, user } = useAuthContext();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!hasSession) return;

      try {
        logger.debug('[SignInPage] Checking user status');
        const currentUser = await getCurrentUser();
        const onboardingStatus = currentUser.attributes['custom:onboarding'];

        logger.debug('[SignInPage] User status:', {
          onboardingStatus,
          attributes: currentUser.attributes
        });

        // Handle different onboarding statuses
        switch (onboardingStatus) {
          case 'NOT_STARTED':
          case 'IN_PROGRESS':
          case 'BUSINESS_INFO':
            logger.debug(`[SignInPage] Redirecting to business info for ${onboardingStatus} status`);
            router.push('/onboarding/business-info');
            break;
          case 'SUBSCRIPTION':
            logger.debug('[SignInPage] Redirecting to subscription page');
            router.push('/onboarding/subscription');
            break;
          case 'PAYMENT':
            logger.debug('[SignInPage] Redirecting to payment page');
            router.push('/onboarding/payment');
            break;
          case 'SETUP':
            logger.debug('[SignInPage] Redirecting to setup page');
            router.push('/onboarding/setup');
            break;
          case 'COMPLETE':
            logger.debug('[SignInPage] User onboarded, redirecting to dashboard');
            router.push('/dashboard');
            break;
          default:
            logger.warn('[SignInPage] Unknown onboarding status:', onboardingStatus);
            router.push('/onboarding/business-info');
        }
      } catch (error) {
        logger.error('[SignInPage] Error checking user status:', error);
      }
    };

    checkUserStatus();
  }, [hasSession, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
