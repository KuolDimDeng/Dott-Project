import { auth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';

export async function GET(request) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  try {
    // Get Auth0 session
    const session = await auth0.getSession(request);
    
    if (!session?.user) {
      logger.error('Authentication required', { requestId });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Return user profile information from Auth0
    const userProfile = {
      id: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.picture,
      email_verified: session.user.email_verified,
      // Add any custom attributes from Auth0 user metadata
      ...session.user['https://dott.com/user_metadata'],
      last_updated: new Date().toISOString()
    };

    logger.debug('Returning user profile', { 
      requestId,
      userId: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.picture,
      email_verified: session.user.email_verified
    });
    
    return NextResponse.json({
      success: true,
      user: userProfile
    });

  } catch (error) {
    logger.error('Error fetching user profile:', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    
    // In a real implementation, you would update user metadata in Auth0
    // using the Auth0 Management API
    
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: session.user.sub,
        ...body,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}