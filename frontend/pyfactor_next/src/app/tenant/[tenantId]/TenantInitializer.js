'use client';

import { useEffect } from 'react';
import { useTenantContext } from '@/context/TenantContext';
import { storeTenantInfo } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { fetchUserAttributes, updateUserAttributes } from '@/config/amplifyUnified';

/**
 * Client component that initializes tenant context 
 * @param {Object} props Component props
 * @param {string} props.tenantId The tenant ID from URL params
 */
export default function TenantInitializer({ tenantId }) {
  const { setTenantId } = useTenantContext();
  
  // Initialize tenant context when component mounts (with deduplication)
  useEffect(() => {
    // Prevent multiple initializations for the same tenant
    if (typeof window !== 'undefined') {
      const lastInitialized = window.__lastTenantInitialized;
      if (lastInitialized === tenantId) {
        logger.debug('[TenantInitializer] Tenant already initialized, skipping:', tenantId);
        return;
      }
      window.__lastTenantInitialized = tenantId;
    }
    
    const initTenant = async () => {
      if (!tenantId) {
        logger.warn('[TenantInitializer] No tenant ID provided');
        return;
      }
  
      logger.info('[TenantInitializer] Initializing tenant:', tenantId);
      
      try {
        // Set tenant ID in context immediately
        setTenantId(tenantId);
        
        // Store tenant info in local storage
        storeTenantInfo({ 
          tenantId: tenantId,
          metadata: {
            source: 'TenantInitializer',
            timestamp: new Date().toISOString()
          }
        });
        
        // Skip Cognito update if we're already in the process of updating
        if (typeof window !== 'undefined' && window.__cognitoUpdateInProgress) {
          logger.debug('[TenantInitializer] Cognito update already in progress, skipping');
          return;
        }
        
        // Optimize Cognito calls - only update if necessary and make it async
        const updateCognitoAsync = async () => {
          try {
            if (typeof window !== 'undefined') {
              window.__cognitoUpdateInProgress = true;
            }
            
            const userAttributes = await fetchUserAttributes();
            const cognitoTenantId = userAttributes['custom:tenant_ID'] || userAttributes['custom:tenantId'] || userAttributes['custom:businessid'];
            
            // Only update if tenant ID doesn't match (avoid redundant calls)
            if (cognitoTenantId !== tenantId) {
              logger.debug('[TenantInitializer] Async Cognito tenant ID update:', { 
                from: cognitoTenantId || 'none', 
                to: tenantId 
              });
              
              // Update Cognito directly (async, non-blocking)
              await updateUserAttributes({
                userAttributes: {
                  'custom:tenant_ID': tenantId,
                  'custom:updated_at': new Date().toISOString()
                }
              });
              
              logger.debug('[TenantInitializer] Async Cognito update completed');
            } else {
              logger.debug('[TenantInitializer] Cognito tenant ID already matches, skipping update');
            }
          } catch (attributeError) {
            logger.debug('[TenantInitializer] Async Cognito update failed (non-blocking):', attributeError.message);
          } finally {
            if (typeof window !== 'undefined') {
              window.__cognitoUpdateInProgress = false;
            }
          }
        };
        
        // Start async update but don't wait for it (faster initialization)
        updateCognitoAsync();
        
        logger.info('[TenantInitializer] Tenant initialized successfully:', tenantId);
      } catch (error) {
        logger.error('[TenantInitializer] Error initializing tenant:', error);
      }
    };
  
    initTenant();
  }, [tenantId, setTenantId]);
  
  return null; // This component doesn't render anything
} 