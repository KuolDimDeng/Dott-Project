import { handleAuth } from '@auth0/nextjs-auth0';

// For Next.js 13+ App Router, handleAuth() returns the route handlers
export const GET = handleAuth({
  login: {
    returnTo: '/dashboard'
  },
  logout: {
    returnTo: '/'
  },
  callback: {
    afterCallback: async (req, session, state) => {
      // You can add custom logic here after successful authentication
      console.log('Auth0 callback successful:', {
        user: session.user?.email,
        returnTo: state?.returnTo || '/dashboard'
      });
      return session;
    }
  }
});

export const POST = GET;