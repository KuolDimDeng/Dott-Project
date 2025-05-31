import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Create Auth0 client instance
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN || 'placeholder.auth0.com',
  clientId: process.env.AUTH0_CLIENT_ID || 'placeholder-client-id',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || 'placeholder-secret',
  secret: process.env.AUTH0_SECRET || 'placeholder-secret-key-that-is-at-least-32-characters-long',
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  signInReturnToPath: '/dashboard',
  routes: {
    login: '/auth/login',
    logout: '/auth/logout',
    callback: '/auth/callback',
    postLogoutRedirect: '/auth/signin'
  }
});