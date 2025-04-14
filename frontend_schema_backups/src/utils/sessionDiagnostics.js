'use client';

import { logger } from '@/utils/logger';
import { getCacheValue } from '@/utils/appCache';
import { fetchUserAttributes } from '@/config/amplifyUnified';

/**
 * Utility to diagnose common session issues and log helpful information
 */
export const checkSessionHealth = async () => {
  if (typeof window === 'undefined') return;
  
  try {
    logger.debug('[SessionDiagnostics] Checking session health');
    
    // Check for stuck flags
    if (window.__tokenRefreshInProgress) {
      logger.warn('[SessionDiagnostics] Token refresh in progress flag is set');
    }
    
    if (window.__tokenRefreshCooldown) {
      const timeLeft = Math.round((window.__tokenRefreshCooldown - Date.now()) / 1000);
      logger.warn(`[SessionDiagnostics] Token refresh cooldown active for ${timeLeft} more seconds`);
    }
    
    // Check AppCache (replacement for localStorage)
    const tenantId = getCacheValue('tenantId');
    const userEmail = getCacheValue('userEmail');
    const previouslyOnboarded = getCacheValue('previouslyOnboarded');
    
    logger.debug('[SessionDiagnostics] AppCache state', {
      tenantId,
      userEmail,
      previouslyOnboarded,
    });
    
    // Check Cognito attributes
    try {
      const attributes = await fetchUserAttributes().catch(() => ({}));
      logger.debug('[SessionDiagnostics] Cognito attributes state', {
        tenantId: attributes['custom:tenantId'] || attributes['custom:businessid'],
        userEmail: attributes.email,
        onboardingStatus: attributes['custom:onboarding'],
        setupDone: attributes['custom:setupdone'],
      });
    } catch (cognitoError) {
      logger.warn('[SessionDiagnostics] Error fetching Cognito attributes', cognitoError);
    }
    
    // Check session storage
    const tokenRefreshCount = sessionStorage.getItem('tokenRefreshCount');
    const lastTokenRefreshTime = sessionStorage.getItem('lastTokenRefreshTime');
    
    logger.debug('[SessionDiagnostics] sessionStorage state', {
      tokenRefreshCount,
      lastTokenRefreshTime,
    });
    
    logger.debug('[SessionDiagnostics] Session health check complete');
  } catch (error) {
    logger.error('[SessionDiagnostics] Error checking session health', error);
  }
};

/**
 * Install a global diagnostics monitor that checks session health on page load
 */
export const installSessionDiagnostics = () => {
  if (typeof window === 'undefined') return;
  
  // Only run in development mode
  if (process.env.NODE_ENV !== 'development') return;
  
  try {
    // Check session health on page load
    window.addEventListener('load', () => {
      // Use setTimeout to ensure session initialization is complete
      setTimeout(checkSessionHealth, 1000);
    });
    
    // Also expose function globally for manual checks
    window.__checkSessionHealth = checkSessionHealth;
    
    logger.debug('[SessionDiagnostics] Diagnostics installed');
  } catch (error) {
    logger.error('[SessionDiagnostics] Error installing diagnostics', error);
  }
};

// Auto-install when this module is imported
installSessionDiagnostics(); 