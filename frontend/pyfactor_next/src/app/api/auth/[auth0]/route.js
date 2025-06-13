import { NextResponse } from 'next/server';

// Dynamic import to avoid build-time issues
let auth0Handler;

async function getAuth0Handler() {
  if (!auth0Handler) {
    try {
      const { handleAuth } = await import('@auth0/nextjs-auth0');
      // handleAuth returns the handlers directly
      auth0Handler = handleAuth();
    } catch (error) {
      console.error('Failed to initialize Auth0:', error);
      // Return a fallback handler
      return async () => NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
    }
  }
  return auth0Handler;
}

// Export handlers directly - handleAuth returns a function that handles all auth routes
export const GET = async (request, context) => {
  const handler = await getAuth0Handler();
  // If handler is a function, call it directly
  if (typeof handler === 'function') {
    return handler(request, context);
  }
  // Otherwise it's our fallback
  return handler();
};

export const POST = GET; // Use same handler for POST