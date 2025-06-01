import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Create the Auth0 client instance
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com',
  secret: process.env.AUTH0_SECRET,
});