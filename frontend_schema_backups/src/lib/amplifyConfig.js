import { Amplify } from 'aws-amplify';

// Configure Amplify with hard-coded values as fallbacks
// This ensures the configuration happens even if env variables aren't loaded
try {
  Amplify.configure({
    Auth: {
      Cognito: {
        region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6',
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b',
      }
    }
  });

  // Log the configuration for debugging
  if (typeof console !== 'undefined') {
    console.log('[AmplifyConfig] Auth configuration applied with:', {
      region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6',
      clientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b',
    });
  }
} catch (error) {
  console.error('[AmplifyConfig] Error configuring Amplify:', error);
}

export default Amplify; 