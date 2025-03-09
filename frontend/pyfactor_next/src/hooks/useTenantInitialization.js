import { useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { getTenantId, storeTenantInfo } from '@/utils/tenantUtils';
import { useAuth } from './auth';

/**
 * Hook to handle tenant initialization during login/registration
 * This ensures that every user has a tenant ID assigned
 */
export function useTenantInitialization() {
  const auth = useAuth();

  /**
   * Initialize tenant ID for a user
   * @param {Object} user - The authenticated user object
   * @returns {string} The tenant ID
   */
  const initializeTenantId = useCallback(async (user) => {
    try {
      // Check if tenant ID already exists
      let tenantId = getTenantId();
      
      if (!tenantId) {
        // Try to get tenant ID from user attributes
        if (user?.attributes?.['custom:businessid']) {
          tenantId = user.attributes['custom:businessid'];
          logger.debug('[TenantInit] Using tenant ID from user attributes:', tenantId);
        } else {
          // Generate a new tenant ID
          tenantId = uuidv4();
          logger.debug('[TenantInit] Generated new tenant ID:', tenantId);
          
          // Update user attributes with the new tenant ID if possible
          try {
            const { updateUserAttributes } = await import('aws-amplify/auth');
            await updateUserAttributes({
              userAttributes: {
                'custom:businessid': tenantId
              }
            });
            logger.debug('[TenantInit] Updated user attributes with tenant ID');
          } catch (error) {
            logger.error('[TenantInit] Failed to update user attributes:', error);
          }
        }
        
        // Store tenant ID in cookies and localStorage
        storeTenantInfo(tenantId);
      }
      
      return tenantId;
    } catch (error) {
      logger.error('[TenantInit] Error initializing tenant ID:', error);
      return null;
    }
  }, []);

  /**
   * Handle user login
   * @param {string} username - The username
   * @param {string} password - The password
   */
  const handleLogin = useCallback(async (username, password) => {
    try {
      // Use the auth.signIn function directly
      const result = await auth.signIn(username, password);
      
      if (result.success) {
        try {
          // Initialize tenant ID after successful login
          const tenantId = await initializeTenantId(result.user);
          logger.debug('[TenantInit] Tenant ID initialized after login:', tenantId);
        } catch (tenantError) {
          // Log but don't fail the login process
          logger.error('[TenantInit] Error initializing tenant ID after login:', tenantError);
        }
      }
      
      return result;
    } catch (error) {
      logger.error('[TenantInit] Login error:', error);
      throw error;
    }
  }, [auth, initializeTenantId]);

  /**
   * Handle user registration
   * @param {Object} userData - The user registration data
   */
  const handleRegistration = useCallback(async (userData) => {
    try {
      // Generate tenant ID before registration
      const tenantId = uuidv4();
      logger.debug('[TenantInit] Generated tenant ID for registration:', tenantId);
      
      // Add tenant ID to user attributes
      const enhancedUserData = {
        ...userData,
        'custom:businessid': tenantId
      };
      
      // Register user with tenant ID
      const result = await auth.signUp(enhancedUserData);
      
      if (result.success) {
        // Store tenant ID in cookies and localStorage
        storeTenantInfo(tenantId);
        logger.debug('[TenantInit] Tenant ID stored after registration');
      }
      
      return result;
    } catch (error) {
      logger.error('[TenantInit] Registration error:', error);
      throw error;
    }
  }, [auth]);

  // Initialize tenant ID on component mount if user is already authenticated
  useEffect(() => {
    const initializeExistingUser = async () => {
      try {
        // First check if we're on a public route like sign-in or sign-up
        const isPublicRoute = window.location.pathname.includes('/auth/');
        if (isPublicRoute) {
          logger.debug('[TenantInit] Skipping tenant initialization on public route:', window.location.pathname);
          return;
        }
        
        // Check if user is authenticated before trying to get current user
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const { tokens } = await fetchAuthSession();
        
        if (!tokens?.idToken) {
          logger.debug('[TenantInit] No active session, skipping tenant initialization');
          return;
        }
        
        // Now it's safe to get the current user
        const { getCurrentUser } = await import('aws-amplify/auth');
        const user = await getCurrentUser();
        
        if (user) {
          const tenantId = await initializeTenantId(user);
          logger.debug('[TenantInit] Tenant ID initialized for existing user:', tenantId);
        }
      } catch (error) {
        // Only log as error if it's not an authentication error
        if (error.name === 'UserUnAuthenticatedException') {
          logger.debug('[TenantInit] User not authenticated, skipping tenant initialization');
        } else {
          logger.error('[TenantInit] Error initializing tenant for existing user:', error);
        }
      }
    };
    
    initializeExistingUser();
  }, [initializeTenantId]);

  return {
    login: handleLogin,
    register: handleRegistration,
    initializeTenantId
  };
}