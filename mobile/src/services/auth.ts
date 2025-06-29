// Mobile-specific auth service that works with Auth0
const AUTH0_DOMAIN = 'auth.dottapps.com'; // Using custom domain as requested
const AUTH0_CLIENT_ID = '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF';
const AUTH0_AUDIENCE = 'https://api.dottapps.com';

interface Auth0TokenResponse {
  access_token: string;
  id_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

interface Auth0UserInfo {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  picture?: string;
}

export const auth0Service = {
  // Direct password grant flow for mobile
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    try {
      // First, try to authenticate with Auth0
      const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'password',
          username: email,
          password: password,
          client_id: AUTH0_CLIENT_ID,
          audience: AUTH0_AUDIENCE,
          scope: 'openid profile email offline_access',
          // Note: In production, client_secret should be handled by a backend service
          // For mobile apps, consider using PKCE flow instead of password grant
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error('Auth0 login error:', {
          status: tokenResponse.status,
          error: error.error,
          description: error.error_description,
          full: error
        });
        
        if (error.error === 'unauthorized_client') {
          throw new Error('Password grant not enabled. Please check Auth0 settings.');
        } else if (error.error === 'invalid_grant') {
          throw new Error('Invalid email or password');
        }
        
        throw new Error(error.error_description || 'Authentication failed');
      }

      const tokenData: Auth0TokenResponse = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user information');
      }

      const userData: Auth0UserInfo = await userResponse.json();

      // Now create a session with your backend
      const sessionResponse = await fetch('https://api.dottapps.com/api/auth/mobile-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          auth0_token: tokenData.access_token,
          user_info: userData,
        }),
      });

      if (!sessionResponse.ok) {
        // If mobile-session doesn't exist, we'll just use the Auth0 token
        console.warn('Backend session creation failed, using Auth0 token only');
      }

      return {
        token: tokenData.access_token,
        user: {
          id: userData.sub,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async logout(token: string): Promise<void> {
    // Auth0 logout
    try {
      await fetch(`https://${AUTH0_DOMAIN}/v2/logout?client_id=${AUTH0_CLIENT_ID}`, {
        method: 'GET',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getUserInfo(token: string): Promise<Auth0UserInfo> {
    const response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user information');
    }

    return response.json();
  },
};