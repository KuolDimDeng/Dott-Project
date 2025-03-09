'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import SignInForm from '@/components/auth/SignInForm';
import { getCurrentUser } from '@aws-amplify/auth';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // Check if user is already signed in
        const currentUser = await getCurrentUser();
        
        if (currentUser) {
          logger.debug('[SignInPage] User already signed in, checking status');
          
          try {
            const onboardingStatus = currentUser.attributes?.['custom:onboarding'];
            
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
                return;
              case 'SUBSCRIPTION':
                logger.debug('[SignInPage] Redirecting to subscription page');
                router.push('/onboarding/subscription');
                return;
              case 'PAYMENT':
                logger.debug('[SignInPage] Redirecting to payment page');
                router.push('/onboarding/payment');
                return;
              case 'SETUP':
                logger.debug('[SignInPage] Redirecting to setup page');
                router.push('/onboarding/setup');
                return;
              case 'COMPLETE':
                logger.debug('[SignInPage] User onboarded, redirecting to dashboard');
                router.push('/dashboard');
                return;
              default:
                logger.debug('[SignInPage] Unknown onboarding status, showing sign in form');
                break;
            }
          } catch (attributeError) {
            logger.error('[SignInPage] Error getting user attributes:', attributeError);
            // Continue to show sign in form
          }
        }
      } catch (error) {
        logger.debug('[SignInPage] No active session, showing sign in form');
        // Not signed in, show the sign in form
      } finally {
        setIsLoading(false);
      }
    };

    checkUserStatus();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Please try again later or contact support if the problem persists.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
