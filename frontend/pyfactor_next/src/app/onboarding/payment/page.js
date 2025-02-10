// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/onboarding/payment/page.js
'use client';

import React, { Suspense } from 'react';
import { Payment } from '../components/steps';
import { OnboardingLayout } from '../components/layout';
import { STEP_METADATA } from '../components/registry';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { logger } from '@/utils/logger';

const PaymentFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <LoadingSpinner size="large" />
  </div>
);

const PaymentContent = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  React.useEffect(() => {
    const logPageView = () => {
      logger.debug('Payment page mounted:', {
        sessionStatus: status,
        hasUser: !!session?.user,
        timestamp: new Date().toISOString(),
      });
    };

    logPageView();
  }, [session, status]);

  if (status === 'loading') {
    return <PaymentFallback />;
  }

  if (status === 'unauthenticated') {
    logger.warn('Unauthenticated access to payment page');
    router.replace('/auth/signin');
    return null;
  }

  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="p-4">
          <h2 className="text-xl font-bold text-red-600">
            Error Loading Payment
          </h2>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    >
      <Payment metadata={STEP_METADATA.PAYMENT} />
    </ErrorBoundary>
  );
};

const PaymentPage = () => {
  return (
    <OnboardingLayout>
      <Suspense fallback={<PaymentFallback />}>
        <PaymentContent />
      </Suspense>
    </OnboardingLayout>
  );
};

// PropTypes are not needed for Pages in Next.js 13+

export default PaymentPage;
