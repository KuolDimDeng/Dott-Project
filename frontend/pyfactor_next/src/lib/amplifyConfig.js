import { Amplify } from 'aws-amplify';

// Configure Amplify with hard-coded values as fallbacks
// This ensures the configuration happens even if env variables aren't loaded
try {
  // Get configuration values from environment variables with fallbacks
  const region = process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1';
  const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_JPL8vGfb6';
  const userPoolClientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '1o5v84mrgn4gt87khtr179uc5b';

  // Configure Amplify using the proper v6 structure
  const amplifyConfig = {
    Auth: {
      Cognito: {
        region: region,
        userPoolId: userPoolId,
        userPoolClientId: userPoolClientId,
        // Enable standard authentication flow options
        loginWith: {
          email: true,
          phone: false,
          username: true
        }
      }
    }
  };

  // Apply configuration
  Amplify.configure(amplifyConfig);

  // Log the configuration for debugging
  if (typeof console !== 'undefined') {
    console.log('[AmplifyConfig] Auth configuration applied with:', {
      region: amplifyConfig.Auth.Cognito.region,
      userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
      clientId: amplifyConfig.Auth.Cognito.userPoolClientId
    });
  }

  // Create a global function to check if Amplify is configured
  if (typeof window !== 'undefined') {
    window.isAmplifyConfigured = () => {
      try {
        const config = Amplify.getConfig();
        return !!(config && config.Auth && config.Auth.Cognito && config.Auth.Cognito.userPoolId);
      } catch (e) {
        console.error('[AmplifyConfig] Error checking configuration:', e);
        return false;
      }
    };
    
    // Add a function to reconfigure if needed
    window.reconfigureAmplify = () => {
      try {
        Amplify.configure(amplifyConfig);
        console.log('[AmplifyConfig] Amplify reconfigured successfully');
        return true;
      } catch (e) {
        console.error('[AmplifyConfig] Error reconfiguring Amplify:', e);
        return false;
      }
    };
  }
} catch (error) {
  console.error('[AmplifyConfig] Error configuring Amplify:', error);
}

export default Amplify; 