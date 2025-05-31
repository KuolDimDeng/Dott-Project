import { NextResponse } from 'next/server';
import { Auth0Client } from '@auth0/nextjs-auth0/server';

const auth0Client = new Auth0Client({
  domain: process.env.AUTH0_ISSUER_BASE_URL || process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL || 'https://dottapps.com'
});

export async function GET(request, { params }) {
  const { auth0 } = params;
  const action = auth0[0];

  try {
    switch (action) {
      case 'login':
        return NextResponse.redirect(
          `${process.env.AUTH0_ISSUER_BASE_URL}/authorize?` +
          `response_type=code&` +
          `client_id=${process.env.AUTH0_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(process.env.AUTH0_BASE_URL + '/api/auth/callback')}&` +
          `scope=openid profile email`
        );

      case 'logout':
        return NextResponse.redirect(
          `${process.env.AUTH0_ISSUER_BASE_URL}/v2/logout?` +
          `client_id=${process.env.AUTH0_CLIENT_ID}&` +
          `returnTo=${encodeURIComponent(process.env.AUTH0_BASE_URL + '/auth/signin')}`
        );

      case 'callback':
        // Handle OAuth callback
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');

        if (!code) {
          return NextResponse.redirect('/auth/signin?error=no_code');
        }

        // For now, redirect to dashboard - in production you'd exchange the code for tokens
        const response = NextResponse.redirect('/dashboard');
        
        // Set a simple session cookie (in production, you'd properly handle tokens)
        response.cookies.set('auth0_logged_in', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 86400 // 24 hours
        });

        return response;

      default:
        return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth0 error:', error);
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
} 