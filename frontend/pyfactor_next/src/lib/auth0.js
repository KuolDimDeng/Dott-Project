// For Auth0 v4.6.0, we need a simpler approach
// The middleware handles auth routes automatically
export const auth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN || 'placeholder.auth0.com',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID || 'placeholder-client-id',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || 'placeholder-secret',
  secret: process.env.AUTH0_SECRET || 'placeholder-secret-key-that-is-at-least-32-characters-long',
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
};