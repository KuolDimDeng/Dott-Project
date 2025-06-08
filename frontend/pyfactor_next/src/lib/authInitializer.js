'use client';


import { Amplify } from 'aws-amplify';

/**
 * Initialize Amplify with Cognito configuration
 * This should be imported at the app root level to ensure configuration is loaded
 * before any auth operations are attempted
 */
export function initializeAuth() {
  try {
    // Configure Amplify with hard-coded values as fallbacks
    Amplify.configure({
      Auth: {
        Cognito: {
          region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
          userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6',
          userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b',
        }
      }
    });

    console.log('[AuthInitializer] Auth configuration applied successfully');
    return true;
  } catch (error) {
    console.error('[AuthInitializer] Error initializing Auth:', error);
    return false;
  }
}

// Auto-initialize when this module is imported
initializeAuth();

export default Amplify; 