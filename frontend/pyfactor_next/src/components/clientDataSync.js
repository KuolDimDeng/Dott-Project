'use client';


import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import { getTenantIdFromCognito, updateTenantIdInCognito } from '@/utils/tenantUtils';

/**
 * ClientDataSync component monitors for tenant ID inconsistencies
 * and synchronizes them across the application
 */
export default function ClientDataSync() {
  const [syncing, setSyncing] = useState(false);
  
  // Use the session with { required: false } to avoid errors if no provider is available
  const session = useOptionalSession();

  useEffect(() => {
    // Check for tenant ID inconsistencies and sync with Cognito
    const checkAndSyncTenantIds = async () => {
      try {
        // Only run this once per cycle
        if (syncing) return;
        setSyncing(true);

        // Get tenant ID from Cognito
        let cognitoTenantId = null;
        try {
          cognitoTenantId = await getTenantIdFromCognito();
        } catch (e) {
          logger.error('[ClientDataSync] Error getting tenant ID from Cognito:', e);
        }
        
        // Get tenant ID from session if available
        const sessionTenantId = session?.data?.user?.tenantId;
        const sessionStatus = session?.status;

        logger.info('[ClientDataSync] Checking tenant IDs:', {
          cognitoTenantId,
          sessionTenantId,
          sessionStatus
        });

        // If we have a session with tenant ID, use that as the source of truth
        if (sessionTenantId && isValidUuid(sessionTenantId)) {
          logger.info('[ClientDataSync] Using session tenant ID as source of truth:', sessionTenantId);
          
          // If Cognito has a different tenant ID, update it
          if (cognitoTenantId !== sessionTenantId) {
            await updateTenantIdInCognito(sessionTenantId);
            logger.info('[ClientDataSync] Updated Cognito tenant ID from session');
          }
          return;
        }

        // If we have a valid Cognito tenant ID but no session ID, keep it
        if (cognitoTenantId && isValidUuid(cognitoTenantId) && (!sessionTenantId || sessionStatus !== 'authenticated')) {
          logger.info('[ClientDataSync] Using Cognito tenant ID:', cognitoTenantId);
          return;
        }

        // Check for invalid tenant IDs
        if (cognitoTenantId && !isValidUuid(cognitoTenantId)) {
          logger.warn('[ClientDataSync] Invalid tenant ID detected in Cognito, requesting repair');
          
          try {
            const response = await fetch('/api/tenant/init', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                tenantId: cognitoTenantId,
                requestRepair: true 
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.tenant_id && isValidUuid(data.tenant_id)) {
                logger.info(`[ClientDataSync] Received repaired tenant ID: ${data.tenant_id}`);
                
                // Update the Cognito tenant ID
                await updateTenantIdInCognito(data.tenant_id);
              }
            }
          } catch (error) {
            logger.error('[ClientDataSync] Error requesting tenant ID repair:', error);
          }
        }
        
        // If we don't have a tenant ID, attempt to get from URL path
        if (!cognitoTenantId && !sessionTenantId) {
          try {
            const pathParts = window.location.pathname.split('/');
            for (const part of pathParts) {
              if (isValidUuid(part)) {
                logger.info(`[ClientDataSync] Found tenant ID in URL path: ${part}`);
                await updateTenantIdInCognito(part);
                break;
              }
            }
          } catch (error) {
            logger.error('[ClientDataSync] Error extracting tenant ID from URL:', error);
          }
        }
      } catch (error) {
        logger.error('[ClientDataSync] Error checking tenant IDs:', error);
      } finally {
        setSyncing(false);
      }
    };

    // Run the check when the component mounts
    checkAndSyncTenantIds();
    
    // Set up periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      checkAndSyncTenantIds();
    }, 30000);
    
    return () => clearInterval(syncInterval);
  }, [session, syncing]);

  // Helper to validate UUID format
  function isValidUuid(id) {
    try {
      return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    } catch (e) {
      return false;
    }
  }

  // Render nothing - this is just for the side effects
  return null;
}

/**
 * Safe wrapper around useSession to handle cases where SessionProvider might not be available
 */
function useOptionalSession() {
  try {
    const { data, status } = useSession({ required: false });
    return { data, status };
  } catch (error) {
    // If useSession fails (no provider), return null values
    return { data: null, status: 'unauthenticated' };
  }
} 