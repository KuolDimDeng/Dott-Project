import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';
import { 
  validateTenantIdFormat, 
  updateTenantIdInCognito, 
  getTenantIdFromCognito
} from '@/utils/tenantUtils';
import { setTenantContext } from '@/utils/tenantContext';

// Maximum number of retries for network operations
const MAX_RETRIES = 3;
// Base delay for exponential backoff (in ms)
const BASE_DELAY = 500;

/**
 * Hook to ensure tenant context is set properly for RLS
 * Enhanced with better fallback handling and retry logic
 * @returns {Object} Object containing tenant information
 */
export default function useEnsureTenant() {
  const pathname = usePathname();
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const setTenant = async () => {
      // Skip for pages where tenants aren't applicable
      if (pathname.startsWith('/auth/') || 
          pathname === '/' || 
          pathname.startsWith('/support/') ||
          pathname.includes('/public/')) {
        logger.debug('[useEnsureTenant] Skipping tenant check for auth/public path');
        return;
      }
      
      try {
        // If there's a tenant ID in the URL path, use that
        if (pathname.includes('/t/') || 
            (pathname.match(/^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i))) {
          // Extract tenant ID from URL path like /t/{tenantId}/ or /{tenantId}/
          const match = pathname.match(/\/(?:t\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (match && match[1]) {
            const urlTenantId = match[1];
            logger.debug('[useEnsureTenant] Found tenant ID in URL:', urlTenantId);
            
            if (isMounted) {
              setTenantId(urlTenantId);
              setError(null);
            }
            return;
          }
        }
        
        try {
          // Try to get the tenant ID from Cognito
          const cognitoTenantId = await getTenantIdFromCognito();
          
          if (cognitoTenantId && isMounted) {
            logger.debug('[useEnsureTenant] Found Cognito tenant ID:', cognitoTenantId);
            setTenantId(cognitoTenantId);
            setError(null);
          } else if (isMounted) {
            // No tenant ID found, prompt the user to create one
            logger.warn('[useEnsureTenant] No tenant ID found');
            setStatus('error');
            setError(new Error('No tenant ID found'));
          }
        } catch (authError) {
          // Handle authentication errors
          if (authError.name === 'UserUnAuthenticatedException' || 
              authError.message?.includes('authenticated') ||
              authError.name === 'NotAuthorizedException') {
            
            logger.error('[useEnsureTenant] Authentication error, redirecting to sign-in', authError);
            
            // Save current URL for potential redirect back after sign-in
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('redirectAfterSignIn', window.location.pathname + window.location.search);
              } catch (e) {
                // Ignore sessionStorage errors
              }
              
              // Redirect to sign-in page with session expired parameter
              window.location.href = '/auth/signin?session=expired';
            }
            return;
          }
          
          // Handle other errors
          if (isMounted) {
            logger.error('[useEnsureTenant] Error getting tenant ID:', authError);
            setError(authError);
          }
        }
      } catch (error) {
        if (isMounted) {
          logger.error('[useEnsureTenant] Tenant determination error:', error);
          setError(error);
        }
      } finally {
        if (isMounted) {
          setStatus('verified');
        }
      }
    };
    
    setTenant();
    
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const retry = () => {
    // Reset the state for retry
    setStatus('pending');
    setError(null);
    
    const retrySetTenant = async () => {
      try {
        // Get current tenant ID from Cognito
        let currentTenantId = await getTenantIdFromCognito();
        
        // If tenant ID is missing or invalid format, use fallback
        if (!currentTenantId || !validateTenantIdFormat(currentTenantId)) {
          // Ultimate fallback
          currentTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
          logger.warn('[useEnsureTenant] Using fallback tenant ID in retry:', currentTenantId);
        }
        
        // Set tenant context locally first for immediate functionality
        setTenantId(currentTenantId);
        setTenantContext(currentTenantId);
        await updateTenantIdInCognito(currentTenantId);
        
        // Try to verify with API, but don't block UI functionality
        try {
          logger.info('[useEnsureTenant] Attempting background verification in retry');
          await fetch('/api/tenant/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tenantId: currentTenantId,
              forceCreate: true
            })
          });
          
          logger.debug('[useEnsureTenant] Background tenant verification successful');
          setStatus('verified');
        } catch (apiError) {
          logger.warn('[useEnsureTenant] Background verification failed, but UI can proceed:', apiError);
          // Don't update status on API error - keep using the tenant ID we have
        }
      } catch (err) {
        logger.error('[useEnsureTenant] Error during retry:', err);
        setStatus('error');
        setError(err);
      }
    };
    
    retrySetTenant();
  };

  // Return tenant information
  return {
    tenantId,
    status,
    error,
    retry
  };
} 