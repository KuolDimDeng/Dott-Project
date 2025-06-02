import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { auth0: segments } = await params;
    const route = segments?.join('/') || '';
    
    console.log('[Auth Route] Handling route:', route);
    
    const url = new URL(request.url);
    
    // Handle login route
    if (route === 'login') {
      const loginUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?` + 
        new URLSearchParams({
          response_type: 'code',
          client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
          scope: 'openid profile email',
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/api/v2/`,
        });
      
      console.log('[Auth Route] Redirecting to Auth0:', loginUrl);
      return NextResponse.redirect(loginUrl);
    }
    
    // Handle logout route  
    if (route === 'logout') {
      const logoutUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/v2/logout?` +
        new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
          returnTo: process.env.NEXT_PUBLIC_BASE_URL,
        });
      
      // Clear session cookies
      const response = NextResponse.redirect(logoutUrl);
      response.cookies.delete('appSession');
      return response;
    }
    
    // Handle callback route
    if (route === 'callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      
      if (error) {
        console.error('[Auth Route] Auth0 error:', error);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin?error=${error}`);
      }
      
      if (code) {
        // Redirect to frontend callback handler
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?code=${code}`);
      }
    }
    
    // Default response
    return NextResponse.json({ error: 'Unknown auth route' }, { status: 404 });
    
  } catch (error) {
    console.error('[Auth Route] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 