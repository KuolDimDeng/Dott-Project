import { NextResponse } from 'next/server'
import { addSecurityHeaders } from './utils/securityHeaders';
import { jwtDecode } from 'jwt-decode';

// Added comprehensive debug logging
const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true' || true;;

// Paths that require onboarding to be completed
const PROTECTED_PATHS = [
  '/dashboard',
  '/tenant',
];

// Paths that should be accessible without onboarding
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/auth',
  '/onboarding',
  '/api/onboarding',
  '/_next',
  '/static',
  '/favicon.ico',
  '/public',
];

// This middleware handles authentication-related routes to prevent RSC payload errors
export async function middleware(request) {
  if (AUTH_DEBUG) {
    console.debug('[MIDDLEWARE] Processing request:', request.nextUrl.pathname);
  }
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Special handling for auth routes to prevent RSC payload fetch errors
  if (pathname.startsWith('/api/auth/')) {
    // For these routes, we want to ensure browser navigation not client-side navigation
    // to prevent "Failed to fetch RSC payload" errors
    const response = NextResponse.next();
    
    // Add headers to prevent caching and RSC payload fetching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    if (pathname === '/api/auth/login' || 
        pathname === '/api/auth/logout' ||
        pathname.startsWith('/api/auth/callback')) {
      // Force browser navigation for these routes
      response.headers.set('x-middleware-rewrite', url.toString());
    }
    
    return response;
  }
  
  // Check if this is a protected path that requires onboarding
  const requiresOnboarding = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  
  if (requiresOnboarding) {
    try {
      // Get auth token from cookies
      const authToken = request.cookies.get('auth_token')?.value;
      
      if (!authToken) {
        if (AUTH_DEBUG) {
          console.debug('[MIDDLEWARE] No auth token, redirecting to login');
        }
        // No token, redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Decode token to check expiry
      try {
        const decodedToken = jwtDecode(authToken);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp && decodedToken.exp < currentTime) {
          if (AUTH_DEBUG) {
            console.debug('[MIDDLEWARE] Token expired, redirecting to login');
          }
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('returnUrl', pathname);
          return NextResponse.redirect(loginUrl);
        }
      } catch (decodeError) {
        console.error('[MIDDLEWARE] Error decoding token:', decodeError);
      }

      // Check onboarding status from session or make a lightweight check
      const onboardingCompleted = request.cookies.get('onboarding_completed')?.value;
      
      if (onboardingCompleted !== 'true') {
        // Double-check with backend
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dottapps.com';
          const checkResponse = await fetch(`${backendUrl}/api/auth0/check-onboarding-status/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            // Add timeout to prevent middleware from hanging
            signal: AbortSignal.timeout(3000),
          });

          if (checkResponse.ok) {
            const data = await checkResponse.json();
            
            if (!data.onboarding_completed) {
              if (AUTH_DEBUG) {
                console.debug('[MIDDLEWARE] Onboarding not completed, redirecting');
              }
              const onboardingUrl = new URL('/onboarding', request.url);
              return NextResponse.redirect(onboardingUrl);
            } else {
              // Set cookie to avoid repeated checks
              const response = NextResponse.next();
              response.cookies.set('onboarding_completed', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24, // 24 hours
              });
              return addSecurityHeaders(response);
            }
          }
        } catch (error) {
          console.error('[MIDDLEWARE] Error checking onboarding status:', error);
          // On error, allow access but log it
        }
      }
    } catch (error) {
      console.error('[MIDDLEWARE] Error in onboarding check:', error);
    }
  }
  
  // For all other routes, apply security headers and continue normally
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

// Define the middleware config to match the paths we want to handle
// Add proper scope to token requests
function addScopeToTokenRequests(request) {
  const url = new URL(request.url);
  
  // For token endpoints, ensure scope includes email
  if (url.pathname.includes('/api/auth/token') || 
      url.pathname.includes('/api/auth/access-token') ||
      url.pathname.includes('/authorize')) {
    
    // Add email scope if not present
    if (!url.searchParams.has('scope')) {
      url.searchParams.set('scope', 'openid profile email');
    } else if (!url.searchParams.get('scope').includes('email')) {
      const currentScope = url.searchParams.get('scope');
      url.searchParams.set('scope', `${currentScope} email`);
    }
    
    // Create new request with updated URL
    return NextRequest.next({
      request: {
        headers: request.headers,
        method: request.method,
        url: url.toString(),
        body: request.body
      }
    });
  }
  
  return request;
}

export const config = {
  // Match all paths except static files, images, etc.
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /static (static files)
     * 3. /public (public files)
     * 4. .*\.\w+ (files with extensions, like images)
     */
    '/((?!_next|static|public|favicon\.ico|.*\.\w+).*)',
  ],
};