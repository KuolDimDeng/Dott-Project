'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/clientLogger';
import DashboardLoader from '@/components/DashboardLoader';
import DashboardContent from '@/components/Dashboard/DashboardContent';

/**
 * Tenant-specific Dashboard Page Component
 * 
 * This is a client component that handles tenant-specific dashboard rendering
 */
export default function TenantDashboard() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Extract tenant ID from URL parameters
  const tenantId = params?.tenantId;
  
  // Check if we have a direct flag to prevent redirect loops
  const isDirect = searchParams?.get('direct') === 'true';
  const fromSignIn = searchParams?.get('fromSignIn') === 'true';
  
  useEffect(() => {
    if (!tenantId) {
      logger.error('[TenantDashboard] No tenant ID found in URL params');
      setError('Missing tenant ID in URL parameters');
      setIsLoading(false);
      return;
    }

    logger.info(`[TenantDashboard] Processing tenant-specific dashboard for: ${tenantId}`);
    
    // Only use Cognito attributes for tenant ID
    try {
      // Update Cognito attributes with the tenant ID
      const updateCognitoAttributes = async () => {
        try {
          const { updateUserAttributes } = await import('aws-amplify/auth');
          await updateUserAttributes({
            userAttributes: {
              'custom:tenant_id': tenantId,
              'custom:businessid': tenantId
            }
          });
          logger.info('[TenantDashboard] Successfully updated Cognito attributes with tenant ID');
        } catch (cognitoError) {
          logger.warn('[TenantDashboard] Could not update Cognito attributes:', cognitoError);
          // Continue anyway as the tenant ID is in the URL
        }
      };
      
      updateCognitoAttributes();
      
      // Load the dashboard component after a short delay to allow everything to initialize
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      logger.error('[TenantDashboard] Error initializing tenant dashboard:', error);
      setError('Error initializing tenant dashboard');
      setIsLoading(false);
    }
  }, [tenantId, isDirect, fromSignIn]);
  
  if (isLoading) {
    return <DashboardLoader message={`Initializing tenant dashboard for ${tenantId}...`} />;
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Dashboard Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <p className="text-gray-500 mb-6 text-sm">Tenant ID: {tenantId || 'None'}</p>
          <button
            onClick={() => window.location.href = '/dashboard?fromSignIn=true&reset=true'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Render the actual dashboard component with the tenant ID
  return <DashboardContent tenantId={tenantId} />;
}