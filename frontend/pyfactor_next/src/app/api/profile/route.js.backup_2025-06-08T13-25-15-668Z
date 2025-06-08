import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/serverLogger';

export async function GET(request) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  try {
    // Check authentication via cookie
    const cookieStore = cookies();
    const authCookie = cookieStore.get('auth0_logged_in');
    
    if (!authCookie || authCookie.value !== 'true') {
      logger.error('Authentication required', { requestId });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Return demo user profile information
    const userProfile = {
      id: 'auth0|demo-user',
      email: 'user@example.com',
      name: 'Demo User',
      picture: 'https://via.placeholder.com/64',
      email_verified: true,
      last_updated: new Date().toISOString()
    };

    logger.debug('Returning user profile', { 
      requestId,
      userId: userProfile.id,
      email: userProfile.email
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
    
    // Return success with demo data
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: 'auth0|demo-user',
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