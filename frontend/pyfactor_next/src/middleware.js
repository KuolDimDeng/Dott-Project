import { withMiddlewareAuthRequired, getSession } from '@auth0/nextjs-auth0/edge';
import { NextResponse } from 'next/server';

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/tenant',
  '/onboarding',
  '/reports',
  '/finance',
  '/inventory',
  '/crm'
];

// Define public routes that don't need auth
const publicRoutes = [
  '/',
  '/auth',
  '/api/auth',
  '/about',
  '/contact',
  '/press',
  '/careers',
  '/privacy',
  '/terms'
];

async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files, API routes, and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    publicRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  try {
    // Get the user session
    const response = NextResponse.next();
    const session = await getSession(request, response);
    
    if (!session || !session.user) {
      // No session, redirect to login
      const loginUrl = new URL('/api/auth/login', request.url);
      loginUrl.searchParams.set('returnTo', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // User is authenticated, now check onboarding status for smart routing
    const user = session.user;
    
    // If user is trying to access onboarding but already completed, redirect to dashboard
    if (pathname.startsWith('/onboarding')) {
      // Call the backend to get current user status
      try {
        const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (backendResponse.ok) {
          const userData = await backendResponse.json();
          
          // If onboarding is complete and user has tenant, redirect to dashboard
          if (userData.tenant?.onboarding_completed && userData.tenant?.id) {
            const dashboardUrl = new URL(`/tenant/${userData.tenant.id}/dashboard`, request.url);
            return NextResponse.redirect(dashboardUrl);
          }
        }
      } catch (error) {
        console.error('[Middleware] Error checking user status:', error);
        // Continue to let them access onboarding if API call fails
      }
    }
    
    // If user is trying to access dashboard/tenant routes but hasn't completed onboarding
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/tenant')) {
      try {
        const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (backendResponse.ok) {
          const userData = await backendResponse.json();
          
          // If onboarding is not complete, redirect to onboarding
          if (!userData.tenant?.onboarding_completed || userData.needs_onboarding) {
            const onboardingUrl = new URL('/onboarding/business-info', request.url);
            return NextResponse.redirect(onboardingUrl);
          }
          
          // If trying to access generic dashboard but has tenant, redirect to tenant dashboard
          if (pathname === '/dashboard' && userData.tenant?.id) {
            const tenantDashboardUrl = new URL(`/tenant/${userData.tenant.id}/dashboard`, request.url);
            return NextResponse.redirect(tenantDashboardUrl);
          }
        }
      } catch (error) {
        console.error('[Middleware] Error checking user status:', error);
        // Let them through if API call fails
      }
    }

    return response;
    
  } catch (error) {
    console.error('[Middleware] Auth error:', error);
    // Redirect to login on auth error
    const loginUrl = new URL('/api/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export default withMiddlewareAuthRequired(middleware);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 