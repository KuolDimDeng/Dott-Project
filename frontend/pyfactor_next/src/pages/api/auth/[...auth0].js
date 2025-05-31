import { handleAuth, handleLogin, handleLogout, handleCallback, handleProfile } from '@auth0/nextjs-auth0';

export default handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      scope: 'openid profile email'
    }
  }),
  logout: handleLogout({
    returnTo: process.env.NEXT_PUBLIC_BASE_URL + '/auth/signin'
  }),
  callback: handleCallback({
    afterCallback: async (req, res, session, state) => {
      // Custom logic after successful login
      console.log('[Auth0] User logged in:', session.user);
      
      // You can add custom logic here, like:
      // - Create user in your database
      // - Set custom claims
      // - Redirect based on user type
      
      return session;
    }
  }),
  profile: handleProfile({
    refetch: true
  })
}); 