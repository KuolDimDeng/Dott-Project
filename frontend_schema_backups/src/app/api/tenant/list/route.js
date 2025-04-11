import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';

/**
 * API route to get list of tenants for the current user
 * Returns all tenants the authenticated user has access to
 */
export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
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
          error: 'Invalid token format' 
        }, 
        { status: 401 }
      );
    }
    
    // Extract user information from token
    const userId = decodedToken.sub;
    
    // Here you would normally:
    // 1. Query your database for all tenants the user has access to
    // 2. Return the list of tenants with access level details
    
    // For now, we'll return a mock response
    // In production, replace this with actual database queries
    
    // Example mock tenant list
    const tenants = [
      {
        id: '70cc394b-6b7c-5e61-8213-9801cbc78708',
        name: 'Primary Tenant',
        description: 'Main tenant for your organization',
        role: 'owner',
        isActive: true,
        created: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '18609ed2-1a46-4d50-bc4e-483d6e3405ff',
        name: 'Development Tenant',
        description: 'Tenant for development and testing',
        role: 'admin',
        isActive: true,
        created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '5e9f8f8f-f8f8-f8f8-f8f8-f8f8f8f8f8f8',
        name: 'Demo Tenant',
        description: 'Tenant for demonstrations and sales',
        role: 'member',
        isActive: true,
        created: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    // Success - return tenant list
    return NextResponse.json({ tenants }, { status: 200 });
    
  } catch (error) {
    logger.error('[API] Error retrieving tenant list:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
} 