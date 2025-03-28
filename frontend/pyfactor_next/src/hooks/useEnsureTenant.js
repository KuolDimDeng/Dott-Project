import { useState, useEffect } from 'react';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { getTenantId, validateTenantIdFormat } from '@/utils/tenantUtils';
import { setTenantContext } from '@/utils/tenantContext';

/**
 * Hook to ensure tenant schema exists and is properly configured
 * @returns {Object} Object containing status of tenant verification
 */
export default function useEnsureTenant() {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 2;

  useEffect(() => {
    const verifyTenant = async () => {
      try {
        // Get current tenant ID
        const currentTenantId = getTenantId();
        setTenantId(currentTenantId);

        if (!currentTenantId || !validateTenantIdFormat(currentTenantId)) {
          logger.error('[useEnsureTenant] Invalid or missing tenant ID:', currentTenantId);
          setStatus('invalid_tenant');
          setError('Invalid or missing tenant ID');
          return;
        }

        // Record that we've attempted schema setup for this session
        const hasSetupBeenRunKey = 'schemaSetupAttemptedInSession';
        const setupAttempted = sessionStorage.getItem(hasSetupBeenRunKey) === 'true';
        
        if (!setupAttempted) {
          sessionStorage.setItem(hasSetupBeenRunKey, 'true');
        }
        
        const schemaName = `tenant_${currentTenantId.replace(/-/g, '_')}`;
        logger.info('[useEnsureTenant] Verifying tenant schema exists and creating if needed:', { 
          tenantId: currentTenantId,
          schemaName,
          attempt: attempts + 1
        });

        try {
          // Call API to ensure tenant schema exists
          const response = await axiosInstance.get('/api/tenant/status', {
            headers: {
              'X-Tenant-ID': currentTenantId,
              'X-Schema-Name': schemaName
            }
          });
          
          if (response.data.success) {
            logger.info('[useEnsureTenant] Tenant schema verified:', response.data);
            
            // Ensure tenant ID is set in context
            if (response.data.tenant_id) {
              setTenantContext(response.data.tenant_id);
            }
            
            setStatus('verified');
            sessionStorage.setItem('schemaSetupCompleted', 'true');
            return;
          }
          
          logger.warn('[useEnsureTenant] Tenant verification returned false:', response.data);
          throw new Error(response.data.message || 'Verification failed');
          
        } catch (mainError) {
          logger.error('[useEnsureTenant] Error in primary verification path:', mainError);
          
          // If we've reached max attempts, try direct creation endpoint
          if (attempts < MAX_ATTEMPTS) {
            setAttempts(prev => prev + 1);
            return; // will trigger useEffect again with incremented attempts
          }
          
          // As a last resort, try the direct tenant creation endpoint
          try {
            logger.info('[useEnsureTenant] Attempting direct tenant creation as fallback');
            const createResponse = await axiosInstance.post('/api/tenant/create', {
              tenantId: currentTenantId
            });
            
            if (createResponse.data.success) {
              logger.info('[useEnsureTenant] Successfully created tenant schema via fallback:', createResponse.data);
              setTenantContext(currentTenantId);
              setStatus('verified');
              sessionStorage.setItem('schemaSetupCompleted', 'true');
              return;
            }
            
            throw new Error('Fallback creation also failed');
          } catch (createError) {
            logger.error('[useEnsureTenant] Fallback tenant creation failed:', createError);
            setStatus('error');
            setError(createError.message || 'All tenant creation attempts failed');
          }
        }
      } catch (err) {
        logger.error('[useEnsureTenant] Unhandled error in verifyTenant:', err);
        setStatus('error');
        setError(err.message || 'Failed to verify tenant');
      }
    };

    // Only attempt verification if we haven't reached max attempts
    if (status === 'pending' || (status === 'error' && attempts < MAX_ATTEMPTS)) {
      verifyTenant();
    }
  }, [attempts, status]);

  // Add a method to force retry
  const retry = () => {
    if (attempts < MAX_ATTEMPTS) {
      setStatus('pending');
      setError(null);
      setAttempts(prev => prev + 1);
    }
  };

  return { status, error, tenantId, retry };
} 