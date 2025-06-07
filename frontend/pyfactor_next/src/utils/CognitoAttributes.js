/**
 * CognitoAttributes.js - Auth0 User Attributes
 * 
 * This file previously contained AWS Cognito attribute mapping but has been
 * completely replaced with Auth0-specific implementations. All Cognito
 * code has been removed as we now use Auth0 exclusively.
 */

// Auth0 attribute mapping
export const Auth0Attributes = {
  EMAIL: 'email',
  NAME: 'name',
  GIVEN_NAME: 'given_name',
  FAMILY_NAME: 'family_name',
  TENANT_ID: 'tenant_id',
  PICTURE: 'picture',
  SUB: 'sub',
  NICKNAME: 'nickname',
  UPDATED_AT: 'updated_at',
};

// Auth0 session helper
export const getAuth0Attributes = async () => {
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      const session = await response.json();
      return session?.user || null;
    }
  } catch (error) {
    console.error('[Auth0] Error fetching attributes:', error);
  }
  return null;
};

// Provide a message for any code still using Cognito
export const CognitoAttributes = new Proxy({}, {
  get: (target, prop) => {
    console.warn(`[Auth] Accessing deprecated CognitoAttributes.${prop} - use Auth0Attributes instead`);
    // Map common Cognito attributes to Auth0 equivalents for compatibility
    const cognitoToAuth0Map = {
      'custom:tenant_ID': 'tenant_id',
      'custom:tenantId': 'tenant_id',
      email: 'email',
      name: 'name',
      given_name: 'given_name',
      family_name: 'family_name'
    };
    return cognitoToAuth0Map[prop] || prop;
  }
});

export default {
  Auth0Attributes,
  getAuth0Attributes,
  CognitoAttributes
};
