'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';
import { isValidUUID, verifyTenantId, storeTenantId } from '@/utils/tenantUtils';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import DashboardWrapper from '@/app/dashboard/DashboardWrapper';

/**
 * TenantDashboardPage
 * 
 * Handles tenant-specific dashboard URLs in the pattern:
 * /{tenantId}/dashboard
 * 
 * Features:
 * 1. Extracts tenant ID from URL path parameter
 * 2. Validates tenant ID format and access permissions
 * 3. Stores tenant ID in client storage for persistence
 * 4. Redirects to correct tenant ID if mismatch detected
 * 5. Passes tenant context to dashboard components
 */
export default function TenantDashboardPage() {
  const params = useParams();
  const { tenantId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifiedTenantId, setVerifiedTenantId] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isDevelopment] = useState(process.env.NODE_ENV === 'development');
  
  // Extract query parameters for dashboard initialization
  const newAccount = searchParams.get('newAccount') === 'true';
  const plan = searchParams.get('plan');
  const freePlan = searchParams.get('freePlan') === 'true';
  
  useEffect(() => {
    // Log the current state for debugging
    logger.info('[TenantDashboard] Initializing dashboard page', {
      tenantId,
      newAccount,
      plan,
      freePlan,
      isDevelopment,
      pathname: window.location.pathname
    });
    
    // Store tenantId in localStorage immediately for persistence
    // This ensures the ID is available even if verification fails
    if (tenantId && isValidUUID(tenantId)) {
      logger.debug('[TenantDashboard] Storing tenant ID in localStorage');
      storeTenantId(tenantId);
    }
    
    // Validate and verify tenant ID on mount
    const validateTenant = async () => {
      setLoading(true);
      
      // First check if tenant ID is a valid UUID
      if (!tenantId || !isValidUUID(tenantId)) {
        logger.error('[TenantDashboard] Invalid tenant ID format', { tenantId });
        
        // In development mode, allow any tenant ID format
        if (isDevelopment) {
          logger.warn('[TenantDashboard] Development mode: allowing access with invalid tenant ID');
          setVerifiedTenantId(tenantId);
          setTenant({
            id: tenantId,
            name: `Dev Tenant`,
            status: 'active',
            devMode: true
          });
          setLoading(false);
          return;
        }
        
        setError('Invalid tenant ID format');
        setLoading(false);
        return;
      }
      
      try {
        // Verify tenant ID with backend
        logger.debug('[TenantDashboard] Verifying tenant ID with backend', { tenantId });
        const result = await verifyTenantId(tenantId);
        
        if (!result.valid) {
          logger.error('[TenantDashboard] Tenant verification failed', result);
          
          // In development mode, proceed anyway with a mock tenant
          if (isDevelopment) {
            logger.warn('[TenantDashboard] Development mode: allowing access despite verification failure');
            setVerifiedTenantId(tenantId);
            setTenant({
              id: tenantId,
              name: `Dev Tenant`,
              status: 'active',
              devMode: true
            });
            setLoading(false);
            return;
          }
          
          setError(result.error || 'Tenant verification failed');
          setLoading(false);
          return;
        }
        
        logger.info('[TenantDashboard] Tenant verified successfully', result);
        
        // Check for tenant mismatch
        if (result.correctTenantId && result.correctTenantId !== tenantId) {
          // Redirect to correct tenant ID
          logger.info(`[TenantDashboard] Redirecting to correct tenant ID: ${result.correctTenantId}`);
          
          // Preserve search params in redirect
          const queryString = searchParams.toString();
          const redirectPath = `/${result.correctTenantId}/dashboard${queryString ? `?${queryString}` : ''}`;
          
          router.replace(redirectPath);
          return;
        }
        
        // Store verified tenant ID and info
        setVerifiedTenantId(result.correctTenantId || tenantId);
        setTenant(result.tenant || { id: tenantId });
        setLoading(false);
        
      } catch (error) {
        logger.error('[TenantDashboard] Error verifying tenant:', error);
        
        // In development mode, proceed anyway
        if (isDevelopment) {
          logger.warn('[TenantDashboard] Development mode: allowing access despite error');
          setVerifiedTenantId(tenantId);
          setTenant({
            id: tenantId,
            name: `Dev Tenant (Error)`,
            status: 'active',
            devMode: true
          });
          setLoading(false);
          return;
        }
        
        setError('Error connecting to server. Please try again.');
        setLoading(false);
      }
    };
    
    validateTenant();
  }, [tenantId, router, searchParams, isDevelopment, newAccount, plan, freePlan]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
          {isDevelopment && <p className="text-xs text-gray-400 mt-2">Tenant ID: {tenantId}</p>}
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-4 justify-center">
            <button 
              onClick={() => router.push('/auth/signin')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Login
            </button>
            <button 
              onClick={() => router.push('/onboarding/subscription')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Choose Plan
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render dashboard with verified tenant context
  return (
    <ErrorBoundary fallback={<div>Something went wrong in the dashboard</div>}>
      <ToastProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            {/* Render tenant ID indicator in dev environments */}
            {isDevelopment && (
              <div className="fixed bottom-0 right-0 bg-gray-800 text-white px-3 py-1 text-xs opacity-60 z-50">
                Tenant: {verifiedTenantId}
                {tenant?.devMode && " (Dev Mode)"}
              </div>
            )}
            <DashboardWrapper 
              tenantId={verifiedTenantId}
              tenant={tenant}
              newAccount={newAccount}
              plan={plan}
              freePlan={freePlan}
            />
          </div>
        </NotificationProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}