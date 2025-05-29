// Direct Cognito OAuth implementation without Amplify abstractions

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION;

export const cognitoAuth = {
  // Generate OAuth URL for Google sign-in
  getGoogleSignInUrl: () => {
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback-direct');
    const state = encodeURIComponent(JSON.stringify({
      redirectUrl: '/dashboard',
      source: 'signin_form',
      timestamp: Date.now()
    }));
    
    return `https://${COGNITO_DOMAIN}.auth.${REGION}.amazoncognito.com/oauth2/authorize?` +
      `identity_provider=Google&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `client_id=${CLIENT_ID}&` +
      `scope=openid+profile+email&` +
      `state=${state}`;
  },

  // Exchange authorization code for tokens
  exchangeCodeForTokens: async (code) => {
    const tokenEndpoint = `https://${COGNITO_DOMAIN}.auth.${REGION}.amazoncognito.com/oauth2/token`;
    const redirectUri = window.location.origin + '/auth/callback-direct';
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code: code,
      redirect_uri: redirectUri
    });

    console.log('[cognitoAuth] Token exchange request:', {
      endpoint: tokenEndpoint,
      clientId: CLIENT_ID,
      redirectUri: redirectUri,
      codeLength: code.length
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('[cognitoAuth] Token exchange failed:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`Token exchange failed: ${errorData.error || response.statusText} - ${errorData.error_description || ''}`);
        } catch (e) {
          throw new Error(`Token exchange failed (${response.status}): ${responseText}`);
        }
      }

      try {
        const tokens = JSON.parse(responseText);
        console.log('[cognitoAuth] Token exchange successful');
        return tokens;
      } catch (parseError) {
        console.error('[cognitoAuth] Failed to parse token response:', responseText);
        throw new Error('Invalid token response from server');
      }
      
    } catch (error) {
      console.error('[cognitoAuth] Token exchange error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error during token exchange. Please check your connection and try again.');
      } else if (error.message.includes('invalid_grant')) {
        throw new Error('Invalid or expired authorization code. Please sign in again.');
      } else if (error.message.includes('redirect_uri_mismatch')) {
        throw new Error('OAuth configuration error. Please contact support.');
      }
      
      throw error;
    }
  },

  // Store tokens and user info
  storeAuthTokens: (tokens) => {
    try {
      // Store in localStorage or cookies
      localStorage.setItem('idToken', tokens.id_token);
      localStorage.setItem('accessToken', tokens.access_token);
      localStorage.setItem('refreshToken', tokens.refresh_token);
      
      // Decode ID token to get user info
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]));
      localStorage.setItem('userInfo', JSON.stringify({
        email: idTokenPayload.email,
        name: idTokenPayload.name,
        picture: idTokenPayload.picture,
        sub: idTokenPayload.sub
      }));
      
      console.log('[cognitoAuth] Tokens stored successfully');
    } catch (error) {
      console.error('[cognitoAuth] Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  },

  // Get current user
  getCurrentUser: () => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('idToken');
  },

  // Sign out
  signOut: () => {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    
    const signOutUrl = `https://${COGNITO_DOMAIN}.auth.${REGION}.amazoncognito.com/logout?` +
      `client_id=${CLIENT_ID}&` +
      `logout_uri=${encodeURIComponent(window.location.origin + '/auth/signin')}`;
    
    window.location.href = signOutUrl;
  }
}; 