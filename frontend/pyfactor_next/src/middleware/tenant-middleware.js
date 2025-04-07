'use client';

import React, { useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';
import { logger } from '@/utils/logger';

/**
 * Middleware component that initializes tenant context but doesn't render anything in the DOM.
 * This ensures tenant is properly initialized regardless of which page is loaded.
 */
const TenantMiddleware = () => {
  const { initializeTenant } = useTenant();

  useEffect(() => {
    // Initialize tenant on mount
    const initialize = async () => {
      try {
        logger.debug('[TenantMiddleware] Initializing tenant');
        const tenantId = await initializeTenant();
        
        if (tenantId) {
          logger.info(`[TenantMiddleware] Tenant initialized: ${tenantId}`);
        } else {
          logger.warn('[TenantMiddleware] No tenant ID found during initialization');
        }
      } catch (error) {
        logger.error('[TenantMiddleware] Error initializing tenant:', error);
      }
    };

    initialize();
  }, [initializeTenant]);

  // This component doesn't render anything
  return null;
};

export default TenantMiddleware; 