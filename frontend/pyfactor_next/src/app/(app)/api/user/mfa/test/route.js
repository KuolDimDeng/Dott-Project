import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('[MFA Test] Testing MFA API accessibility');
    
    // Test if Auth0 environment variables are available
    const hasM2MClientId = !!(process.env.AUTH0_M2M_CLIENT_ID || process.env.AUTH0_MANAGEMENT_CLIENT_ID);
    const hasM2MSecret = !!(process.env.AUTH0_M2M_CLIENT_SECRET || process.env.AUTH0_MANAGEMENT_CLIENT_SECRET);
    const hasDomain = !!process.env.AUTH0_DOMAIN;
    
    return NextResponse.json({
      status: 'MFA API test endpoint working',
      auth0Config: {
        hasDomain,
        hasClientId: hasM2MClientId,
        hasClientSecret: hasM2MSecret,
        domain: process.env.AUTH0_DOMAIN || 'not set'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MFA Test] Error:', error);
    return NextResponse.json({
      error: 'MFA API test failed',
      message: error.message
    }, { status: 500 });
  }
}