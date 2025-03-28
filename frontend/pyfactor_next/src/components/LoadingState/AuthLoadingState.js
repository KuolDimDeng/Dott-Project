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
    const onboardingStatus = session.user['custom:onboarding'];

    if (onboardingStatus !== 'complete') {
      logger.debug('Onboarding incomplete, redirecting to onboarding', {
        status: onboardingStatus,
      });
      router.push(`/onboarding/${onboardingStatus || 'business-info'}`);
      return null;
    }

    logger.debug('User authenticated and onboarding complete');
    router.push('/dashboard');
    return null;
  }

  return null;
}
