'use client';


import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { tokenService } from '@/services/tokenService';
import { getTenantIdFromCognito, setTenantId } from '@/utils/tenantUtils';
import { fetchAuthSession  } from '@/config/amplifyUnified';
import { SafeHub } from '@/utils/safeHub';

/**
 * AuthTokenManager
 * 
 * A component that manages authentication tokens and ensures tenant ID consistency
 * Implements proper token refresh handling and connects Cognito auth events with tenant data
 */
export default function AuthTokenManager({ children }) {
  const [initialized, setInitialized] = useState(false);
  
  // Setup token management and tenant sync on initial load
  useEffect(() => {
    // Function to handle token events
    const handleTokenEvent = (event) => {
      if (event === 'refresh') {
        logger.debug('[AuthTokenManager] Token refreshed, syncing tenant ID');
        syncTenantId();
      } else if (event === 'expired') {
        logger.warn('[AuthTokenManager] Token expired, redirecting to sign-in');
        window.location.href = '/auth/signin?session=expired';
      }
    };
    
    // Register token event listener
    const unsubscribe = tokenService.addListener(handleTokenEvent);
    
    // Setup Amplify Hub listener for auth events
    const hubListener = (data) => {
      const { payload } = data;
      
      if (payload.event === 'signedIn') {
        logger.info('[AuthTokenManager] User signed in, refreshing tokens');
        tokenService.refreshTokens();
      } else if (payload.event === 'tokenRefresh') {
        logger.info('[AuthTokenManager] Token refresh detected through Hub');
        syncTenantId();
      } else if (payload.event === 'signedOut' || payload.event === 'signIn_failure') {
        logger.info('[AuthTokenManager] Auth state changed:', payload.event);
      }
    };
    
    // Register Hub listener using SafeHub
    const hubUnsubscribe = SafeHub.listen('auth', hubListener);
    
    // Initialize token management
    initializeTokenManagement();
    
    // Cleanup
    return () => {
      unsubscribe();
      hubUnsubscribe();
    };
  }, []);
  
  // Function to sync tenant ID when tokens change
  const syncTenantId = async () => {
    try {
      logger.debug('[AuthTokenManager] Syncing tenant ID with Cognito');
      
      // Get tenant ID from Cognito with retry logic
      const tenantId = await getTenantIdFromCognito();
      
      if (tenantId) {
        logger.debug(`[AuthTokenManager] Got tenant ID from Cognito: ${tenantId}`);
        
        // Ensure tenant ID is properly set in all locations
        await setTenantId(tenantId);
      } else {
        logger.warn('[AuthTokenManager] No tenant ID found in Cognito');
      }
    } catch (error) {
      logger.error('[AuthTokenManager] Error syncing tenant ID:', error);
    }
  };
  
  // Initialize token management
  const initializeTokenManagement = async () => {
    try {
      logger.debug('[AuthTokenManager] Initializing token management');
      
      // Check if we need to refresh
      const needsRefresh = await tokenService.needsRefresh();
      
      if (needsRefresh) {
        logger.debug('[AuthTokenManager] Tokens need refresh, refreshing now');
        await tokenService.refreshTokens();
      } else {
        logger.debug('[AuthTokenManager] Tokens still valid');
        
        // Even with valid tokens, ensure we have the latest auth session
        try {
          await fetchAuthSession();
        } catch (sessionError) {
          logger.warn('[AuthTokenManager] Error refreshing auth session:', sessionError);
        }
      }
      
      // Sync tenant ID after token initialization
      await syncTenantId();
      
      // Set up automatic token refresh
      setupAutoRefresh();
      
      setInitialized(true);
    } catch (error) {
      logger.error('[AuthTokenManager] Error initializing token management:', error);
      
      // Still mark as initialized to avoid blocking the app
      setInitialized(true);
    }
  };
  
  // Setup automatic token refresh
  const setupAutoRefresh = () => {
    // Check token expiry every minute
    const refreshInterval = setInterval(async () => {
      try {
        const needsRefresh = await tokenService.needsRefresh();
        
        if (needsRefresh) {
          logger.debug('[AuthTokenManager] Auto-refresh: tokens need refresh');
          await tokenService.refreshTokens();
        }
      } catch (error) {
        logger.error('[AuthTokenManager] Error in auto-refresh:', error);
      }
    }, 60 * 1000); // Check every minute
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  };
  
  // Render the wrapped children
  return <>{children}</>;
} 