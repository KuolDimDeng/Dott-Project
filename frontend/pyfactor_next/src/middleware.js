import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { canAccessStep } from '@/config/steps'

const STATIC_PATTERNS = {
  PUBLIC: [
    '/',
    '/home'
  ],
  NEXTJS: [
    '/_next/static',
    '/_next/image',
    '/_next/webpack-hmr'
  ],
  ASSETS: [
    '/static/images',
    '/static/fonts',
    '/static/css',
    '/static/js'
  ],
  CORE_FILES: [
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
    '/sitemap.xml'
  ]
}

const AUTH_PATHS = {
  SIGNIN: '/auth/signin',
  SIGNOUT: '/auth/signout',
  ERROR: '/auth/error',
  VERIFY: '/auth/verify',
  CALLBACK: '/api/auth/callback'
}

const PUBLIC_PATHS = {
  CORE: STATIC_PATTERNS.PUBLIC,
  AUTH: [
    AUTH_PATHS.SIGNIN,
    AUTH_PATHS.SIGNOUT,
    AUTH_PATHS.ERROR,
    AUTH_PATHS.VERIFY,
    AUTH_PATHS.CALLBACK,
    '/api/auth/signin/google',
    '/api/auth/csrf',
    '/api/auth/providers',
  ],
  API: [
    '/api/health',
    '/api/onboarding/token/verify',
    '/api/onboarding/status',
    '/api/onboarding/status_update',
    '/api/onboarding/save-business-info',
    '/api/onboarding/business-info',
    '/api/onboarding/subscription/validate',
    '/api/onboarding/subscription/save',
    '/api/onboarding/payment',
    '/api/onboarding/database/health-check',
    '/api/onboarding/setup/status',
    '/api/onboarding/setup/start',
    '/api/onboarding/setup/complete',
    '/api/onboarding/setup/cancel',
  ],
  ONBOARDING: [
    '/onboarding/business-info'
  ]
}

const shouldSkipAuth = (pathname) => {
  const requestId = crypto.randomUUID()

  // Root path check
  if (pathname === '/' || pathname === '') {
    logger.debug('Root path allowed:', {
      requestId,
      pathname,
      type: 'root_access'
    })
    return true
  }


  // Handle API routes
  if (pathname.startsWith('/api/')) {
    // Skip auth for these API paths
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/health')) {
      logger.debug('API auth bypass:', {
        requestId,
        pathname,
        type: 'api_auth_path'
      })
      return true
    }
  }


  // Always allow static assets
  const isStaticAsset = [
    ...STATIC_PATTERNS.NEXTJS,
    ...STATIC_PATTERNS.ASSETS,
    ...STATIC_PATTERNS.CORE_FILES
  ].some(pattern => pathname.startsWith(pattern))

  if (isStaticAsset) {
    logger.debug('Static asset bypass:', {
      requestId,
      pathname,
      timestamp: new Date().toISOString()
    })
    return true
  }

  // Check public paths
  const matchesPatterns = (patterns) => 
    patterns.some(pattern => pathname.startsWith(pattern))

  const checks = {
    isPublic: matchesPatterns(STATIC_PATTERNS.PUBLIC),
    isAuth: matchesPatterns(PUBLIC_PATHS.AUTH),
    isApi: matchesPatterns(PUBLIC_PATHS.API),
    isOnboarding: matchesPatterns(PUBLIC_PATHS.ONBOARDING),
    isAsset: !!pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/i)
  }

  const shouldSkip = Object.values(checks).some(Boolean)

  logger.debug('Auth skip check:', {
    requestId,
    pathname,
    checks,
    shouldSkip
  })

  return shouldSkip
}

const handleOnboardingRoute = async (req, token) => {
  const pathname = req.nextUrl.pathname
  const current_step = pathname.split('/').pop()

  logger.debug('Onboarding middleware check:', {
    pathname,
    current_step,
    token: {
      onboarding_status: token?.onboarding_status,
      selected_plan: token?.selected_plan,
      timestamp: new Date().toISOString()
    }
  });

  if (current_step === 'business-info') {
    return NextResponse.next()
  }



  if (current_step === 'subscription' && 
      (token?.onboarding_status === 'business-info' || 
       token?.onboarding_status === 'subscription')) {
    return NextResponse.next()
  }

  if (current_step === 'payment') {
    if (token?.selected_plan !== 'professional' || 
        token?.onboarding_status !== 'subscription') {
      return NextResponse.redirect(
        new URL('/onboarding/subscription', req.url)
      )
    }
    return NextResponse.next()
  }

  if (current_step === 'setup') {
    if (token?.selected_plan === 'free' && 
        token?.onboarding_status === 'subscription') {
      return NextResponse.next()
    }
    
    if (token?.selected_plan === 'professional' && 
        token?.onboarding_status !== 'payment') {
      return NextResponse.redirect(
        new URL('/onboarding/payment', req.url)
      )
    }
    return NextResponse.next()
  }

  if (pathname.includes('/dashboard')) {
    // Allow dashboard access for free plan during setup
    if (token?.selected_plan === 'free' && 
        (token?.onboarding_status === 'setup' || token?.onboarding_status === 'complete')) {
        return NextResponse.next();
    }

    // For professional plan, require payment completion
    if (token?.selected_plan === 'professional' && token?.onboarding_status !== 'complete') {
        return NextResponse.redirect(
            new URL('/onboarding/payment', req.url)
        );
    }

    return NextResponse.next();
}

  if (!canAccessStep(current_step, {
    user: {
        ...token,
        current_step: token?.onboarding_status || 'business-info',  // Ensure string value
    },
    current_step: token?.onboarding_status || 'business-info'  // Ensure string value
})) {
    const redirectStep = token?.onboarding_status || 'business-info'
    logger.debug('Step access denied:', {
      current_step,
      onboarding_status: token?.onboarding_status,
      redirectingTo: redirectStep
    })
    return NextResponse.redirect(
      new URL(`/onboarding/${redirectStep}`, req.url)
    )
  }

  return NextResponse.next()
}

export default withAuth(
  async function middleware(req) {
    const { token } = req.nextauth
    const pathname = req.nextUrl.pathname
    const requestId = crypto.randomUUID()

    logger.debug('Middleware executing:', {
      requestId,
      pathname,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    })

     // Explicitly handle root path first
     if (pathname === '/') {
      return NextResponse.next()
    }


    // Single check for public paths
    if (shouldSkipAuth(pathname)) {
      return NextResponse.next()
    }

    try {
      if (!token) {
        throw new Error('No token available')
      }

      if (pathname.startsWith('/onboarding/')) {
        return handleOnboardingRoute(req, token)
      }

      return NextResponse.next()

    } catch (error) {
      const currentUrl = new URL(req.url)
      
      if (currentUrl.pathname === '/auth/signin') {
        return NextResponse.next()
      }

      const callbackUrl = encodeURIComponent(pathname)
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url)
      )
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        // Always authorize root path
        if (path === '/') {
          return true
        }
        if (shouldSkipAuth(path)) {
          return true
        }
        return !!token
      }
    },
    pages: {
      signIn: '/auth/signin'
    }
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/api/:path*',
    // Important: Change this to explicitly exclude root
    '/((?!_next|static|auth|favicon.ico|api/auth|$).*)'
  ]
}