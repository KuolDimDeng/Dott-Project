import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { auth0: segments } = await params;
  const action = segments[0]; // login, logout, callback, etc.

  const baseUrl = process.env.AUTH0_BASE_URL || 'http://localhost:3000';
  const domain = process.env.AUTH0_DOMAIN || process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '');
  const clientId = process.env.AUTH0_CLIENT_ID;

  switch (action) {
    case 'login':
      // Redirect to Auth0 Universal Login
      const loginUrl = `https://${domain}/authorize?` + new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: `${baseUrl}/api/auth/callback`,
        scope: 'openid profile email',
        state: 'login'
      });
      return NextResponse.redirect(loginUrl);

    case 'logout':
      // Redirect to Auth0 logout
      const logoutUrl = `https://${domain}/v2/logout?` + new URLSearchParams({
        client_id: clientId,
        returnTo: `${baseUrl}/auth/signin`
      });
      return NextResponse.redirect(logoutUrl);

    case 'callback':
      // Handle the callback from Auth0
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        return NextResponse.redirect(`${baseUrl}/auth/signin?error=${error}`);
      }

      if (code) {
        // In a real implementation, you would exchange the code for tokens
        // For now, just redirect to a success page
        return NextResponse.redirect(`${baseUrl}/dashboard`);
      }

      return NextResponse.redirect(`${baseUrl}/auth/signin`);

    default:
      return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
  }
}

export const POST = GET; 