import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSetupPolling } from '@/hooks/useSetupPolling';
import { SetupLoadingState } from '@/components/LoadingState/SetupLoadingState';
import { logger } from '@/utils/logger';

function Setup() {
  const router = useRouter();
  const { status, error, isPolling, startPolling, completeSetup } =
    useSetupPolling();

  useEffect(() => {
    // Start polling when component mounts
    startPolling().catch((error) => {
      logger.error('Failed to start setup:', error);
    });

    // Cleanup polling when component unmounts
    return () => {
      if (isPolling) {
        completeSetup().catch((error) => {
          logger.error('Failed to complete setup:', error);
        });
      }
    };
  }, [startPolling, completeSetup, isPolling]);

  useEffect(() => {
    // Redirect to success page when setup is complete
    if (status?.status === 'complete') {
      router.push('/onboarding/success');
    }
  }, [status, router]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Setting Up Your Account
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <SetupLoadingState status={status} />
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-b-lg">{error}</div>
        )}
      </div>
    </div>
  );
}

export { Setup };
export default Setup;
