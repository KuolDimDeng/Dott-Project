import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { logger } from '@/utils/logger';

/**
 * API route to get tenant information
 * Returns details about the specified tenant if the user has access
 */
export async function GET(request) {
  try {
    // Get tenant ID from query parameter
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { 
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
    // 1. Query your database for the tenant information
    // 2. Verify the user has access to this tenant
    // 3. Return the tenant details if allowed
    
    // For now, we'll return a mock response
    // In production, replace this with actual database queries
    
    // Example mock tenant info
    const tenantInfo = {
      id: tenantId,
      name: `Tenant ${tenantId.substring(0, 8)}`,
      description: 'Sample tenant for demonstration',
      created: new Date().toISOString(),
      settings: {
        theme: 'light',
        timezone: 'UTC',
        features: {
          billing: true,
          reporting: true,
          analytics: true
        }
      },
      subscription: {
        plan: 'premium',
        status: 'active',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
    
    // Success - return tenant information
    return NextResponse.json(tenantInfo, { status: 200 });
    
  } catch (error) {
    logger.error('[API] Error retrieving tenant info:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
} 