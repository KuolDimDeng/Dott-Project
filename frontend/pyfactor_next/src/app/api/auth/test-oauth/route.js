import { NextResponse } from 'next/server';

/**
 * Test OAuth configuration and flow
 * Helps diagnose Google sign-in issues
 */
export async function GET(request) {
  console.log('🔍 [OAuthTest] Testing OAuth configuration...');
  
  const tests = {
    timestamp: new Date().toISOString(),
    environment: {
      // Check all required environment variables
      auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'NOT_SET',
      auth0ClientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'NOT_SET',
      auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      auth0Audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'NOT_SET',
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'NOT_SET',
    },
    
    // Test Auth0 connection
    auth0Connection: {
      domain: 'auth.dottapps.com',
      expectedRedirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/api/auth/callback`,
      expectedCallbackPage: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com'}/auth/oauth-callback`,
    },
    
    // Common issues
    issues: []
  };
  
  // Check for common configuration issues
  if (!process.env.AUTH0_CLIENT_SECRET) {
    tests.issues.push({
      severity: 'critical',
      issue: 'Missing AUTH0_CLIENT_SECRET',
      solution: 'Add AUTH0_CLIENT_SECRET to Render environment variables',
      impact: 'Token exchange will fail with 500 error'
    });
  }
  
  if (!process.env.NEXT_PUBLIC_AUTH0_DOMAIN) {
    tests.issues.push({
      severity: 'critical',
      issue: 'Missing NEXT_PUBLIC_AUTH0_DOMAIN',
      solution: 'Add NEXT_PUBLIC_AUTH0_DOMAIN to Render environment variables',
      impact: 'Cannot redirect to Auth0 for login'
    });
  }
  
  if (!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID) {
    tests.issues.push({
      severity: 'critical',
      issue: 'Missing NEXT_PUBLIC_AUTH0_CLIENT_ID',
      solution: 'Add NEXT_PUBLIC_AUTH0_CLIENT_ID to Render environment variables',
      impact: 'Auth0 will reject the authorization request'
    });
  }
  
  // Test if we can reach Auth0 domain
  try {
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com';
    const testUrl = `https://${auth0Domain}/.well-known/openid-configuration`;
    
    console.log('🔍 [OAuthTest] Testing Auth0 connectivity to:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Short timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const config = await response.json();
      tests.auth0Connection.status = 'connected';
      tests.auth0Connection.issuer = config.issuer;
      tests.auth0Connection.authorizationEndpoint = config.authorization_endpoint;
      tests.auth0Connection.tokenEndpoint = config.token_endpoint;
      console.log('✅ [OAuthTest] Auth0 connection successful');
    } else {
      tests.auth0Connection.status = 'error';
      tests.auth0Connection.error = `HTTP ${response.status}`;
      tests.issues.push({
        severity: 'critical',
        issue: 'Cannot connect to Auth0',
        solution: 'Check Auth0 domain configuration',
        impact: 'OAuth flow cannot start'
      });
    }
  } catch (error) {
    tests.auth0Connection.status = 'failed';
    tests.auth0Connection.error = error.message;
    tests.issues.push({
      severity: 'critical',
      issue: 'Auth0 connection failed',
      solution: 'Check network and Auth0 domain',
      impact: 'OAuth flow cannot start',
      details: error.message
    });
    console.error('❌ [OAuthTest] Auth0 connection failed:', error);
  }
  
  // Generate test OAuth URL
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF';
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dottapps.com';
  
  tests.testOAuthUrl = `https://${domain}/authorize?` + new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/auth/callback`,
    scope: 'openid profile email',
    connection: 'google-oauth2',
    state: 'test_state_12345'
  }).toString();
  
  // Summary
  tests.summary = {
    criticalIssues: tests.issues.filter(i => i.severity === 'critical').length,
    warnings: tests.issues.filter(i => i.severity === 'warning').length,
    canProceed: tests.issues.filter(i => i.severity === 'critical').length === 0,
    recommendation: tests.issues.length === 0 
      ? 'Configuration looks good. Try the OAuth flow.' 
      : 'Fix the issues listed above before proceeding.'
  };
  
  console.log('🔍 [OAuthTest] Test results:', {
    criticalIssues: tests.summary.criticalIssues,
    auth0Status: tests.auth0Connection.status,
    recommendation: tests.summary.recommendation
  });
  
  return NextResponse.json(tests, {
    status: tests.summary.criticalIssues > 0 ? 500 : 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}