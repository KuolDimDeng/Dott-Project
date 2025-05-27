'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';

export function AuthLoadingState() {
  const router = useRouter();
  const { status, data: session } = useSession();

  if (status === 'loading') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
      >
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-main"></div>
        <p className="text-gray-600 dark:text-gray-300">
          Loading...
        </p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    logger.debug('User not authenticated, redirecting to sign in');
    router.push('/auth/signin');
    return null;
  }

  if (status === 'authenticated') {
    // Get onboarding status and setupDone flag, normalize to lowercase for consistency
    const onboardingStatus = (session.user['custom:onboarding'] || '').toLowerCase();
    const setupDone = (session.user['custom:setupdone'] || '').toLowerCase();
    
    logger.debug('Checking authentication and onboarding status', {
      onboardingStatus,
      setupDone,
      isComplete: onboardingStatus === 'complete' || setupDone === 'true',
      userId: session.user.sub || session.user.id,
      email: session.user.email
    });

    // Only redirect to dashboard if onboarding is complete OR setup is done
    if (onboardingStatus === 'complete' || setupDone === 'true') {
      logger.debug('User authenticated with completed onboarding, proceeding to dashboard');
      router.push('/dashboard');
      return null;
    }
    
    // Fix for free plan users stuck in subscription status
    const userPlan = (session.user['custom:subplan'] || session.user['custom:subscription_plan'] || '').toLowerCase();
    const isFreePlan = userPlan === 'free' || userPlan === 'basic';
    
    if (onboardingStatus === 'subscription' && isFreePlan) {
      logger.info('Detected free plan user stuck in subscription status, fixing to complete and redirecting to dashboard');
      
      // Update Cognito attributes in the background
      try {
        setTimeout(async () => {
          const { updateUserAttributes } = await import('@/config/amplifyUnified');
          await updateUserAttributes({
            userAttributes: {
              'custom:onboarding': 'complete',
              'custom:setupdone': 'true'
            }
          });
          logger.debug('Fixed free plan user status to complete');
        }, 100);
      } catch (e) {
        logger.error('Error fixing free plan user status:', e);
      }
      
      // Redirect to dashboard immediately
      router.push('/dashboard');
      return null;
    }
    
    // If onboarding is not complete or setup is not done, redirect to appropriate step
    logger.debug('Onboarding incomplete, redirecting to appropriate step', {
      status: onboardingStatus,
      setupDone
    });
    
    // Map onboarding status to the appropriate route
    const onboardingStepMap = {
      'not_started': 'business-info',
      'not-started': 'business-info',
      'business_info': 'business-info',
      'business-info': 'business-info',
      'subscription': 'subscription',
      'payment': 'payment',
      'setup': 'setup',
      'database_setup': 'database-setup',
      'database-setup': 'database-setup',
      'review': 'review'
    };
    
    // Get the appropriate step or default to business-info
    const redirectStep = onboardingStepMap[onboardingStatus] || 'business-info';
    
    router.push(`/onboarding/${redirectStep}`);
    return null;
  }

  return null;
}
