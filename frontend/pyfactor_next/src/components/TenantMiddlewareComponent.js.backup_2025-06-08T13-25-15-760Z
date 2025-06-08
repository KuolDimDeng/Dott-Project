'use client';

import React, { useEffect } from 'react';
import { useTenant } from '@/context/TenantContext';
import { logger } from '@/utils/logger';

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
        // Check if we're on a sign-in or authentication page to avoid unnecessary errors
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const isAuthPage = path.includes('/auth/signin') || 
                             path.includes('/auth/signup') || 
                             path.includes('/auth/verify') ||
                             path.includes('/auth/reset-password');
          
          if (isAuthPage) {
            logger.debug('[TenantMiddleware] On auth page, skipping tenant initialization');
            return;
          }
        }
        
        logger.debug('[TenantMiddleware] Initializing tenant');
        const tenantId = await initializeTenant();
        
        if (tenantId) {
          logger.info(`[TenantMiddleware] Tenant initialized: ${tenantId}`);
        } else {
          logger.warn('[TenantMiddleware] No tenant ID found during initialization');
        }
      } catch (error) {
        // Check if this is an auth error on an auth page
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          const isAuthPage = path.includes('/auth/signin') || 
                             path.includes('/auth/signup') || 
                             path.includes('/auth/verify') ||
                             path.includes('/auth/reset-password');
          
          if (isAuthPage && (
              error.name === 'UserUnAuthenticatedException' || 
              error.message?.includes('User needs to be authenticated')
            )) {
            logger.debug('[TenantMiddleware] User not authenticated on auth page (expected)');
            return;
          }
        }
        
        logger.error('[TenantMiddleware] Error initializing tenant:', error);
      }
    };

    initialize();
  }, [initializeTenant]);

  // This component doesn't render anything
  return null;
} 