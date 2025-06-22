/**
 * Session Refresh Utility
 * Forces frontend to refresh session data from backend after important updates
 */

import { logger } from '@/utils/logger';

/**
 * Force refresh session data from backend
 * This is critical after onboarding completion or subscription changes
 */
export async function refreshSessionData() {
  try {
    logger.info('[SessionRefresh] Forcing session data refresh from backend');
    
    // Clear any cached session data
    if (typeof window !== 'undefined') {
      // Clear sessionStorage
      sessionStorage.removeItem('session');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('profile');
      
      // Clear any cached data in localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('session') || key.includes('profile') || key.includes('user'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // Call session-v2 endpoint to get fresh data
    const response = await fetch('/api/auth/session-v2', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      logger.error('[SessionRefresh] Failed to refresh session:', response.status);
      return null;
    }
    
    const sessionData = await response.json();
    logger.info('[SessionRefresh] Session refreshed successfully:', {
      authenticated: sessionData.authenticated,
      email: sessionData.user?.email,
      businessName: sessionData.user?.businessName,
      subscriptionPlan: sessionData.user?.subscriptionPlan,
      needsOnboarding: sessionData.user?.needsOnboarding
    });
    
    // Trigger a custom event that components can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sessionRefreshed', { 
        detail: sessionData 
      }));
    }
    
    return sessionData;
  } catch (error) {
    logger.error('[SessionRefresh] Error refreshing session:', error);
    return null;
  }
}

/**
 * Add listener for session refresh events
 */
export function onSessionRefresh(callback) {
  if (typeof window !== 'undefined') {
    window.addEventListener('sessionRefreshed', (event) => {
      callback(event.detail);
    });
    
    // Return cleanup function
    return () => {
      window.removeEventListener('sessionRefreshed', callback);
    };
  }
  
  // No-op cleanup if not in browser
  return () => {};
}

/**
 * Wait for session to be fully updated after onboarding
 * Polls the backend until needsOnboarding is false
 */
export async function waitForSessionUpdate(maxAttempts = 10, delayMs = 1000) {
  logger.info('[SessionRefresh] Waiting for session to update after onboarding');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const sessionData = await refreshSessionData();
    
    if (sessionData && sessionData.authenticated && !sessionData.user?.needsOnboarding) {
      logger.info('[SessionRefresh] Session updated successfully after ' + attempt + ' attempts');
      return sessionData;
    }
    
    if (attempt < maxAttempts) {
      logger.info('[SessionRefresh] Session not updated yet, waiting... (attempt ' + attempt + ')');
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  logger.error('[SessionRefresh] Session update timeout after ' + maxAttempts + ' attempts');
  return null;
}