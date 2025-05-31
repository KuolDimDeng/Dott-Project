import { handleAuth } from '@auth0/nextjs-auth0';

// Export the default Auth0 handler
// This will handle login, logout, callback, and me routes automatically
export const GET = handleAuth();
export const POST = handleAuth();