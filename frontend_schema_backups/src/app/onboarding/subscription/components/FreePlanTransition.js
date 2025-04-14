'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { CircularProgress } from '@/components/ui/TailwindComponents';
import { setCacheValue } from '@/utils/appCache';
import { updateUserAttributes } from '@/config/amplifyUnified';

export default function FreePlanTransition() {
  const router = useRouter();
  
  // For RLS implementation, we don't need the loading screen
  // Just immediately redirect to setup page
  useEffect(() => {
    logger.debug('[FreePlanTransition] Free plan selected, redirecting immediately to setup');
    
    // Set values in AppCache
    setCacheValue('setupSkipDatabaseCreation', 'true', { ttl: 7 * 24 * 60 * 60 * 1000 }); // 7 days
    setCacheValue('setupUseRLS', 'true', { ttl: 7 * 24 * 60 * 60 * 1000 });
    setCacheValue('skipSchemaCreation', 'true', { ttl: 7 * 24 * 60 * 60 * 1000 });
    
    // Update Cognito attributes for persistence
    try {
      updateUserAttributes({
        userAttributes: {
          'custom:setupSkipDatabaseCreation': 'true',
          'custom:setupUseRLS': 'true',
          'custom:skipSchemaCreation': 'true',
          'custom:subplan': 'free',
          'custom:subscriptioninterval': 'monthly'
        }
      }).catch(err => logger.warn('[FreePlanTransition] Failed to update Cognito attributes:', err));
    } catch (cognitoError) {
      logger.warn('[FreePlanTransition] Error updating Cognito attributes:', cognitoError);
    }
    
    // Use immediate navigation without timeout for RLS
    window.location.href = '/onboarding/setup?skipLoading=true&useRLS=true';
  }, []);
  
  // Minimal UI shown briefly before redirect
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <CircularProgress size="large" className="mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Redirecting to setup...
        </h2>
        <p className="text-gray-600">
          Please wait a moment.
        </p>
      </div>
    </div>
  );
} 