import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check Auth0 configuration
 * Only works in development or when AUTH_DEBUG is enabled
 */
export async function GET(request) {
  // Security check - only allow in development or when debug is explicitly enabled
  const isDevelopment = process.env.NODE_ENV === 'development';
  const debugEnabled = process.env.AUTH_DEBUG === 'true';
  
  if (!isDevelopment && !debugEnabled) {
    return NextResponse.json({ error: 'Debug endpoint not available' }, { status: 403 });
  }

  console.log('🔍 [AuthDebug] Environment configuration check requested');
  
  try {
    const config = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      environment: {
        // Auth0 Configuration
        hasAuth0Domain: !!process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
        hasAuth0ClientId: !!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
        hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
        hasAuth0Audience: !!process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
        hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
        
        // Values (masked for security)
        auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'NOT_SET',
        auth0ClientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? 
          `${process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID.substring(0, 8)}...` : 'NOT_SET',
        auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET ? 
          `${process.env.AUTH0_CLIENT_SECRET.substring(0, 8)}...` : 'NOT_SET',
        auth0Audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'NOT_SET',
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'NOT_SET',
        
        // Additional Auth0 vars
        hasAuth0Secret: !!process.env.AUTH0_SECRET,
        hasAuth0DomainAlt: !!process.env.AUTH0_DOMAIN,
        hasAuth0ClientIdAlt: !!process.env.AUTH0_CLIENT_ID,
        
        // Check if we're using custom domain
        usingCustomDomain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.includes('auth.dottapps.com'),
        
        // All AUTH-related environment variables (names only)
        authEnvVars: Object.keys(process.env).filter(key => 
          key.includes('AUTH') || key.includes('OAUTH')
        ).sort()
      },
      
      // OAuth flow configuration
      oauthFlow: {
        loginUrl: '/api/auth/login',
        callbackUrl: '/api/auth/callback', 
        exchangeUrl: '/api/auth/exchange',
        frontendCallbackUrl: '/auth/oauth-callback',
        expectedRedirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
        expectedCallbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/oauth-callback`
      },
      
      // Common issues checklist
      issues: {
        missingClientSecret: !process.env.AUTH0_CLIENT_SECRET,
        missingDomain: !process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
        missingClientId: !process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
        missingBaseUrl: !process.env.NEXT_PUBLIC_BASE_URL,
        redirectUriMismatch: false // Will be updated based on actual configuration
      }
    };
    
    // Log for server-side debugging
    console.log('🔍 [AuthDebug] Configuration check result:', {
      hasAllRequiredVars: config.environment.hasAuth0Domain && 
                          config.environment.hasAuth0ClientId && 
                          config.environment.hasAuth0ClientSecret && 
                          config.environment.hasBaseUrl,
      criticalIssues: Object.entries(config.issues).filter(([key, value]) => value),
      nodeEnv: config.nodeEnv
    });
    
    return NextResponse.json({
      success: true,
      message: 'Auth0 configuration check completed',
      ...config
    });
    
  } catch (error) {
    console.error('🔍 [AuthDebug] Error checking configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Configuration check failed',
      details: error.message
    }, { status: 500 });
  }
}