/**
 * Auth0 Service - Centralized authentication service
 * Handles all Auth0 operations with proper tenant isolation
 */

import { v4 as uuidv4 } from 'uuid';

class Auth0Service {
  constructor() {
    this.domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'auth.dottapps.com';
    this.clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    this.audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.dottapps.com';
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
  }

  /**
   * Generate a unique session ID for this authentication session
   * This ensures each user gets their own unique context
   */
  generateSessionId() {
    return `session_${uuidv4()}`;
  }

  /**
   * Get or create a user-specific storage key based on Auth0 sub
   * This prevents tenant ID sharing between users
   */
  getUserStorageKey(auth0Sub) {
    return `auth0_user_${auth0Sub}`;
  }

  /**
   * Create or get user with proper tenant isolation
   * CRITICAL: Each user must have their own unique tenant ID
   */
  async createOrGetUser(sessionData) {
    const { user, accessToken } = sessionData;
    
    if (!user?.sub || !user?.email) {
      throw new Error('Invalid user data');
    }

    console.log('[Auth0Service] Creating/getting user for:', user.email);

    try {
      // Create a unique session identifier for this request
      const sessionId = this.generateSessionId();
      
      // Call the backend API to create or get the user
      const response = await fetch('/api/auth0/user-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          auth0_sub: user.sub,
          email: user.email,
          name: user.name || '',
          given_name: user.given_name || '',
          family_name: user.family_name || '',
          picture: user.picture || '',
          email_verified: user.email_verified || false,
          // Include session ID to ensure request isolation
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sync user: ${response.status}`);
      }

      const userData = await response.json();
      
      // Validate that we got a unique tenant ID
      if (!userData.tenant_id) {
        throw new Error('No tenant ID assigned to user');
      }

      console.log('[Auth0Service] User sync successful:', {
        email: userData.email,
        tenant_id: userData.tenant_id,
        needs_onboarding: userData.needs_onboarding
      });

      // Store user data in a user-specific key to prevent cross-contamination
      const storageKey = this.getUserStorageKey(user.sub);
      const userSpecificData = {
        tenant_id: userData.tenant_id,
        email: userData.email,
        needs_onboarding: userData.needs_onboarding,
        onboarding_completed: userData.onboarding_completed,
        last_sync: new Date().toISOString()
      };

      // Use sessionStorage for better isolation (cleared when browser closes)
      sessionStorage.setItem(storageKey, JSON.stringify(userSpecificData));

      return userData;

    } catch (error) {
      console.error('[Auth0Service] Error syncing user:', error);
      throw error;
    }
  }

  /**
   * Get user data from storage with proper isolation
   */
  getUserData(auth0Sub) {
    if (!auth0Sub) return null;
    
    const storageKey = this.getUserStorageKey(auth0Sub);
    const storedData = sessionStorage.getItem(storageKey);
    
    if (storedData) {
      try {
        return JSON.parse(storedData);
      } catch (error) {
        console.error('[Auth0Service] Error parsing stored user data:', error);
        sessionStorage.removeItem(storageKey);
      }
    }
    
    return null;
  }

  /**
   * Clear user data on logout
   */
  clearUserData(auth0Sub) {
    if (!auth0Sub) return;
    
    const storageKey = this.getUserStorageKey(auth0Sub);
    sessionStorage.removeItem(storageKey);
    
    // Also clear any legacy cookies that might cause issues
    document.cookie = 'user_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'tenantId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  /**
   * Update user metadata in Auth0
   */
  async updateUserMetadata(userId, metadata) {
    try {
      const response = await fetch('/api/auth0/update-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user metadata');
      }

      return await response.json();
    } catch (error) {
      console.error('[Auth0Service] Error updating metadata:', error);
      throw error;
    }
  }

  /**
   * Close user account
   */
  async closeUserAccount(userId, reason, feedback) {
    try {
      const response = await fetch('/api/auth0/close-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          reason,
          feedback,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to close account');
      }

      const result = await response.json();
      
      // Clear all user data
      this.clearUserData(userId);
      
      return result;
    } catch (error) {
      console.error('[Auth0Service] Error closing account:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async checkOnboardingStatus(auth0Sub, accessToken) {
    try {
      const response = await fetch('/api/auth0/onboarding-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check onboarding status');
      }

      const status = await response.json();
      
      // Update local storage with latest status
      const storageKey = this.getUserStorageKey(auth0Sub);
      const storedData = this.getUserData(auth0Sub) || {};
      
      sessionStorage.setItem(storageKey, JSON.stringify({
        ...storedData,
        needs_onboarding: status.needs_onboarding,
        onboarding_completed: status.onboarding_completed,
        current_step: status.current_step,
        last_check: new Date().toISOString()
      }));

      return status;
    } catch (error) {
      console.error('[Auth0Service] Error checking onboarding status:', error);
      throw error;
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(auth0Sub, onboardingData) {
    try {
      const response = await fetch('/api/auth0/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auth0_sub: auth0Sub,
          ...onboardingData,
          completed_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      const result = await response.json();
      
      // Update local storage
      const storageKey = this.getUserStorageKey(auth0Sub);
      const storedData = this.getUserData(auth0Sub) || {};
      
      sessionStorage.setItem(storageKey, JSON.stringify({
        ...storedData,
        needs_onboarding: false,
        onboarding_completed: true,
        onboarding_completed_at: result.completed_at
      }));

      return result;
    } catch (error) {
      console.error('[Auth0Service] Error completing onboarding:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const auth0Service = new Auth0Service();
export default auth0Service;