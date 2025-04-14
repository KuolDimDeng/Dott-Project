'use client';

import { useEffect, useState } from 'react';
import { syncRepairedTenantId, storeTenantInfo } from '@/utils/tenantUtils';
import { useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { getUserPreference, saveUserPreference, PREF_KEYS } from '@/utils/userPreferences';

/**
 * ClientDataSync component monitors for tenant ID inconsistencies
 * and synchronizes them across the application
 */
export default function ClientDataSync() {
  const [syncing, setSyncing] = useState(false);
  
  // Use the session with { required: false } to avoid errors if no provider is available
  const session = useOptionalSession();

  useEffect(() => {
    // Check for tenant ID inconsistencies between AppCache and Cognito attributes
    const checkAndSyncTenantIds = async () => {
      try {
        // Only run this once
        if (syncing) return;
        setSyncing(true);

        // Get tenant ID from AppCache
        const appCacheTenantId = getCacheValue('tenantId');
        
        // Get tenant ID from Cognito attributes
        let cognitoTenantId = null;
        try {
          cognitoTenantId = await getUserPreference(PREF_KEYS.TENANT_ID);
        } catch (e) {
          // Ignore Cognito errors
          logger.error('[ClientDataSync] Error getting tenant ID from Cognito:', e);
        }
        
        // Get tenant ID from session if available
        const sessionTenantId = session?.data?.user?.tenantId;
        const sessionStatus = session?.status;

        logger.info('[ClientDataSync] Checking tenant IDs:', {
          appCacheTenantId,
          cognitoTenantId,
          sessionTenantId,
          sessionStatus
        });

        // If we have a session with tenant ID, use that as the source of truth
        if (sessionTenantId && isValidUuid(sessionTenantId)) {
          logger.info('[ClientDataSync] Using session tenant ID as source of truth:', sessionTenantId);
          
          // If AppCache or Cognito has different tenant ID, update them
          if (appCacheTenantId !== sessionTenantId || cognitoTenantId !== sessionTenantId) {
            await storeTenantInfo(sessionTenantId);
            logger.info('[ClientDataSync] Updated tenant IDs from session');
          }
          return;
        }

        // If Cognito and AppCache have different IDs, sync them
        if (cognitoTenantId && appCacheTenantId && cognitoTenantId !== appCacheTenantId) {
          logger.info('[ClientDataSync] Different tenant IDs found in Cognito vs AppCache');
          
          // Validate UUID format for both
          if (isValidUuid(cognitoTenantId) && !isValidUuid(appCacheTenantId)) {
            await syncRepairedTenantId(appCacheTenantId, cognitoTenantId);
          } else if (!isValidUuid(cognitoTenantId) && isValidUuid(appCacheTenantId)) {
            await syncRepairedTenantId(cognitoTenantId, appCacheTenantId);
          } else if (isValidUuid(cognitoTenantId) && isValidUuid(appCacheTenantId)) {
            // Both are valid UUIDs but different - prioritize Cognito's value
            await syncRepairedTenantId(appCacheTenantId, cognitoTenantId);
          }
        }

        // Check for invalid tenant IDs
        if (
          (appCacheTenantId && !isValidUuid(appCacheTenantId)) ||
          (cognitoTenantId && !isValidUuid(cognitoTenantId))
        ) {
          logger.warn('[ClientDataSync] Invalid tenant ID detected, requesting repair');
          
          try {
            const response = await fetch('/api/tenant/init', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                tenantId: appCacheTenantId || cognitoTenantId,
                requestRepair: true 
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.tenant_id && isValidUuid(data.tenant_id)) {
                logger.info(`[ClientDataSync] Received repaired tenant ID: ${data.tenant_id}`);
                
                // Use the repaired tenant ID
                await storeTenantInfo(data.tenant_id);
              }
            }
          } catch (error) {
            logger.error('[ClientDataSync] Error requesting tenant ID repair:', error);
          }
        }
      } catch (error) {
        logger.error('[ClientDataSync] Error checking tenant IDs:', error);
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