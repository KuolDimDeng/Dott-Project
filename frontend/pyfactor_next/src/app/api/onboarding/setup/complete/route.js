///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/complete/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Check Auth0 v4.x authentication via appSession cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required - no session found' },
        { status: 401 }
      );
    }

    // Validate session has user data
    try {
      const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
      if (!sessionData.user || !sessionData.user.email) {
        return NextResponse.json(
          { error: 'Invalid session - no user data' },
          { status: 401 }
        );
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid session format' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[SetupComplete] Request body:', body);

    // For background completion, we don't need all the fields
    const { status, completedAt, background, source } = body;

    // Return success response
    const response = {
      success: true,
      message: 'Setup completed successfully',
      completedAt: completedAt || new Date().toISOString(),
      background: background || false,
      source: source || 'manual'
    };

    console.log('[SetupComplete] Success response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[SetupComplete] Error completing setup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}