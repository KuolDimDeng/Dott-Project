///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js
import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function POST(request) {
  try {
    // Get Auth0 session
    const session = await auth0.getSession(request);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { business_name, business_type, subscription_plan } = body;

    // Validate required fields
    if (!business_name || !business_type || !subscription_plan) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, business_type, subscription_plan' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Update user attributes in Auth0 via Management API
    // 2. Create tenant in your database
    // 3. Set up subscription with payment provider
    // 4. Initialize business data structures

    // For now, return success with user info
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        business_name,
        business_type,
        subscription_plan,
        onboarding_complete: true
      }
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}