import { NextResponse } from 'next/server';

let auth0;
try {
  auth0 = require('@auth0/nextjs-auth0');
} catch (error) {
  console.error('Failed to load Auth0:', error);
}

export async function GET(request, context) {
  if (!auth0 || !auth0.handleAuth) {
    return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
  }
  
  const handler = auth0.handleAuth();
  return handler.GET ? handler.GET(request, context) : handler(request, context);
}

export async function POST(request, context) {
  if (!auth0 || !auth0.handleAuth) {
    return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
  }
  
  const handler = auth0.handleAuth();
  return handler.POST ? handler.POST(request, context) : handler(request, context);
}