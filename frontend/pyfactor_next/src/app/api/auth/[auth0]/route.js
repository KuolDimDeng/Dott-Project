import { NextResponse } from 'next/server';

let handleAuth;

async function initAuth0() {
  if (!handleAuth) {
    try {
      const auth0 = await import('@auth0/nextjs-auth0');
      handleAuth = auth0.handleAuth();
    } catch (error) {
      console.error('Failed to initialize Auth0:', error);
    }
  }
  return handleAuth;
}

export async function GET(request, context) {
  const handler = await initAuth0();
  
  if (!handler) {
    return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
  }
  
  return handler.GET ? handler.GET(request, context) : handler(request, context);
}

export async function POST(request, context) {
  const handler = await initAuth0();
  
  if (!handler) {
    return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
  }
  
  return handler.POST ? handler.POST(request, context) : handler(request, context);
}