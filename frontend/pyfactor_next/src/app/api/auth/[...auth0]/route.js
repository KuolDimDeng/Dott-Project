import { handleAuth, handleLogin, handleLogout, handleCallback } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      scope: 'openid profile email'
    }
  }),
  logout: handleLogout({
    returnTo: process.env.NEXT_PUBLIC_BASE_URL
  }),
  callback: handleCallback()
}); 