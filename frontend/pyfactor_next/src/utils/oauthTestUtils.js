import { appCache } from '../utils/appCache';

/**
 * OAuth Testing Utilities
 * 
 * Helper functions to test and verify OAuth flow functionality
 */

import { cognitoAuth } from '@/lib/cognitoDirectAuth';
import { CognitoAttributes } from '@/utils/CognitoAttributes';
import { OAuthDebugUtils } from '@/utils/oauthDebugUtils';

export const OAuthTestUtils = {
  /**
   * Simulate a complete OAuth flow test
   */
  testCompleteFlow: async () => {
    console.group('🧪 OAuth Flow Test');
    
    try {
      // Step 1: Check authentication status
      console.log('1. Checking authentication status...');
      const authStatus = OAuthDebugUtils.getAuthStatus();
      console.log('Auth Status:', authStatus);
      
      if (!authStatus.isAuthenticated) {
        console.error('❌ User is not authenticated. Please sign in first.');
        return { success: false, step: 'authentication', error: 'Not authenticated' };
      }
      
      // Step 2: Test tenant ID extraction
      console.log('2. Testing tenant ID extraction...');
      const tenantId = cognitoAuth.getTenantId();
      console.log('Tenant ID from cognitoAuth:', tenantId);
      
      const customAttributes = cognitoAuth.getCustomAttributes();
      const tenantIdFromAttributes = CognitoAttributes.getTenantId(customAttributes);
      console.log('Tenant ID from attributes:', tenantIdFromAttributes);
      
      // Step 3: Test redirect recommendation
      console.log('3. Testing redirect recommendation...');
      const recommendation = OAuthDebugUtils.getRecommendedRedirect();
      console.log('Redirect recommendation:', recommendation);
      
      // Step 4: Validate OAuth flow
      console.log('4. Validating OAuth flow...');
      const validation = OAuthDebugUtils.validateOAuthFlow();
      console.log('Validation result:', validation);
      
      const result = {
        success: validation.isValid,
        authStatus,
        tenantId,
        tenantIdFromAttributes,
        recommendation,
        validation,
        timestamp: new Date().toISOString()
      };
      
      if (validation.isValid) {
        console.log('✅ OAuth flow test passed');
      } else {
        console.warn('⚠️ OAuth flow test has issues:', validation.issues);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ OAuth flow test failed:', error);
      return { success: false, error: error.message };
    } finally {
      console.groupEnd();
    }
  },

  /**
   * Test tenant ID extraction specifically
   */
  testTenantIdExtraction: () => {
    console.group('🔍 Tenant ID Extraction Test');
    
    const results = {
      methods: {},
      summary: {
        found: false,
        source: null,
        value: null
      }
    };
    
    try {
      // Method 1: Direct from cognitoAuth
      const method1 = cognitoAuth.getTenantId();
      results.methods.cognitoAuth = method1;
      console.log('Method 1 - cognitoAuth.getTenantId():', method1);
      
      // Method 2: From custom attributes
      const customAttributes = cognitoAuth.getCustomAttributes();
      const method2 = CognitoAttributes.getTenantId(customAttributes);
      results.methods.customAttributes = method2;
      console.log('Method 2 - CognitoAttributes.getTenantId():', method2);
      
      // Method 3: From localStorage
      const method3 = localStorage.getItem('tenant_id') || localStorage.getItem('tenantId');
      results.methods.localStorage = method3;
      console.log('Method 3 - localStorage:', method3);
      
      // Method 4: From JWT token
      let method4 = null;
      try {
        const idToken = localStorage.getItem('idToken');
        if (idToken) {
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          method4 = payload['custom:tenant_ID'] || payload['custom:tenant_id'] || payload['custom:businessid'];
        }
      } catch (e) {
        console.warn('Error decoding JWT:', e.message);
      }
      results.methods.jwtToken = method4;
      console.log('Method 4 - JWT token:', method4);
      
      // Method 5: From app cache
      const method5 = appCache.getAll()
      results.methods.appCache = method5;
      console.log('Method 5 - App cache:', method5);
      
      // Determine which method found the tenant ID
      const foundTenantId = method1 || method2 || method3 || method4 || method5;
      if (foundTenantId) {
        results.summary.found = true;
        results.summary.value = foundTenantId;
        
        if (method1) results.summary.source = 'cognitoAuth';
        else if (method2) results.summary.source = 'customAttributes';
        else if (method3) results.summary.source = 'localStorage';
        else if (method4) results.summary.source = 'jwtToken';
        else if (method5) results.summary.source = 'appCache';
        
        console.log('✅ Tenant ID found:', foundTenantId, 'via', results.summary.source);
      } else {
        console.log('❌ No tenant ID found with any method');
      }
      
    } catch (error) {
      console.error('❌ Tenant ID extraction test failed:', error);
      results.error = error.message;
    } finally {
      console.groupEnd();
    }
    
    return results;
  },

  /**
   * Test user status determination
   */
  testUserStatus: () => {
    console.group('👤 User Status Test');
    
    const results = {
      user: null,
      attributes: {},
      onboardingStatus: null,
      setupDone: false,
      recommendations: null
    };
    
    try {
      // Get current user
      const user = cognitoAuth.getCurrentUser();
      results.user = user;
      console.log('Current user:', user?.email || 'None');
      
      if (user) {
        // Get attributes
        const customAttributes = cognitoAuth.getCustomAttributes();
        const allAttributes = cognitoAuth.getUserAttributes();
        results.attributes = { customAttributes, allAttributes };
        
        // Determine onboarding status
        const onboardingStatus = customAttributes['custom:onboarding'] || 
                               allAttributes['custom:onboarding'] ||
                               'not_started';
        
        const setupDone = (customAttributes['custom:setupdone'] === 'true' || 
                          customAttributes['custom:setupdone'] === 'TRUE' ||
                          allAttributes['custom:setupdone'] === 'true' ||
                          allAttributes['custom:setupdone'] === 'TRUE');
        
        results.onboardingStatus = onboardingStatus;
        results.setupDone = setupDone;
        
        console.log('Onboarding Status:', onboardingStatus);
        console.log('Setup Done:', setupDone);
        console.log('Custom Attributes Count:', Object.keys(customAttributes).length);
        console.log('All Attributes Count:', Object.keys(allAttributes).length);
        
        // Get recommendations
        const recommendations = OAuthDebugUtils.getRecommendedRedirect();
        results.recommendations = recommendations;
        console.log('Recommendations:', recommendations);
      }
      
      console.log('✅ User status test completed');
      
    } catch (error) {
      console.error('❌ User status test failed:', error);
      results.error = error.message;
    } finally {
      console.groupEnd();
    }
    
    return results;
  },

  /**
   * Simulate the OAuth success flow without actual redirect
   */
  simulateOAuthSuccess: () => {
    console.group('🎭 OAuth Success Simulation');
    
    try {
      console.log('Simulating OAuth success page logic...');
      
      // Check authentication
      if (!cognitoAuth.isAuthenticated()) {
        console.error('❌ Not authenticated');
        return { success: false, error: 'Not authenticated' };
      }
      
      // Get user
      const user = cognitoAuth.getCurrentUser();
      if (!user) {
        console.error('❌ No user found');
        return { success: false, error: 'No user found' };
      }
      
      console.log('✅ User found:', user.email);
      
      // Extract tenant ID with multiple methods
      let tenantId = null;
      let extractionMethod = 'none';
      
      // Try multiple extraction methods
      tenantId = cognitoAuth.getTenantId();
      if (tenantId) {
        extractionMethod = 'cognitoAuth.getTenantId()';
      } else {
        tenantId = user.tenantId || user.tenant_id;
        if (tenantId) {
          extractionMethod = 'user object';
        } else {
          const customAttributes = cognitoAuth.getCustomAttributes();
          tenantId = CognitoAttributes.getTenantId(customAttributes);
          if (tenantId) {
            extractionMethod = 'CognitoAttributes.getTenantId()';
          }
        }
      }
      
      // Determine user status
      const customAttributes = cognitoAuth.getCustomAttributes();
      const onboardingStatus = customAttributes['custom:onboarding'] || 'not_started';
      const setupDone = customAttributes['custom:setupdone'] === 'true';
      
      // Determine redirect
      let redirectPath = '/onboarding/business-info?newUser=true&provider=google&fromAuth=true';
      let reason = 'New user or no tenant - start onboarding';
      
      if (setupDone && tenantId) {
        redirectPath = `/tenant/${tenantId}/dashboard?fromAuth=true&provider=google`;
        reason = 'Setup complete with tenant';
      } else if (tenantId && onboardingStatus !== 'not_started') {
        const normalizedStatus = onboardingStatus.toLowerCase().replace(/[_-]/g, '');
        let nextStep = '/onboarding/business-info';
        
        switch (normalizedStatus) {
          case 'businessinfo':
          case 'business':
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
          default:
            nextStep = '/onboarding/business-info';
        }
        
        redirectPath = `${nextStep}?fromAuth=true&provider=google&tenantId=${tenantId}`;
        reason = `Continue onboarding from ${onboardingStatus}`;
      }
      
      const result = {
        success: true,
        user: {
          email: user.email,
          sub: user.sub
        },
        tenantId,
        extractionMethod,
        onboardingStatus,
        setupDone,
        redirectPath,
        reason,
        customAttributesCount: Object.keys(customAttributes).length
      };
      
      console.log('✅ Simulation result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ OAuth success simulation failed:', error);
      return { success: false, error: error.message };
    } finally {
      console.groupEnd();
    }
  }
};

// Global access for testing
if (typeof window !== 'undefined') {
  window.oauthTest = OAuthTestUtils;
} 