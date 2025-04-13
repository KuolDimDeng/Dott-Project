import { logger } from '@/utils/logger';
import { getTenantIdFromCognito, updateTenantIdInCognito } from '@/utils/tenantUtils';

/**
 * Utility functions to help migrate from cookie/localStorage to Cognito attributes
 */

/**
 * Migrates user data from cookies/localStorage to Cognito attributes
 * @returns {Promise<Object>} Result of the migration
 */
export async function migrateUserDataToCognito() {
  logger.info('[Migration] Starting migration of user data to Cognito');
  
  try {
    const migratedData = {};
    
    // Check and migrate tenantId from cookies or localStorage
    const localTenantId = getCookie('tenantId') || localStorage.getItem('tenantId');
    if (localTenantId) {
      migratedData.tenantId = localTenantId;
      
      // Check if the tenantId already exists in Cognito
      const cognitoTenantId = await getTenantIdFromCognito();
      if (!cognitoTenantId || cognitoTenantId !== localTenantId) {
        // Update the tenant ID in Cognito
        await updateTenantIdInCognito(localTenantId);
      }
    }
    
    // Check and migrate onboarding status
    const onboardingStatus = getCookie('onboardingStep') || localStorage.getItem('onboardingStep');
    if (onboardingStatus) {
      migratedData.onboardingStatus = onboardingStatus;
    }
    
    // Check and migrate setup completed status
    const setupCompleted = localStorage.getItem('setupCompleted') === 'true' || 
                          getCookie('setupCompleted') === 'true';
    migratedData.setupCompleted = setupCompleted;
    
    // Check and migrate business information
    const businessName = localStorage.getItem('businessName') || getCookie('businessName');
    if (businessName) {
      migratedData.businessName = businessName;
    }
    
    const businessType = localStorage.getItem('businessType') || getCookie('businessType');
    if (businessType) {
      migratedData.businessType = businessType;
    }
    
    // Call the migration API endpoint to update Cognito attributes
    const response = await fetch('/api/auth/migrate-to-cognito', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(migratedData),
    });
    
    const result = await response.json();
    
    if (result.success) {
      logger.info('[Migration] Successfully migrated user data to Cognito', {
        migratedAttributes: result.migrated_attributes,
      });
      
      // Clear cookies and localStorage after successful migration
      if (Object.keys(migratedData).length > 0) {
        clearMigratedLocalData(migratedData);
      }
      
      return {
        success: true,
        migratedData,
        message: 'User data successfully migrated to Cognito attributes',
      };
    } else {
      logger.error('[Migration] Failed to migrate user data to Cognito', {
        error: result.error,
        message: result.message,
      });
      
      return {
        success: false,
        error: result.error,
        message: result.message || 'Failed to migrate user data to Cognito',
      };
    }
  } catch (error) {
    logger.error('[Migration] Error during migration process:', error);
    return {
      success: false,
      error: 'Migration process failed',
      message: error.message || 'An unexpected error occurred during migration',
    };
  }
}

/**
 * Clears migrated data from cookies and localStorage
 * @param {Object} migratedData The data that was migrated
 */
