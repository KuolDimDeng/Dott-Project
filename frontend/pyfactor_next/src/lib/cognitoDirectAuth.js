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
      
      // Decode ID token to get user info and custom attributes
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]));
      
      // Extract custom Cognito attributes
      const customAttributes = {};
      Object.keys(idTokenPayload).forEach(key => {
        if (key.startsWith('custom:')) {
          customAttributes[key] = idTokenPayload[key];
        }
      });
      
      const userInfo = {
        email: idTokenPayload.email,
        name: idTokenPayload.name,
        picture: idTokenPayload.picture,
        sub: idTokenPayload.sub,
        // Include custom attributes
        tenantId: idTokenPayload['custom:tenant_ID'] || 
                 idTokenPayload['custom:tenant_id'] ||
                 idTokenPayload['custom:businessid'],
        onboarding: idTokenPayload['custom:onboarding'],
        subplan: idTokenPayload['custom:subplan'],
        payverified: idTokenPayload['custom:payverified'],
        setupdone: idTokenPayload['custom:setupdone'],
        customAttributes: customAttributes
      };
      
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      // Store tenant ID separately for easy access
      if (userInfo.tenantId) {
        localStorage.setItem('tenant_id', userInfo.tenantId);
        console.log('[cognitoAuth] Tenant ID found and stored:', userInfo.tenantId);
      }
      
      console.log('[cognitoAuth] Tokens and user info stored successfully:', {
        hasCustomAttributes: Object.keys(customAttributes).length > 0,
        tenantId: userInfo.tenantId,
        onboarding: userInfo.onboarding
      });
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

  // Get custom attributes from stored user info
  getCustomAttributes: () => {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) return {};
    
    try {
      const parsed = JSON.parse(userInfo);
      return parsed.customAttributes || {};
    } catch (error) {
      console.error('[cognitoAuth] Error parsing user info:', error);
      return {};
    }
  },

  // Get tenant ID from stored user info or JWT token
  getTenantId: () => {
    // First try from stored user info
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        if (parsed.tenantId) return parsed.tenantId;
      } catch (error) {
        console.error('[cognitoAuth] Error parsing user info for tenant ID:', error);
      }
    }
    
    // Fallback: decode JWT token directly
    const idToken = localStorage.getItem('idToken');
    if (idToken) {
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        return payload['custom:tenant_ID'] || 
               payload['custom:tenant_id'] ||
               payload['custom:businessid'] ||
               payload['custom:tenantId'];
      } catch (error) {
        console.error('[cognitoAuth] Error decoding JWT for tenant ID:', error);
      }
    }
    
    return null;
  },

  // Get all user attributes from JWT token (fresh decode)
  getUserAttributes: () => {
    const idToken = localStorage.getItem('idToken');
    if (!idToken) return {};
    
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      return payload;
    } catch (error) {
      console.error('[cognitoAuth] Error decoding JWT for attributes:', error);
      return {};
    }
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