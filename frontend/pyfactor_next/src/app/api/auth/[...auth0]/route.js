import { auth0 } from '@/lib/auth0';

// Export Auth0 API route handlers for App Router
export const GET = auth0.handler;
export const POST = auth0.handler;