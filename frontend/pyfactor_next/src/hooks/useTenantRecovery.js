import { appCache } from '../utils/appCache';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUserAttributes, getCurrentUser  } from '@/config/amplifyUnified';
import { 
  getFallbackTenantId, 
  storeReliableTenantId, 
  getRecoveryDashboardUrl,
  executeEmergencyRecovery
} from '@/utils/tenantFallback';
  initNetworkMonitoring, 
  checkApiHealth, 
  listenToNetworkEvents,
  isCognitoUnreliable,
  shouldRunHealthCheck
} from '@/utils/networkMonitor';
import { isValidUUID } from '@/utils/tenantUtils';
  resilientFetchUserAttributes,
  resilientGetCurrentUser
} from '@/utils/amplifyResiliency';
import { logger } from '@/utils/logger';

// Recovery cooldown timing constants
const RECOVERY_COOLDOWN_MS = 10000; // 10 seconds between recovery attempts
const RECOVERY_DEBOUNCE_MS = 300; // 300ms debounce for network events

/**
 * Hook for implementing tenant recovery throughout the application
 * Automatically monitors for API issues and integrates recovery mechanisms
 */
export const useTenantRecovery = (options = {}) => {
  const router = useRouter();
  const [recoveryState, setRecoveryState] = useState({
    isRecoveryMode: false,
    recoveryAttempts: 0,
    recoveredTenantId: null,
    networkStatus: 'unknown',
    isLoading: false
  });
  
  // Track active operations to prevent overlapping
  const operationsRef = useRef({
    checkRecoveryActive: false,
    healthCheckActive: false,
    redirectInProgress: false,
    isMounted: false,
    lastRecoveryAttempt: 0,
    networkDebounceTimeout: null
  });
  
  // Extract options with defaults
  const {
    autoRedirect = true,
    monitorNetwork = true,
    recoveryThreshold = 3,
    pathTenantId = null
  } = options;
  
  // Set mount state at initialization
  useEffect(() => {
    operationsRef.current.isMounted = true;
    
    // Return cleanup function
    return () => {
      operationsRef.current.isMounted = false;
      
      // Clear any pending timeouts
      if (operationsRef.current.networkDebounceTimeout) {
        clearTimeout(operationsRef.current.networkDebounceTimeout);
      }
    };
  }, []);
  
  // Get path tenant ID from URL if not provided
  const effectivePathTenantId = useCallback(() => {
    if (pathTenantId && isValidUUID(pathTenantId)) {
      return pathTenantId;
    }
    
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      
      // Find UUID in path segments
      const uuidSegment = segments.find(segment => isValidUUID(segment));
      return uuidSegment || null;
    }
    
    return null;
  }, [pathTenantId]);
  
  // Check if recovery is on cooldown
  const isRecoveryOnCooldown = useCallback(() => {
    const now = Date.now();
    const sinceLastAttempt = now - operationsRef.current.lastRecoveryAttempt;
    
    if (sinceLastAttempt < RECOVERY_COOLDOWN_MS) {
      logger.debug(`[TenantRecovery] Recovery on cooldown (${Math.round(sinceLastAttempt / 1000)}s elapsed of ${RECOVERY_COOLDOWN_MS / 1000}s cooldown)`);
      return true;
    }
    
    return false;
  }, []);
  
  // Check if we need to activate recovery mode
  const checkRecoveryMode = useCallback(async () => {
    // Prevent multiple concurrent checks
    if (operationsRef.current.checkRecoveryActive || 
        !operationsRef.current.isMounted || 
        isRecoveryOnCooldown()) {
      logger.debug("[TenantRecovery] Recovery check already in progress, on cooldown, or component unmounted, skipping");
      return false;
    }
    
    operationsRef.current.checkRecoveryActive = true;
    
    try {
      const recoveryAttempts = parseInt(localStorage.getItem('tenant_recovery_attempts') || '0', 10);
      const isActivated = localStorage.getItem('tenant_fallback_activated') === 'true';
      
      // If we're already in recovery mode or have exceeded attempts threshold
      // Also activate recovery if Cognito appears unreliable
      if (isActivated || recoveryAttempts >= recoveryThreshold || isCognitoUnreliable()) {
        const recoveredId = getFallbackTenantId() || effectivePathTenantId();
        
        // Only update state if component is still mounted
        if (operationsRef.current.isMounted) {
          setRecoveryState(prev => ({
            ...prev,
            isRecoveryMode: true,
            recoveryAttempts: recoveryAttempts,
            recoveredTenantId: recoveredId
          }));
        }
        
        // Store the recovered ID in localStorage if valid
        if (recoveredId && isValidUUID(recoveredId)) {
          storeReliableTenantId(recoveredId);
        }
        
        // Update last attempt timestamp
        operationsRef.current.lastRecoveryAttempt = Date.now();
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error("[TenantRecovery] Error checking recovery mode:", error);
      return false;
    } finally {
      operationsRef.current.checkRecoveryActive = false;
    }
  }, [recoveryThreshold, effectivePathTenantId, isRecoveryOnCooldown]);
  
  // Handle network status changes with debouncing
  const handleNetworkStatus = useCallback((status) => {
    // Skip if component unmounted or status is invalid
    if (!operationsRef.current.isMounted || !status) return;
    
    // Clear any pending debounce timeout
    if (operationsRef.current.networkDebounceTimeout) {
      clearTimeout(operationsRef.current.networkDebounceTimeout);
      operationsRef.current.networkDebounceTimeout = null;
    }
    
    // Debounce network events
    operationsRef.current.networkDebounceTimeout = setTimeout(() => {
      // Skip if component unmounted during timeout
      if (!operationsRef.current.isMounted) return;
      
      setRecoveryState(prev => ({
        ...prev,
        networkStatus: status.quality || 'unknown'
      }));
      
      // If network is degraded or offline and we have a tenant ID, consider recovery
      if ((status.quality === 'degraded' || status.quality === 'offline' || status.type === 'cognito-degradation') && 
          (getFallbackTenantId() || effectivePathTenantId()) && 
          !isRecoveryOnCooldown()) {
        
        // Check again if component is mounted before proceeding
        if (operationsRef.current.isMounted) {
          checkRecoveryMode().catch(error => {
            logger.error("[TenantRecovery] Error in recovery check:", error);
          });
        }
      }
    }, RECOVERY_DEBOUNCE_MS);
  }, [checkRecoveryMode, effectivePathTenantId, isRecoveryOnCooldown]);
  
  // Safely run health check with error handling
  const safeCheckApiHealth = useCallback(async () => {
    // Prevent multiple concurrent health checks
    if (operationsRef.current.healthCheckActive || 
        !operationsRef.current.isMounted || 
        !shouldRunHealthCheck()) {
      logger.debug("[TenantRecovery] Health check already in progress, on cooldown, or component unmounted, skipping");
      return;
    }
    
    operationsRef.current.healthCheckActive = true;
    
    try {
      await checkApiHealth();
    } catch (error) {
      logger.warn("[TenantRecovery] API health check failed:", error);
      // Don't propagate the error, we'll handle it internally
    } finally {
      operationsRef.current.healthCheckActive = false;
    }
  }, []);
  
  // Initialize monitoring on mount
  useEffect(() => {
    if (!monitorNetwork || typeof window === 'undefined' || !operationsRef.current.isMounted) {
      return;
    }
    
    // Initialize network monitoring
    const cleanupFn = initNetworkMonitoring();
    
    // Subscribe to network events
    const removeListener = listenToNetworkEvents(handleNetworkStatus);
    
    // Perform initial health check
    if (operationsRef.current.isMounted) {
      // Delayed health check to avoid blocking initial render
      setTimeout(safeCheckApiHealth, 500);
    }
    
    // Check initial recovery state
    checkRecoveryMode();
    
    // Clean up when component unmounts
    return () => {
      if (removeListener) removeListener();
      if (cleanupFn) cleanupFn();
    };
  }, [monitorNetwork, handleNetworkStatus, safeCheckApiHealth, checkRecoveryMode]);
  
  // Get authorized tenant ID with fallback
  const getAuthorizedTenantId = useCallback(async () => {
    try {
      // Set loading state to prevent concurrent operations
      if (operationsRef.current.isMounted) {
        setRecoveryState(prev => ({ ...prev, isLoading: true }));
      }
      
      // Try to get tenant ID from Cognito first with improved resilience
      let user, attributes;
      
      try {
        // Use resilient functions that include retries and fallbacks
        user = await resilientGetCurrentUser(getCurrentUser);
        attributes = await resilientFetchUserAttributes(fetchUserAttributes);
        
        const tenantIdAttr = attributes && (
          attributes['custom:tenant_ID'] || 
          attributes['custom:tenantId'] || 
          attributes['custom:businessid']
        );
        
        if (tenantIdAttr && isValidUUID(tenantIdAttr)) {
          // Store for recovery
          storeReliableTenantId(tenantIdAttr);
          
          // Clear loading state
          if (operationsRef.current.isMounted) {
            setRecoveryState(prev => ({ ...prev, isLoading: false }));
          }
          
          return tenantIdAttr;
        }
      } catch (cognitoError) {
        logger.warn("[TenantRecovery] Error getting tenant ID from Cognito:", cognitoError);
        // Continue to fallback mechanisms
      }
      
      // If no valid tenant ID from Cognito, use fallback mechanisms
      // First check for a reliable stored tenant ID
      const fallbackId = getFallbackTenantId();
      if (fallbackId && isValidUUID(fallbackId)) {
        logger.info("[TenantRecovery] Using fallback tenant ID:", fallbackId);
        
        // Clear loading state
        if (operationsRef.current.isMounted) {
          setRecoveryState(prev => ({ ...prev, isLoading: false }));
        }
        
        return fallbackId;
      }
      
      // Check path as last resort
      const pathId = effectivePathTenantId();
      if (pathId && isValidUUID(pathId)) {
        logger.info("[TenantRecovery] Using tenant ID from path:", pathId);
        storeReliableTenantId(pathId);
        
        // Clear loading state
        if (operationsRef.current.isMounted) {
          setRecoveryState(prev => ({ ...prev, isLoading: false }));
        }
        
        return pathId;
      }
      
      // Cache tenant ID from AppCache if available
      if (typeof window !== 'undefined' && appCache.getAll() && isValidUUID(appCache.get('tenant.id'))) {
        logger.info("[TenantRecovery] Using tenant ID from AppCache:", appCache.get('tenant.id'));
        storeReliableTenantId(appCache.get('tenant.id'));
        
        // Clear loading state
        if (operationsRef.current.isMounted) {
          setRecoveryState(prev => ({ ...prev, isLoading: false }));
        }
        
        return appCache.get('tenant.id');
      }
      
      // No valid tenant ID found
      logger.warn("[TenantRecovery] No valid tenant ID found through any method");
      
      // Clear loading state
      if (operationsRef.current.isMounted) {
        setRecoveryState(prev => ({ ...prev, isLoading: false }));
      }
      
      return null;
    } catch (error) {
      logger.error("[TenantRecovery] Critical error getting tenant ID:", error);
      
      // Clear loading state
      if (operationsRef.current.isMounted) {
        setRecoveryState(prev => ({ ...prev, isLoading: false }));
      }
      
      // Use fallback tenant ID as final attempt
      return getFallbackTenantId() || effectivePathTenantId();
    }
  }, [effectivePathTenantId]);
  
  // Effect to handle auto-redirect in recovery mode
  useEffect(() => {
    if (!autoRedirect || 
        !recoveryState.isRecoveryMode || 
        typeof window === 'undefined' || 
        !operationsRef.current.isMounted ||
        recoveryState.isLoading) {
      return;
    }
    
    // Prevent redirect loops
    if (operationsRef.current.redirectInProgress) {
      logger.debug("[TenantRecovery] Redirect already in progress, skipping");
      return;
    }
    
    const tenantId = recoveryState.recoveredTenantId || getFallbackTenantId() || effectivePathTenantId();
    
    if (tenantId && isValidUUID(tenantId)) {
      // Check if we're already on a tenant route
      const path = window.location.pathname;
      
      // Check if we're already on the recovery route or have a recovery parameter
      const isAlreadyRecovery = 
        path.includes(`/${tenantId}/`) && 
        (path.includes('recovery=true') || 
         window.location.search.includes('recovery=true'));
         
      if (isAlreadyRecovery) {
        logger.info("[TenantRecovery] Already on recovery route:", path);
        return;
      }
      
      // Check if we're already on the correct tenant route
      if (path.includes(`/${tenantId}/`)) {
        logger.info("[TenantRecovery] Already on correct tenant route:", path);
        
        // If we're already on the right route but don't have recovery param, add it
        if (!window.location.search.includes('recovery=true')) {
          operationsRef.current.redirectInProgress = true;
          
          const newUrl = path + (window.location.search ? 
            window.location.search + '&recovery=true' : 
            '?recovery=true');
            
          try {
            router.replace(newUrl);
          } catch (error) {
            logger.error("[TenantRecovery] Error adding recovery param:", error);
            operationsRef.current.redirectInProgress = false;
          }
        }
        
        return;
      }
      
      // Redirect to the recovery dashboard
      logger.info("[TenantRecovery] Auto-redirecting to tenant dashboard:", tenantId);
      
      operationsRef.current.redirectInProgress = true;
      try {
        const recoveryUrl = getRecoveryDashboardUrl(tenantId);
        router.push(recoveryUrl);
        
        // Reset redirect flag after timeout to prevent deadlocks
        setTimeout(() => {
          operationsRef.current.redirectInProgress = false;
        }, 5000);
      } catch (error) {
        logger.error("[TenantRecovery] Error during redirect:", error);
        operationsRef.current.redirectInProgress = false;
      }
    }
  }, [autoRedirect, recoveryState, router, effectivePathTenantId]);
  
  // Trigger manual recovery if needed
  const triggerRecovery = useCallback(async () => {
    // Skip if component is unmounted or recovery on cooldown
    if (!operationsRef.current.isMounted) {
      return { success: false, message: "Component unmounted" };
    }
    
    if (isRecoveryOnCooldown()) {
      return { success: false, message: "Recovery on cooldown" };
    }
    
    // Set loading state
    if (operationsRef.current.isMounted) {
      setRecoveryState(prev => ({ ...prev, isLoading: true }));
    }
    
    const tenantId = await getAuthorizedTenantId();
    
    if (tenantId) {
      // Store for future recovery
      storeReliableTenantId(tenantId);
      
      // Update recovery state if component is still mounted
      if (operationsRef.current.isMounted) {
        setRecoveryState(prev => ({
          ...prev,
          isRecoveryMode: true,
          recoveryAttempts: prev.recoveryAttempts + 1,
          recoveredTenantId: tenantId,
          isLoading: false
        }));
      }
      
      // Update last attempt timestamp
      operationsRef.current.lastRecoveryAttempt = Date.now();
      
      if (autoRedirect && !operationsRef.current.redirectInProgress && operationsRef.current.isMounted) {
        operationsRef.current.redirectInProgress = true;
        
        try {
          const recoveryUrl = getRecoveryDashboardUrl(tenantId);
          router.push(recoveryUrl);
          
          // Reset redirect flag after timeout
          setTimeout(() => {
            operationsRef.current.redirectInProgress = false;
          }, 5000);
          
          return {
            success: true,
            tenantId,
            recoveryUrl: recoveryUrl
          };
        } catch (redirectError) {
          logger.error("[TenantRecovery] Error redirecting:", redirectError);
          operationsRef.current.redirectInProgress = false;
          
          // Clear loading state
          if (operationsRef.current.isMounted) {
            setRecoveryState(prev => ({ ...prev, isLoading: false }));
          }
          
          return {
            success: false,
            tenantId,
            error: redirectError.message,
            recoveryUrl: getRecoveryDashboardUrl(tenantId)
          };
        }
      }
      
      return {
        success: true,
        tenantId,
        recoveryUrl: getRecoveryDashboardUrl(tenantId)
      };
    }
    
    // Clear loading state
    if (operationsRef.current.isMounted) {
      setRecoveryState(prev => ({ ...prev, isLoading: false }));
    }
    
    return {
      success: false,
      message: "No valid tenant ID found for recovery"
    };
  }, [getAuthorizedTenantId, autoRedirect, router, isRecoveryOnCooldown]);
  
  // Execute emergency recovery as a last resort
  const emergencyRecover = useCallback(() => {
    // Skip if component is unmounted
    if (!operationsRef.current.isMounted) {
      return false;
    }
    
    // Prevent overlapping emergency recoveries
    if (operationsRef.current.redirectInProgress) {
      logger.debug("[TenantRecovery] Emergency recovery already in progress, skipping");
      return false;
    }
    
    // Skip if on cooldown
    if (isRecoveryOnCooldown()) {
      return false;
    }
    
    operationsRef.current.redirectInProgress = true;
    operationsRef.current.lastRecoveryAttempt = Date.now();
    
    try {
      const result = executeEmergencyRecovery();
      
      // Reset redirect flag after timeout
      setTimeout(() => {
        operationsRef.current.redirectInProgress = false;
      }, 5000);
      
      return result;
    } catch (error) {
      logger.error("[TenantRecovery] Emergency recovery failed:", error);
      operationsRef.current.redirectInProgress = false;
      return false;
    }
  }, [isRecoveryOnCooldown]);
  
  return {
    ...recoveryState,
    getAuthorizedTenantId,
    triggerRecovery,
    emergencyRecover,
    checkRecoveryMode
  };
}; 