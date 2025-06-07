import appCache from '../utils/appCache';

'use client';

import { appCache } from '../utils/appCache';
import { useEffect, useState } from 'react';
import { appCache } from '../utils/appCache';
import { useRouter } from 'next/navigation';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/logger';
import { appCache } from '../utils/appCache';
import { CircularProgress } from '@/components/ui/TailwindComponents';

export default function FreePlanTransition() {
  const router = useRouter();
  
  // For RLS implementation, we don't need the loading screen
  // Just immediately redirect to setup page
  useEffect(() => {
    logger.debug('[FreePlanTransition] Free plan selected, redirecting immediately to setup');
    
    // Set additional cookies for setup
    if (typeof document !== 'undefined') {
      document.cookie = `setupSkipDatabaseCreation=true; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
      document.cookie = `setupUseRLS=true; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
      document.cookie = `skipSchemaCreation=true; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
    }
    
    // Store in app cache instead of localStorage for redundancy
    try {
      if (typeof window !== 'undefined') {
        appCache.getAll() = appCache.getAll() || {};
        appCache.getAll().setup = appCache.getAll().setup || {};
        
        appCache.set('setup.skipDatabaseCreation', true);
        appCache.set('setup.useRLS', true);
        appCache.set('setup.skipSchemaCreation', true);
      }
    } catch (e) {
      // Ignore storage errors
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