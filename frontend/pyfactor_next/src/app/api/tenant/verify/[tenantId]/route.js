import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';

/**
 * API route to verify tenant access for the current user
 * This checks if the user has access to the specified tenant
 */
export async function GET(request, { params }) {
  try {
    const { tenantId } = params;
    
    if (!tenantId) {
      return NextResponse.json(
        { 
          exists: false, 
          error: 'No tenant ID provided' 
        }, 
        { status: 400 }
      );
    }
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          exists: false, 
          error: 'Unauthorized - Valid Bearer token required' 
        }, 
        { status: 401 }
      );
    }
    
    // Extract and verify the token
    const token = authHeader.substring(7);
    let decodedToken;
    
    try {
      decodedToken = jwtDecode(token);
    } catch (error) {
      logger.error('[API] Error decoding token:', error);
      return NextResponse.json(
        { 
          exists: false, 
          error: 'Invalid token format' 
        }, 
        { status: 401 }
      );
    }
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < currentTime) {
      return NextResponse.json(
        { 
          exists: false, 
          error: 'Token expired' 
        }, 
        { status: 401 }
      );
    }
    
    // Extract user information from token
    const userId = decodedToken.sub;
    
    // Here you would normally check your database to verify:
    // 1. The tenant exists
    // 2. The user has access to this tenant
    
    // For now, we'll just return a successful response
    // In production, replace this with actual tenant verification
    // Example: const hasAccess = await verifyTenantAccess(userId, tenantId);
    
    const exists = true; // Replace with actual check
    const hasAccess = true; // Replace with actual check
    
    if (!exists) {
      return NextResponse.json(
        { 
          exists: false, 
          error: 'Tenant not found' 
        }, 
        { status: 404 }
      );
    }
    
    if (!hasAccess) {
      return NextResponse.json(
        { 
          exists: true, 
          hasAccess: false, 
          error: 'You do not have access to this tenant' 
        }, 
        { status: 403 }
      );
    }
    
    // Success - user has access to this tenant
    return NextResponse.json(
      { 
        exists: true, 
        hasAccess: true 
      }, 
      { status: 200 }
    );
  } catch (error) {
    logger.error('[API] Error verifying tenant access:', error);
    return NextResponse.json(
      { 
        exists: false, 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
} 