function clearMigratedLocalData(migratedData) {
  try {
    // Clear from localStorage
    if (migratedData.tenantId) {
      localStorage.removeItem('tenantId');
    }
    if (migratedData.onboardingStatus) {
      localStorage.removeItem('onboardingStep');
    }
    if (migratedData.setupCompleted !== undefined) {
      localStorage.removeItem('setupCompleted');
    }
    if (migratedData.businessName) {
      localStorage.removeItem('businessName');
    }
    if (migratedData.businessType) {
      localStorage.removeItem('businessType');
    }
    
    // Clear from cookies
    if (migratedData.tenantId) {
      document.cookie = 'tenantId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.onboardingStatus) {
      document.cookie = 'onboardingStep=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.setupCompleted !== undefined) {
      document.cookie = 'setupCompleted=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.businessName) {
      document.cookie = 'businessName=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    if (migratedData.businessType) {
      document.cookie = 'businessType=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    
    logger.info('[Migration] Cleared migrated data from localStorage and cookies');
  } catch (error) {
    logger.error('[Migration] Error clearing local data after migration:', error);
  }
}

/**
 * Helper function to get a cookie value by name
 * @param {string} name The name of the cookie
 * @returns {string|null} The cookie value or null if not found
 */
function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

/**
 * Utility functions for cleaning up legacy cookie and localStorage data
 */

/**
 * Clears all legacy cookies and localStorage items that have been migrated to Cognito
 * Call this after successful authentication to clean up old data
 */
export async function clearLegacyStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    logger.info('[migrationUtils] Clearing legacy cookies and localStorage data');
    
    // Clear cookies - expanded to include all possible cookies
    const cookiesToClear = [
      // Tenant IDs and Business info
      'tenantId', 'businessid', 'businessName', 'businessType', 'businessSubtypes',
      'business_name', 'business_type', 'country', 'business_country', 'business_state',
      'legalStructure', 'dateFounded', 'business_date_founded',
      
      // Auth tokens
      'idToken', 'accessToken', 'refreshToken', 'authToken', 'tokenExpires', 'tokenTimestamp',
      
      // Onboarding status
      'onboardingStep', 'onboardedStatus', 'setupCompleted', 'businessInfoCompleted', 
      'subscriptionCompleted', 'paymentCompleted', 'tokenExpired', 'freePlanSelected',
      'navigatingTo', 'onboardingInProgress',
      
      // Subscription info
      'subscriptionPlan', 'subscriptionInterval', 'subplan', 'billingCycle', 'subprice',
      
      // User info
      'email', 'userEmail', 'first_name', 'firstName', 'given_name', 
      'last_name', 'lastName', 'family_name', 'hasSession',
      
      // Setup flags
      'setupSkipDatabaseCreation', 'setupUseRLS', 'skipSchemaCreation', 'setupTimestamp'
    ];
    
    cookiesToClear.forEach(name => {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
    
    // Clear localStorage - expanded to include all possible keys
    const localStorageToClear = [
      // Tenant IDs and Business info
      'tenantId', 'tenant', 'tenantData', 'tenantName', 'businessid', 'businessName', 'businessType',
      'businessSubtypes', 'businessInfo', 'businessCountry', 'businessState', 'legalStructure',
      'dateFounded', 'proper_tenant_id', 'custom:businessname', 'custom:businesstype',
      'custom:tenant_id', 'custom:businessid', 'custom:tenant_ID',
      
      // Auth tokens
      'idToken', 'accessToken', 'refreshToken', 'tokenTimestamp', 'tokenExpires', 'authToken',
      'token_expired', 'token_expired_at', 'token_expires', 'authSuccess',
      
      // Onboarding status
      'onboardingStep', 'onboardingStatus', 'onboardedStatus', 'setupCompleted', 'setupdone',
      'freePlanSelected', 'onboardingBusinessInfo', 'onboardingSubscription', 'onboardingPayment',
      'onboardingCompletedAt', 'custom:onboarding', 'custom:setupdone', 'custom:business_info_done',
      'custom:subscription_done', 'custom:payment_done', 'custom:onboardingCompletedAt',
      
      // Subscription info
      'subscriptionPlan', 'subscriptionInterval', 'billingCycle', 'subplan', 'subprice',
      'custom:subplan', 'custom:billingcycle', 'custom:subprice',
      
      // User info
      'userEmail', 'email', 'firstName', 'lastName', 'authUser', 'userProfileData',
      'userProfileTimestamp',
      
      // Setup flags
      'setupSkipDatabaseCreation', 'setupUseRLS', 'skipSchemaCreation', 'setupTimestamp',
      
      // Redirection markers
      'returnToOnboarding', 'lastRedirect', 'redirectAttempts', 'signin_attempts',
      'business_auth_errors', 'business_info_auth_errors', 'client_redirect_count'
    ];
    
    // Clear localStorage keys
    localStorageToClear.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore errors for individual keys
      }
    });
    
    // Store a flag to indicate migration is complete
    try {
      localStorage.setItem('migration_to_cognito_completed', 'true');
      localStorage.setItem('migration_to_cognito_timestamp', new Date().toISOString());
    } catch (e) {
      // Ignore storage errors
    }
    
    logger.info('[migrationUtils] Legacy data cleared successfully');
    return true;
  } catch (error) {
    logger.error('[migrationUtils] Error clearing legacy data:', error);
    return false;
  }
}

/**
 * Gets current Cognito user attributes or null if not authenticated
 */
export async function getUserAttributes() {
  try {
    const { fetchUserAttributes } = await import('aws-amplify/auth');
    return await fetchUserAttributes();
  } catch (error) {
    logger.warn('[migrationUtils] Unable to get user attributes:', error);
    return null;
  }
}

/**
 * Updates user attributes in Cognito
 * @param {Object} attributes - Attributes to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateCognitoAttributes(attributes) {
  if (!attributes || Object.keys(attributes).length === 0) {
    return false;
  }
  
  try {
    const { updateUserAttributes } = await import('aws-amplify/auth');
    
    await updateUserAttributes({
      userAttributes: {
        ...attributes,
        'custom:updated_at': new Date().toISOString()
      }
    });
    
    return true;
  } catch (error) {
    logger.error('[migrationUtils] Error updating Cognito attributes:', error);
    return false;
  }
} 