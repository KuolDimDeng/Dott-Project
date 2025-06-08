import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * API route to verify an invitation token
 * 
 * This endpoint checks if an invitation token is valid by querying the backend API.
 */
export async function POST(request) {
  try {
    const { token, email } = await request.json();
    
    if (!token || !email) {
      return NextResponse.json({ valid: false, error: 'Missing token or email' }, { status: 400 });
    }
    
    // Call the backend API to verify the token
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/api/verify-invitation/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, email }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      logger.error('[verify-invitation] Backend API error:', errorData);
      return NextResponse.json({ valid: false, error: errorData.error || 'Invalid token' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json({ valid: true, data });
  } catch (error) {
    logger.error('[verify-invitation] Error verifying invitation:', error);
    return NextResponse.json({ valid: false, error: 'Error verifying invitation' }, { status: 500 });
  }
}