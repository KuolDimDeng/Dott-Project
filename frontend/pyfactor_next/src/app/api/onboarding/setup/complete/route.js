///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Check authentication via cookie
    const cookieStore = cookies();
    const authCookie = cookieStore.get('auth0_logged_in');
    
    if (!authCookie || authCookie.value !== 'true') {
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

    // Return success with demo data
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: 'auth0|demo-user',
        email: 'user@example.com',
        name: 'Demo User',
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