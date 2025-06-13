import { NextResponse } from 'next/server';

const AUTH0_BASE_URL = process.env.AUTH0_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
const AUTH0_ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL || 'https://auth.dottapps.com';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_SECRET = process.env.AUTH0_SECRET;

export async function GET(request, { params }) {
  try {
    // Dynamic import to ensure it's included in the bundle
    const { handleAuth } = await import('@auth0/nextjs-auth0').catch(err => {
      console.error('Failed to import Auth0:', err);
      return {};
    });
    
    if (!handleAuth) {
      console.error('Auth0 SDK not available');
      return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
    }
    
    // Create handler instance
    const handler = handleAuth();
    
    // Call the handler
    return handler(request, { params });
  } catch (error) {
    console.error('Auth0 route error:', error);
    return NextResponse.json({ error: 'Auth0 error: ' + error.message }, { status: 503 });
  }
}

export async function POST(request, { params }) {
  try {
    // Dynamic import to ensure it's included in the bundle
    const { handleAuth } = await import('@auth0/nextjs-auth0').catch(err => {
      console.error('Failed to import Auth0:', err);
      return {};
    });
    
    if (!handleAuth) {
      console.error('Auth0 SDK not available');
      return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
    }
    
    // Create handler instance
    const handler = handleAuth();
    
    // Call the handler
    return handler(request, { params });
  } catch (error) {
    console.error('Auth0 route error:', error);
    return NextResponse.json({ error: 'Auth0 error: ' + error.message }, { status: 503 });
  }
}