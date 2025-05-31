/**
 * OAuth Debug Utilities
 * 
 * Provides comprehensive debugging tools for OAuth authentication flow
 */

import { cognitoAuth } from '@/lib/cognitoDirectAuth';
import { CognitoAttributes } from '@/utils/CognitoAttributes';

export const OAuthDebugUtils = {
  /**
   * Comprehensive authentication status check
   */
  getAuthStatus: () => {
    const status = {
      timestamp: new Date().toISOString(),
      isAuthenticated: false,
      hasTokens: false,
      hasUserInfo: false,
      tenantInfo: {
        found: false,
        source: null,
        value: null
      },
      onboardingInfo: {
        status: null,
        setupDone: false
      },
      errors: []
    };

    try {
      // Check basic authentication
      status.isAuthenticated = cognitoAuth.isAuthenticated();
      
      // Check for tokens
      const idToken = localStorage.getItem('idToken');
      const accessToken = localStorage.getItem('accessToken');
      status.hasTokens = !!(idToken && accessToken);
      
      // Check for user info
      const userInfo = cognitoAuth.getCurrentUser();
      status.hasUserInfo = !!userInfo;
      
      if (userInfo) {
        status.userEmail = userInfo.email;
        status.userId = userInfo.sub;
      }
      
      // Check tenant ID from multiple sources
      const tenantSources = [
        { name: 'cognitoAuth.getTenantId()', method: () => cognitoAuth.getTenantId() },
        { name: 'localStorage.tenant_id', method: () => localStorage.getItem('tenant_id') },
        { name: 'localStorage.tenantId', method: () => localStorage.getItem('tenantId') },
        { name: 'CognitoAttributes', method: () => CognitoAttributes.getTenantId(cognitoAuth.getCustomAttributes()) }
      ];
      
      for (const source of tenantSources) {
        try {
          const value = source.method();
          if (value) {
            status.tenantInfo.found = true;
            status.tenantInfo.source = source.name;
            status.tenantInfo.value = value;
            break;
          }
        } catch (error) {
          status.errors.push(`Error checking ${source.name}: ${error.message}`);
        }
      }
      
      // Check onboarding status
      try {
        const customAttributes = cognitoAuth.getCustomAttributes();
        status.onboardingInfo.status = customAttributes['custom:onboarding'] || 'not_started';
        status.onboardingInfo.setupDone = customAttributes['custom:setupdone'] === 'true';
      } catch (error) {
        status.errors.push(`Error checking onboarding status: ${error.message}`);
      }
      
    } catch (error) {
      status.errors.push(`General error: ${error.message}`);
    }
    
    return status;
  },

  /**
   * Log comprehensive authentication information
   */
  logAuthInfo: () => {
    const status = OAuthDebugUtils.getAuthStatus();
    
    console.group('[OAuth Debug] Authentication Status');
    console.log('Timestamp:', status.timestamp);
    console.log('Is Authenticated:', status.isAuthenticated);
    console.log('Has Tokens:', status.hasTokens);
    console.log('Has User Info:', status.hasUserInfo);
    
    if (status.userEmail) {
      console.log('User Email:', status.userEmail);
      console.log('User ID:', status.userId);
    }
    
    console.log('Tenant Info:', status.tenantInfo);
    console.log('Onboarding Info:', status.onboardingInfo);
    
    if (status.errors.length > 0) {
      console.warn('Errors:', status.errors);
    }
    
    console.groupEnd();
    
    return status;
  },

  /**
   * Get recommended redirect path based on user status
   */
  getRecommendedRedirect: () => {
    const status = OAuthDebugUtils.getAuthStatus();
    
    if (!status.isAuthenticated) {
      return {
        path: '/auth/signin',
        reason: 'User not authenticated'
      };
    }
    
    if (!status.hasUserInfo) {
      return {
        path: '/auth/signin?error=no_user_info',
        reason: 'No user information available'
      };
    }
    
    // If setup is done and has tenant, go to dashboard
    if (status.onboardingInfo.setupDone && status.tenantInfo.found) {
      return {
        path: `/tenant/${status.tenantInfo.value}/dashboard`,
        reason: 'User setup complete with tenant'
      };
    }
    
    // If has tenant but setup not done, continue onboarding
    if (status.tenantInfo.found && !status.onboardingInfo.setupDone) {
      const onboardingStatus = status.onboardingInfo.status;
      let nextStep = '/onboarding/business-info';
      
      switch (onboardingStatus.toLowerCase()) {
        case 'business-info':
        case 'business_info':
          nextStep = '/onboarding/subscription';
          break;
        case 'subscription':
          nextStep = '/onboarding/payment';
          break;
        case 'payment':
          nextStep = '/onboarding/setup';
          break;
        case 'setup':
          nextStep = '/onboarding/setup';
          break;
      }
      
      return {
        path: nextStep,
        reason: `Continue onboarding from ${onboardingStatus}`
      };
    }
    
    // New user or no tenant - start onboarding
    return {
      path: '/onboarding/business-info',
      reason: 'New user or no tenant found'
    };
  },

  /**
   * Validate OAuth flow completion
   */
  validateOAuthFlow: () => {
    const validation = {
      isValid: true,
      issues: [],
      warnings: [],
      recommendations: []
    };
    
    const status = OAuthDebugUtils.getAuthStatus();
    
    // Critical issues
    if (!status.isAuthenticated) {
      validation.isValid = false;
      validation.issues.push('User is not authenticated');
    }
    
    if (!status.hasTokens) {
      validation.isValid = false;
      validation.issues.push('Authentication tokens are missing');
    }
    
    if (!status.hasUserInfo) {
      validation.isValid = false;
      validation.issues.push('User information is not available');
    }
    
    // Warnings
    if (!status.tenantInfo.found) {
      validation.warnings.push('No tenant ID found - user may be new');
    }
    
    if (status.errors.length > 0) {
      validation.warnings.push(`${status.errors.length} errors occurred during status check`);
    }
    
    // Recommendations
    if (!status.tenantInfo.found) {
      validation.recommendations.push('Start onboarding flow to create tenant');
    }
    
    if (status.tenantInfo.found && !status.onboardingInfo.setupDone) {
      validation.recommendations.push('Continue onboarding to complete setup');
    }
    
    return validation;
  },

  /**
   * Clear all authentication data (for testing)
   */
  clearAuthData: () => {
    const keysToRemove = [
      'idToken', 'accessToken', 'refreshToken', 'userInfo',
      'tenant_id', 'tenantId', 'businessId', 'user_profile',
      'user_email', 'cognito_sub'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear app cache
    if (typeof window !== 'undefined' && window.__APP_CACHE) {
      delete window.__APP_CACHE.user;
      delete window.__APP_CACHE.tenant;
      delete window.__APP_CACHE.oauth;
    }
    
    console.log('[OAuth Debug] Cleared all authentication data');
  },

  /**
   * Export debug data for support
   */
  exportDebugData: () => {
    const status = OAuthDebugUtils.getAuthStatus();
    const validation = OAuthDebugUtils.validateOAuthFlow();
    
    const debugExport = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      authStatus: status,
      validation: validation,
      localStorage: {},
      appCache: typeof window !== 'undefined' ? window.__APP_CACHE : null
    };
    
    // Export relevant localStorage data (without sensitive tokens)
    const relevantKeys = ['user_profile', 'user_email', 'tenant_id', 'tenantId'];
    relevantKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          debugExport.localStorage[key] = JSON.parse(value);
        } catch {
          debugExport.localStorage[key] = value;
        }
      }
    });
    
    return debugExport;
  }
};

// Global debug function for console access
if (typeof window !== 'undefined') {
  window.oauthDebug = OAuthDebugUtils;
} 