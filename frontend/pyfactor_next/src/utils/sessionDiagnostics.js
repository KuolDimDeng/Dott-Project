'use client';


import { logger } from '@/utils/logger';

/**
 * Utility to diagnose common session issues and log helpful information
 */
export const checkSessionHealth = () => {
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
    
    // Check localStorage
    const tenantId = localStorage.getItem('tenantId');
    const userEmail = localStorage.getItem('userEmail');
    const previouslyOnboarded = localStorage.getItem('previouslyOnboarded');
    
    logger.debug('[SessionDiagnostics] localStorage state', {
      tenantId,
      userEmail,
      previouslyOnboarded,
    });
    
    // Check cookies
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) cookies[name] = value;
    });
    
    logger.debug('[SessionDiagnostics] Cookies state', {
      authToken: cookies.authToken ? '✓ Present' : '✗ Missing',
      authUser: cookies.authUser,
      tenantId: cookies.tenantId,
      hasSession: cookies.hasSession,
      bypassAuthValidation: cookies.bypassAuthValidation,
    });
    
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
    window.addEventListener('load', checkSessionHealth);
    
    // Also expose function globally for manual checks
    window.__checkSessionHealth = checkSessionHealth;
    
    logger.debug('[SessionDiagnostics] Diagnostics installed');
  } catch (error) {
    logger.error('[SessionDiagnostics] Error installing diagnostics', error);
  }
};

// Auto-install when this module is imported
installSessionDiagnostics(); 