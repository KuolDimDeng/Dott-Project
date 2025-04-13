'use client';

import { useEffect } from 'react';
import { useTenantContext } from '@/context/TenantContext';
import { storeTenantInfo } from '@/utils/tenantUtils';
import { logger } from '@/utils/logger';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';

/**
 * Client component that initializes tenant context 
 * @param {Object} props Component props
 * @param {string} props.tenantId The tenant ID from URL params
 */
export default function TenantInitializer({ tenantId }) {
  const { setTenantId } = useTenantContext();
  
  // Initialize tenant context when component mounts
  useEffect(() => {
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
        storeTenantInfo(tenantId);
        
        // Update Cognito custom attributes directly
        try {
          const userAttributes = await fetchUserAttributes();
          const cognitoTenantId = userAttributes['custom:tenant_ID'] || userAttributes['custom:tenantId'];
          
          // If tenant ID in Cognito doesn't match, update it directly
          if (cognitoTenantId !== tenantId) {
            logger.info('[TenantInitializer] Updating Cognito tenant ID:', { 
              from: cognitoTenantId || 'none', 
              to: tenantId 
            });
            
            // Update Cognito directly without API call
            await updateUserAttributes({
              userAttributes: {
                'custom:tenant_ID': tenantId,
                'custom:updated_at': new Date().toISOString()
              }
            });
            
            // Also update database record via API
            await fetch('/api/tenant/ensure-db-record', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                tenantId: tenantId,
                email: userAttributes.email,
                forceUpdate: true
              })
            });
            
            logger.info('[TenantInitializer] Cognito and database updated with tenant ID:', tenantId);
          }
        } catch (attributeError) {
          logger.error('[TenantInitializer] Error updating Cognito attributes:', attributeError);
          
          // Fallback to API for updating tenant ID if direct update fails
          try {
            await fetch('/api/user/update-attributes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                attributes: {
                  'custom:tenant_ID': tenantId
                }
              })
            });
            logger.info('[TenantInitializer] Tenant ID updated via API fallback');
          } catch (apiFallbackError) {
            logger.error('[TenantInitializer] API fallback also failed:', apiFallbackError);
          }
        }
        
        logger.info('[TenantInitializer] Tenant initialized successfully:', tenantId);
      } catch (error) {
        logger.error('[TenantInitializer] Error initializing tenant:', error);
      }
    };
  
    initTenant();
  }, [tenantId, setTenantId]);
  
  return null; // This component doesn't render anything
} 