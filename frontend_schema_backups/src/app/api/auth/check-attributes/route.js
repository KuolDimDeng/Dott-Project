import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverAuth';

export async function GET(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();
    
    if (!user || !user.attributes) {
      return NextResponse.json(
        { 
          isLoggedIn: false,
          authenticated: false,
          error: 'No valid user session found'
        },
        { status: 401 }
      );
    }

    // Return user attributes
    return NextResponse.json({
      isLoggedIn: true,
      authenticated: true,
      attributes: user.attributes || {},
      userId: user.userId
    });
    
  } catch (error) {
    logger.error('[Auth API] Error checking user attributes:', error);
    
    // Return fallback error but with 200 status so it doesn't trigger additional error handlers
    return NextResponse.json(
      { 
        isLoggedIn: false,
        authenticated: false,
        error: 'Failed to check attributes',
        fallback: true,
        details: error.message
      },
      { status: 200 }
    );
  }
} 