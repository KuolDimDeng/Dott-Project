'use client';


import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import dynamic from 'next/dynamic';
import DashboardLoader from '@/components/DashboardLoader';
import { saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';
import { setCacheValue } from @/utils/appCache';

// Dynamically import DashboardContent to avoid SSR issues
const DashboardContent = dynamic(
  () => import('@/app/dashboard/DashboardContent'),
  { ssr: false, loading: () => <DashboardLoader message="Loading dashboard..." /> }
);

/**
 * Tenant-specific dashboard home component
 * Used in the tenant-specific dashboard route: /{tenantId}/dashboard
 * 
 * @param {Object} props
 * @param {string} props.tenantId - The tenant ID from the URL
 */
export default function DashboardHome({ tenantId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Parse URL parameters
  const newAccount = searchParams.get('newAccount') === 'true';
  const plan = searchParams.get('plan');
  const freePlan = searchParams.get('freePlan') === 'true';
  const setupStatus = searchParams.get('setupStatus') || 'pending';
  
  useEffect(() => {
    if (!tenantId) {
      setError('No tenant ID provided');
      setIsLoading(false);
      return;
    }
    
    logger.info(`[DashboardHome] Initializing tenant-specific dashboard for: ${tenantId}`);
    
    // Setup an async function to save the tenant ID in Cognito and AppCache
    const saveTenantPreference = async () => {
      try {
        // Update AppCache for immediately availability
        setCacheValue('tenant_id', tenantId);
        setCacheValue('business_id', tenantId); // For backward compatibility
        
        // Save to Cognito for persistence
        await saveUserPreference(PREF_KEYS.TENANT_ID, tenantId);
        logger.debug(`[DashboardHome] Saved tenant ID to Cognito: ${tenantId}`);
      } catch (error) {
        logger.error(`[DashboardHome] Error saving tenant ID to preferences:`, error);
      }
    };
    
    // Call the async function
    saveTenantPreference();
    
    // Verify we have the direct=true param to prevent redirect loops
    if (!searchParams.has('direct')) {
      const url = new URL(window.location.href);
      url.searchParams.set('direct', 'true');
      logger.debug(`[DashboardHome] Adding direct=true param to prevent redirect loops`);
      router.replace(url.toString());
      return;
    }
    
    // Set loading state to false after initialization
    setIsLoading(false);
  }, [tenantId, router, searchParams]);
  
  if (isLoading) {
    return <DashboardLoader message="Initializing dashboard..." />;
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Pass tenant ID and other props to the DashboardContent component
  return (
    <DashboardContent
      tenantId={tenantId}
      newAccount={newAccount}
      plan={plan}
      freePlan={freePlan}
      setupStatus={setupStatus}
    />
  );
} 