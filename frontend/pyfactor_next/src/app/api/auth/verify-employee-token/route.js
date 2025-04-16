import { NextResponse } from 'next/server';
import { verifyToken } from '@/utils/tokenUtils';
import { serverLogger } from '@/utils/logger';

/**
 * GET endpoint to verify an employee verification token
 */
export async function GET(request) {
  try {
    // Get token from query params
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing verification token' },
        { status: 400 }
      );
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }
    
    // Return user data from token
    return NextResponse.json({
      email: decoded.email,
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
      // Don't include any sensitive information
    });
  } catch (error) {
    serverLogger.error('Error verifying employee token:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
} 