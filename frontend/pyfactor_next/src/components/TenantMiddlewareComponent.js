'use client';

import React, { useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';

/**
 * Client-side TenantMiddleware component
 * This is a React component that initializes the tenant context but doesn't render anything in the DOM.
 * It's used in providers.js to make sure tenant is initialized correctly regardless of which page is loaded.
 */
export default function TenantMiddlewareComponent() {
  const { initializeTenant } = useTenant();

  useEffect(() => {
    // Initialize tenant on mount
    const initialize = async () => {
      try {
        console.debug('[TenantMiddleware] Initializing tenant');
        const tenantId = await initializeTenant();
        
        if (tenantId) {
          console.info(`[TenantMiddleware] Tenant initialized: ${tenantId}`);
        } else {
          console.warn('[TenantMiddleware] No tenant ID found during initialization');
        }
      } catch (error) {
        console.error('[TenantMiddleware] Error initializing tenant:', error);
      }
    };

    initialize();
  }, [initializeTenant]);

  // This component doesn't render anything
  return null;
} 