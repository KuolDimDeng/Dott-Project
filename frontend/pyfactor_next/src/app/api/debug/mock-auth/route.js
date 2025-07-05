import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Mock authentication endpoint for local testing
// This simulates a successful Auth0 login without actually calling Auth0

export async function POST(request) {
  try {
    const body = await request.json();
    const { email = 'test@example.com', tenantId = 'test-tenant-123' } = body;
    
    console.log('[MockAuth] Creating mock session for:', email);
    
    // Create a mock JWT token
    const mockToken = Buffer.from(JSON.stringify({
      email,
      sub: 'mock|' + Date.now(),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000)
    })).toString('base64');
    
    // Create mock session data
    const mockSessionData = {
      user: {
        email,
        tenantId,
        tenant_id: tenantId,
        needsOnboarding: false,
        needs_onboarding: false,
        onboardingCompleted: true,
        onboarding_completed: true,
        businessName: 'Test Business',
        business_name: 'Test Business',
        subscriptionPlan: 'professional',
        subscription_plan: 'professional'
      },
      accessToken: 'mock-access-' + mockToken,
      sessionToken: 'mock-session-' + Date.now(),
      authenticated: true,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };
    
    // Store in sessionStorage bridge data
    const bridgeData = {
      token: mockSessionData.sessionToken,
      redirectUrl: `/${tenantId}/dashboard`,
      timestamp: Date.now()
    };
    
    // Return the bridge data for the client to store
    return NextResponse.json({
      success: true,
      message: 'Mock authentication successful',
      bridgeData,
      sessionData: mockSessionData,
      instructions: [
        '1. Store bridgeData in sessionStorage with key "session_bridge"',
        '2. Navigate to /auth/session-bridge',
        '3. The session bridge will establish the session',
        '4. You should be redirected to the dashboard'
      ]
    });
    
  } catch (error) {
    console.error('[MockAuth] Error:', error);
    return NextResponse.json({ 
      error: 'Mock authentication failed',
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint to check if mock auth is available
export async function GET() {
  return NextResponse.json({
    available: true,
    endpoints: {
      POST: '/api/debug/mock-auth - Create mock session',
      body: {
        email: 'Email address (optional)',
        tenantId: 'Tenant ID (optional)'
      }
    },
    usage: `
      // Example usage:
      const response = await fetch('/api/debug/mock-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          tenantId: 'test-tenant-123'
        })
      });
      
      const data = await response.json();
      sessionStorage.setItem('session_bridge', JSON.stringify(data.bridgeData));
      window.location.href = '/auth/session-bridge';
    `
  });
}