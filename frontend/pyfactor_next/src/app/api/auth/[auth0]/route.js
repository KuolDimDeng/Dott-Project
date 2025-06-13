import { NextResponse } from 'next/server';

// Dynamic import to avoid build-time issues
let auth0Handler;

async function getAuth0Handler() {
  if (!auth0Handler) {
    try {
      const { handleAuth } = await import('@auth0/nextjs-auth0');
      auth0Handler = handleAuth();
    } catch (error) {
      console.error('Failed to initialize Auth0:', error);
      // Return a fallback handler
      return {
        GET: () => NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 }),
        POST: () => NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 })
      };
    }
  }
  return auth0Handler;
}

export async function GET(request, context) {
  const handler = await getAuth0Handler();
  return handler.GET(request, context);
}

export async function POST(request, context) {
  const handler = await getAuth0Handler();
  return handler.POST(request, context);
}