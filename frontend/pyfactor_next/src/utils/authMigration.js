/**
 * Auth Migration Utility
 * Helps migrate from localStorage to secure cookie authentication
 */

import { cleanupLocalStorage } from './secureAuth';

/**
 * Check if user has old localStorage session
 */
export function hasLegacySession() {
  if (typeof window === 'undefined') return false;
  
  const legacyKeys = [
    'dott_session',
    'appSession',
    'auth_token',
    'access_token'
  ];
  
  return legacyKeys.some(key => localStorage.getItem(key) !== null);
}

/**
 * Migrate from localStorage to cookies
 * This should be called once on app initialization
 */
export async function migrateAuthStorage() {
  if (typeof window === 'undefined') return;
  
  // Check if migration is needed
  if (!hasLegacySession()) {
    console.log('[AuthMigration] No legacy session found, skipping migration');
    return;
  }
  
  console.log('[AuthMigration] Starting auth storage migration...');
  
  try {
    // Get old session data
    const oldSession = localStorage.getItem('dott_session');
    if (oldSession) {
      const sessionData = JSON.parse(oldSession);
      
      // Check if we have valid tokens
      if (sessionData.accessToken && sessionData.user) {
        console.log('[AuthMigration] Found valid session, migrating to secure cookies...');
        
        // Create new secure session
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            accessToken: sessionData.accessToken || sessionData.access_token,
            idToken: sessionData.idToken || sessionData.id_token,
            user: sessionData.user
          })
        });
        
        if (response.ok) {
          console.log('[AuthMigration] Successfully migrated to secure cookies');
          // Clean up localStorage after successful migration
          cleanupLocalStorage();
        } else {
          console.error('[AuthMigration] Failed to create secure session');
        }
      }
    }
  } catch (error) {
    console.error('[AuthMigration] Migration error:', error);
  }
}

/**
 * Add deprecation warnings to sessionManager methods
 */
export function addDeprecationWarnings() {
  if (typeof window === 'undefined') return;
  
  // Override localStorage methods to show warnings
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    const authKeys = ['dott_session', 'appSession', 'auth_token', 'access_token', 'id_token'];
    if (authKeys.includes(key)) {
      console.warn(`[SecurityWarning] Storing '${key}' in localStorage is deprecated and insecure. Use secure cookies instead.`);
    }
    return originalSetItem.call(this, key, value);
  };
}

/**
 * Initialize auth migration on app load
 */
export function initializeAuthMigration() {
  if (typeof window === 'undefined') return;
  
  // Run migration on next tick to avoid blocking
  setTimeout(() => {
    migrateAuthStorage();
    
    // Add warnings in development only
    if (process.env.NODE_ENV === 'development') {
      addDeprecationWarnings();
    }
  }, 0);
}