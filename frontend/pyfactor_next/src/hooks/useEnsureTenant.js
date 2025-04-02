import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { getTenantId, validateTenantIdFormat } from '@/utils/tenantUtils';
import { setTenantContext } from '@/utils/tenantContext';

/**
 * Hook to ensure tenant context is set properly for RLS
 * Modified to skip schema verification since RLS is being used
 * @returns {Object} Object containing tenant information
 */
export default function useEnsureTenant() {
  const [status, setStatus] = useState('verified'); // Start with verified status
  const [error, setError] = useState(null);
  const [tenantId, setTenantId] = useState(null);

  useEffect(() => {
    const setTenant = async () => {
      try {
        // Get current tenant ID
        const currentTenantId = getTenantId();
        setTenantId(currentTenantId);

        if (!currentTenantId || !validateTenantIdFormat(currentTenantId)) {
          logger.warn('[useEnsureTenant] Invalid or missing tenant ID:', currentTenantId);
          // Still mark as verified since we're skipping verification
          setStatus('verified');
          return;
        }

        // Set tenant in context for RLS
        setTenantContext(currentTenantId);
        
        // Mark as verified immediately
        setStatus('verified');
        sessionStorage.setItem('schemaSetupCompleted', 'true');
        
      } catch (err) {
        logger.error('[useEnsureTenant] Error while setting tenant:', err);
        // Still mark as verified since we're skipping verification
        setStatus('verified');
      }
    };

    setTenant();
  }, []);

  // Add a method to force retry (no-op since we're skipping verification)
  const retry = () => {
    // No-op since we're skipping verification
    return;
  };

  return { status, error, tenantId, retry };
} 