import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Get tokens from request headers
    const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    const idToken = request.headers.get('X-Id-Token');
    
    if (!accessToken || !idToken) {
      logger.error('[Signup] No auth tokens in request headers');
      return NextResponse.json(
        { error: 'No valid session' },
        { status: 401 }
      );
    }

    // Parse request body
    const data = await request.json();

    // Forward request to Django to create user
    const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${backendUrl}/api/auth/signup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Id-Token': idToken
      },
      body: JSON.stringify({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        cognito_id: data.cognitoId,
        user_role: 'OWNER',
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('[Signup] Backend API error:', error);
      throw new Error(error.message || 'Failed to create user');
    }

    const result = await response.json();
    logger.debug('[Signup] User created successfully:', result);

    return NextResponse.json({
      success: true,
      userId: result.user_id,
      message: 'User created successfully'
    });

  } catch (error) {
    logger.error('[Signup] Error creating user:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: 'Failed to create user',
        code: error.code || 'user_creation_error',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}