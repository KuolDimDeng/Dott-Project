/**
 * Get authentication headers for API requests
 * Checks both sessionStorage/localStorage and returns proper headers
 */

import { sessionManagerEnhanced } from './sessionManager-v2-enhanced';

export async function getAuthHeaders() {
  try {
    // Get session from sessionManager
    const session = await sessionManagerEnhanced.getSession();
    
    if (session && session.accessToken) {
      return {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      };
    }
    
    // Check localStorage directly as fallback
    const localSession = localStorage.getItem('dott_session');
    if (localSession) {
      const parsed = JSON.parse(localSession);
      if (parsed.accessToken) {
        return {
          'Authorization': `Bearer ${parsed.accessToken}`,
          'Content-Type': 'application/json'
        };
      }
    }
    
    // No auth headers available
    return {
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('[getAuthHeaders] Error:', error);
    return {
      'Content-Type': 'application/json'
    };
  }
}