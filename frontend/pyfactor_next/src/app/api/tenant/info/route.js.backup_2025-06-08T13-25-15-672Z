import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

/**
 * API route to get tenant information
 * Returns details about the specified tenant if the user has access
 * If not authenticated, returns limited information
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
    let isAuthenticated = false;
    let userId = null;
    
    // Try to extract and verify the token if available
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = jwtDecode(token);
        userId = decodedToken.sub;
        isAuthenticated = true;
      } catch (error) {
        console.warn(`[API] Error decoding token for tenant ${tenantId}, proceeding as unauthenticated:`, error);
      }
    }
    
    // Return limited information if not authenticated
    if (!isAuthenticated) {
      console.info(`[API] Returning limited tenant info for unauthenticated request: ${tenantId}`);
      return NextResponse.json({
        id: tenantId,
        name: `Tenant ${tenantId.substring(0, 8)}`,
        authenticated: false,
        limited: true,
        schemaName: `tenant_${tenantId.replace(/-/g, '_')}`,
        message: 'Limited tenant information (not authenticated)'
      }, { status: 200 });
    }
    
    // For authenticated users, return full tenant info
    // In production, replace this with actual database queries
    
    // Example mock tenant info
    const tenantInfo = {
      id: tenantId,
      name: `Tenant ${tenantId.substring(0, 8)}`,
      description: 'Sample tenant for demonstration',
      created: new Date().toISOString(),
      authenticated: true,
      userId: userId,
      schemaName: `tenant_${tenantId.replace(/-/g, '_')}`,
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
    console.error('[API] Error retrieving tenant info:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error' 
      }, 
      { status: 500 }
    );
  }
} 