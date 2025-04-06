'use client';

import { useEffect, useState } from 'react';
import { syncRepairedTenantId, storeTenantInfo } from '@/utils/tenantUtils';
import { useSession } from 'next-auth/react';
import { logger } from '@/utils/logger';

/**
 * ClientDataSync component monitors for tenant ID inconsistencies
 * and synchronizes them across the application
 */
export default function ClientDataSync() {
  const [syncing, setSyncing] = useState(false);
  
  // Use the session with { required: false } to avoid errors if no provider is available
  const session = useOptionalSession();

  useEffect(() => {
    // Check for tenant ID inconsistencies between cookies and localStorage
    const checkAndSyncTenantIds = async () => {
      try {
        // Only run this once
        if (syncing) return;
        setSyncing(true);

        // Get tenant ID from cookies
        const getCookie = (name) => {
          try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
          } catch (e) {
            return null;
          }
        };

        // Use try/catch to prevent errors if localStorage is not available
        let localStorageTenantId = null;
        try {
          localStorageTenantId = localStorage.getItem('tenantId');
        } catch (e) {
          // Ignore localStorage errors
        }

        const tenantIdCookie = getCookie('tenantId');
        const businessIdCookie = getCookie('businessid');
        
        // Get tenant ID from session if available
        const sessionTenantId = session?.data?.user?.tenantId;
        const sessionStatus = session?.status;

        logger.info('[ClientDataSync] Checking tenant IDs:', {
          tenantIdCookie,
          businessIdCookie,
          localStorageTenantId,
          sessionTenantId,
          sessionStatus
        });

        // If we have a session with tenant ID, use that as the source of truth
        if (sessionTenantId && isValidUuid(sessionTenantId)) {
          logger.info('[ClientDataSync] Using session tenant ID as source of truth:', sessionTenantId);
          
          // If cookie or localStorage has different tenant ID, update them
          if (tenantIdCookie !== sessionTenantId || businessIdCookie !== sessionTenantId || localStorageTenantId !== sessionTenantId) {
            await storeTenantInfo(sessionTenantId);
            logger.info('[ClientDataSync] Updated tenant IDs from session');
          }
          return;
        }

        // If we have different IDs between cookies, try to sync them
        if (tenantIdCookie && businessIdCookie && tenantIdCookie !== businessIdCookie) {
          logger.info('[ClientDataSync] Different tenant IDs found in cookies');
          
          // Validate UUID format for both
          if (isValidUuid(tenantIdCookie) && !isValidUuid(businessIdCookie)) {
            await syncRepairedTenantId(businessIdCookie, tenantIdCookie);
          } else if (!isValidUuid(tenantIdCookie) && isValidUuid(businessIdCookie)) {
            await syncRepairedTenantId(tenantIdCookie, businessIdCookie);
          }
        }

        // If local storage has a different tenant ID, sync it
        if (localStorageTenantId && tenantIdCookie && localStorageTenantId !== tenantIdCookie) {
          logger.info('[ClientDataSync] Different tenant ID in localStorage vs cookie');
          
          // Update localStorage with cookie value if it's valid
          if (isValidUuid(tenantIdCookie)) {
            try {
              localStorage.setItem('tenantId', tenantIdCookie);
              logger.info('[ClientDataSync] Updated localStorage with cookie tenant ID');
            } catch (e) {
              // Ignore localStorage errors
            }
          }
        }

        // Check for invalid tenant IDs
        if (
          (tenantIdCookie && !isValidUuid(tenantIdCookie)) ||
          (businessIdCookie && !isValidUuid(businessIdCookie))
        ) {
          logger.warn('[ClientDataSync] Invalid tenant ID detected, requesting repair');
          
          try {
            const response = await fetch('/api/tenant/init', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                tenantId: tenantIdCookie || businessIdCookie,
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