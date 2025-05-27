// Dashboard page (Client Component)

'use client';

import React, { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import DashboardLoader from '@/components/DashboardLoader';
import MiddlewareHeaderHandler from '@/components/MiddlewareHeaderHandler';
import { useRouter } from 'next/navigation';
import { updateTenantIdInCognito } from '@/utils/tenantUtils';
import { logger } from '@/lib/logger';

/**
 * Dashboard Page Component
 *
 * This is a redirect component that uses client-side navigation
 * instead of server-side redirects to avoid NEXT_REDIRECT errors
 */

// Dashboard metadata - moved to layout.js since metadata can't be exported from client components
// export const metadata = {
//   title: 'Dashboard | Dott Business Management',
//   description: 'Loading your dashboard...'
// };

// Client component that handles navigation
export default function DashboardPage() {
  // Use the useSearchParams hook instead of accessing props directly
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Parse tenant ID from URL parameters using the get method
  const tenantId = searchParams.get('tenantId') || null;
  const fromSignIn = searchParams.get('fromSignIn') === 'true';
  const fromAuth = searchParams.get('fromAuth') === 'true';
  const reset = searchParams.get('reset') === 'true';
  
  // Log initialization information
  console.info(`Dashboard: tenantId=${tenantId}, fromSignIn=${fromSignIn}`);
  
  // Determine the redirect path based on tenant ID
  let redirectPath = '';
  let message = 'Loading your dashboard...';
  
  const [isLoading, setIsLoading] = useState(true);
  const [initializationComplete, setInitializationComplete] = useState(false);

  useEffect(() => {
    const handleInitialization = async () => {
      if (initializationComplete) return;
      setIsLoading(true);
      
      try {
        logger.debug('[Dashboard] Initializing dashboard');
        
        // Check for temp_tenant in URL (fallback from subscription page)
        const searchParams = new URLSearchParams(window.location.search);
        const tempTenantId = searchParams.get('temp_tenant');
        
        if (tempTenantId) {
          logger.info('[Dashboard] Found temporary tenant ID in URL:', tempTenantId);
          
          // Check if it's already a valid UUID
          const { isValidUUID } = await import('@/utils/tenantUtils');
          
          if (isValidUUID(tempTenantId)) {
            // It's already a valid UUID, use it directly
            logger.info('[Dashboard] Temporary tenant ID is valid UUID format:', tempTenantId);
            await updateTenantIdInCognito(tempTenantId);
            router.push(`/${tempTenantId}/dashboard`);
            return;
          } else {
            // It's not a valid UUID, need to create a proper one
            logger.warn('[Dashboard] Temporary tenant ID is not valid UUID format:', tempTenantId);
            
            // Try to create a permanent tenant
            try {
              // Get business info for API call
              const { fetchUserAttributes } = await import('@/config/amplifyUnified');
              const userAttributes = await fetchUserAttributes();
              
              const createResponse = await fetch('/api/tenant/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  tempTenantId: tempTenantId,
                  businessName: userAttributes['custom:businessname'] || '',
                  businessType: userAttributes['custom:businesstype'] || 'Other'
                }),
              });
              
              if (createResponse.ok) {
                const data = await createResponse.json();
                if (data.success && data.tenantId) {
                  // Store the new tenant ID in Cognito
                  await updateTenantIdInCognito(data.tenantId);
                  
                  // Clean URL and redirect to tenant-specific dashboard
                  logger.info('[Dashboard] Created permanent tenant, redirecting:', data.tenantId);
                  router.push(`/${data.tenantId}/dashboard`);
                  return;
                }
              }
            } catch (createError) {
              logger.error('[Dashboard] Error creating permanent tenant:', createError);
              // Continue with the fallback dashboard view
            }
          }
        }
        
        if (reset) {
          return (
            <div>
              <MiddlewareHeaderHandler />
              <DashboardLoader message="Resetting navigation..." />
              <meta httpEquiv="x-reset-navigation" content="true" />
              <meta httpEquiv="x-tenant-id" content={tenantId || ''} />
            </div>
          );
        }
        
        if (tenantId) {
          // Build query string for tenant-specific URL
          const queryString = new URLSearchParams({
            fromSignIn: 'true',
            direct: 'true'
          }).toString();
          
          // Redirect to tenant-specific dashboard
          redirectPath = `/${tenantId}/dashboard?${queryString}`;
          message = 'Loading your dashboard...';
        } else if (!fromSignIn && !fromAuth) {
          // No tenant ID found, redirect to sign-in
          redirectPath = '/auth/signin?error=no_tenant_id';
          message = 'Redirecting to sign in...';
        } else {
          // From sign-in flow with no tenant ID yet
          redirectPath = `/dashboard?fromSignIn=true`;
          message = 'Setting up your dashboard...';
        }
        
      } catch (error) {
        logger.error('[Dashboard] Initialization error:', error);
      } finally {
        setIsLoading(false);
        setInitializationComplete(true);
      }
    };
    
    handleInitialization();
  }, [router, reset, tenantId, fromSignIn, fromAuth]);
  
  return (
    <div>
      <MiddlewareHeaderHandler />
      <DashboardLoader message={message} />
      <meta httpEquiv="x-should-redirect" content="true" />
      <meta httpEquiv="x-redirect-path" content={redirectPath} />
      {tenantId && <meta httpEquiv="x-tenant-id" content={tenantId} />}
    </div>
  );
}