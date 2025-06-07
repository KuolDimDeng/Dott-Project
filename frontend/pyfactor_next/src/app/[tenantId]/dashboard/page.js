import appCache from '../utils/appCache';

'use client';

import { appCache } from '../utils/appCache';
import { useEffect, useState } from 'react';
import { appCache } from '../utils/appCache';
import { useParams, useSearchParams } from 'next/navigation';
import { appCache } from '../utils/appCache';
import { logger } from '@/utils/clientLogger';
import DashboardLoader from '@/components/DashboardLoader';
import DashboardContent from '@/components/Dashboard/DashboardContent';
import { appCache } from '../utils/appCache';
import { monitoredFetch } from '@/utils/networkMonitor';

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
  const [networkError, setNetworkError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Extract tenant ID from URL parameters
  const tenantId = params?.tenantId;
  
  // Check if we have a direct flag to prevent redirect loops
  const isDirect = searchParams?.get('direct') === 'true';
  const fromSignIn = searchParams?.get('fromSignIn') === 'true';
  
  // Reset dashboard state when triggered
  const resetDashboard = () => {
    setError(null);
    setNetworkError(false);
    setRetryCount(prev => prev + 1);
    setIsLoading(true);
    
    // Force a clean reload after a short delay
    if (retryCount >= 3) {
      window.location.reload();
    }
  };
  
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
              'custom:tenant_ID': tenantId,
              'custom:businessid': tenantId
            }
          });
          logger.info('[TenantDashboard] Successfully updated Cognito attributes with tenant ID');
          
          // Perform a health check to ensure connectivity
          try {
            const healthCheck = await monitoredFetch('/api/health', {
              method: 'HEAD',
              cache: 'no-store',
              headers: { 'Cache-Control': 'no-cache' },
              timeout: 3000 // 3-second timeout
            });
            
            if (!healthCheck.ok) {
              logger.warn('[TenantDashboard] Health check failed, but continuing anyway');
            }
          } catch (healthError) {
            logger.warn('[TenantDashboard] Health check error, but continuing:', healthError);
            // Don't block the dashboard load for health check errors
          }
          
          // Store tenant ID in app cache for resilience
          if (typeof window !== 'undefined') {
            appCache.getAll() = appCache.getAll() || {};
            appCache.getAll().tenant = appCache.getAll().tenant || {};
            appCache.get('tenant.id') = tenantId;
          }
        } catch (cognitoError) {
          // Log but continue - we can still load the dashboard even if attribute update fails
          logger.warn('[TenantDashboard] Could not update Cognito attributes:', cognitoError);
          
          // Check if we have a network error
          if (cognitoError.message && (
              cognitoError.message.includes('NetworkError') || 
              cognitoError.message.includes('Network Error') ||
              cognitoError.message.includes('Failed to fetch')
          )) {
            setNetworkError(true);
          }
        }
      };
      
      updateCognitoAttributes();
      
      // Load the dashboard component after a short delay to allow everything to initialize
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    } catch (error) {
      logger.error('[TenantDashboard] Error initializing tenant dashboard:', error);
      setError('Error initializing tenant dashboard');
      setIsLoading(false);
      
      // Check if we have a network error
      if (error.message && (
          error.message.includes('NetworkError') || 
          error.message.includes('Network Error') ||
          error.message.includes('Failed to fetch')
      )) {
        setNetworkError(true);
      }
    }
  }, [tenantId, isDirect, fromSignIn, retryCount]);
  
  if (isLoading) {
    return <DashboardLoader message={`Initializing tenant dashboard for ${tenantId}...`} />;
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Dashboard Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          {networkError && (
            <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="text-yellow-800 font-semibold mb-2">Network Connection Issue</h3>
              <p className="text-sm text-yellow-700 mb-3">
                Unable to connect to the server. Please check your internet connection.
              </p>
              <ul className="text-sm list-disc list-inside text-yellow-700 mb-4">
                <li>Verify your network connection is stable</li>
                <li>Check if backend server is running</li>
                <li>Make sure HTTPS certificates are properly installed</li>
              </ul>
            </div>
          )}
          <p className="text-gray-500 mb-6 text-sm">Tenant ID: {tenantId || 'None'}</p>
          <button
            onClick={resetDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-3"
          >
            Retry Loading
          </button>
          <button
            onClick={() => window.location.href = '/dashboard?fromSignIn=true&reset=true'}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
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