import { handleAuth, handleLogin, handleCallback } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

// Custom login handler to ensure proper redirect
const customLogin = handleLogin({
  authorizationParams: {
    audience: process.env.AUTH0_AUDIENCE || 'https://api.dottapps.com',
    scope: 'openid profile email offline_access',
  },
  returnTo: '/dashboard'
});

// Custom callback handler to check onboarding status
const customCallback = handleCallback({
  afterCallback: async (req, session) => {
    try {
      // Check if user needs onboarding
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
      const checkResponse = await fetch(`${backendUrl}/api/auth0/check-onboarding-status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (checkResponse.ok) {
        const data = await checkResponse.json();
        
        // Add onboarding status to session
        session.user.onboarding_completed = data.onboarding_completed;
        session.user.tenant_id = data.tenant_id;
        
        // Set redirect URL based on onboarding status
        if (!data.onboarding_completed) {
          session.returnTo = '/onboarding';
        } else if (data.tenant_id) {
          session.returnTo = `/tenant/${data.tenant_id}/dashboard`;
        }
      }
    } catch (error) {
      console.error('[Auth0 Callback] Error checking onboarding status:', error);
    }
    
    return session;
  }
});

// Export the Auth0 handler with custom handlers
export const GET = handleAuth({
  login: customLogin,
  callback: customCallback
});

export const POST = handleAuth({
  login: customLogin,
  callback: customCallback
});