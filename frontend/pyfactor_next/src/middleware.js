// Auth0 v4.6.0 middleware - uses environment variables automatically
export async function middleware(request) {
  // For Auth0 v4.6.0, if no environment variables are set, just pass through
  if (!process.env.NEXT_PUBLIC_AUTH0_DOMAIN && !process.env.AUTH0_DOMAIN) {
    return;
  }
  
  const { pathname } = request.nextUrl;
  
  // IMPORTANT: Skip middleware for Auth0 callback to prevent redirect loop
  if (pathname === '/api/auth/callback') {
    return; // Let the callback route handle the authentication
  }
  
  // Only redirect /api/auth/login to Auth0 authorization
  if (pathname === '/api/auth/login') {
    const authUrl = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN}/authorize?` + 
      new URLSearchParams({
        response_type: 'code',
        client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        scope: 'openid profile email',
        state: Math.random().toString(36).substring(7)
      });
      
    return Response.redirect(authUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}; 