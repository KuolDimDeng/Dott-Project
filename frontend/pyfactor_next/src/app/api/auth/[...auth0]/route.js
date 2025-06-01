import { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile } from '@auth0/nextjs-auth0';

// Export the standard Auth0 handlers for all HTTP methods
export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/api/v2/`,
      scope: 'openid profile email'
    }
  }),
  logout: handleLogout({
    returnTo: process.env.NEXT_PUBLIC_BASE_URL
  }),
  callback: handleCallback(),
  profile: handleProfile()
});

export const POST = GET;