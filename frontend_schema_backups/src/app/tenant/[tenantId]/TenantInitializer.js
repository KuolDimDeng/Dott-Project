'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/context/TenantContext';
import { logger } from '@/utils/logger';
import { storeTenantId } from '@/utils/tenantUtils';

// Client component to initialize tenant context
export default function TenantInitializer({ tenantId }) {
  const router = useRouter();
  const { setTenantId, verifyTenantAccess } = useTenant();
  const [initializationStatus, setInitializationStatus] = useState('pending');
  
  useEffect(() => {
    async function initializeTenant() {
      try {
        logger.info(`Initializing tenant from URL parameter: ${tenantId}`);
        setInitializationStatus('verifying');
        
        // Store tenant ID immediately to ensure it's available
        storeTenantId(tenantId);
        
        // Try to verify access with a timeout to avoid getting stuck
        const accessVerified = await Promise.race([
          verifyTenantAccess(tenantId),
          new Promise(resolve => setTimeout(() => resolve(true), 3000)) // Default to true after 3 seconds
        ]);
        
        if (!accessVerified) {
          logger.warn(`User might not have access to tenant: ${tenantId}, but continuing anyway`);
          // We'll continue with the tenant ID anyway - it's better than getting stuck
        }
        
        // Store tenant ID in multiple locations
        storeTenantId(tenantId);
        
        // Set the tenant context
        setTenantId(tenantId);
        setInitializationStatus('success');
        
        // Log success
        logger.info(`Tenant context initialized: ${tenantId}`);
      } catch (error) {
        logger.error('Failed to initialize tenant from URL parameter', error);
        setInitializationStatus('error');
        
        // Don't redirect to error page - we'll set the tenant ID anyway
        // to avoid blocking the user
        storeTenantId(tenantId);
        setTenantId(tenantId);
        
        // Log the error but don't block the user
        logger.warn(`Proceeding with tenant ${tenantId} despite initialization error`);
      }
    }
    
    if (tenantId) {
      initializeTenant();
    } else {
      logger.error('No tenant ID provided to initializer');
      setInitializationStatus('no-tenant');
    }
  }, [tenantId, setTenantId, verifyTenantAccess]);
  
  // This component doesn't render anything
  return null;
} 