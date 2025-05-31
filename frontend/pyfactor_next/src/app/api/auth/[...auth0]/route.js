import { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile } from '@auth0/nextjs-auth0';

// Export the Auth0 handlers for App Router
export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      redirect_uri: process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/callback'
    }
  }),
  logout: handleLogout({
    returnTo: process.env.NEXT_PUBLIC_BASE_URL + '/auth/signin'
  }),
  callback: handleCallback({
    afterCallback: async (req, res, session, state) => {
      // The session is already set, just return it
      // The actual smart routing logic happens in the callback page component
      return session;
    }
  }),
  profile: handleProfile()
});

// Also handle POST requests for Auth0
export const POST = GET; 