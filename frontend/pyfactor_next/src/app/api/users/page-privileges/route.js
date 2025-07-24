/**
 * User Page Privileges API - Get Privileges Endpoint
 * Proxies page privilege fetching to the backend
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET /api/users/page-privileges?user_id=xxx
 * Get page access privileges for a user
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    
    logger.info(`[PagePrivileges] Fetching page privileges for user: ${user_id}`);
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get cookies for session authentication
    const cookieHeader = request.headers.get('cookie') || '';
    
    if (!cookieHeader || !cookieHeader.includes('sid=')) {
      logger.error('[PagePrivileges] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const apiUrl = `${backendUrl}/auth/rbac/users/${user_id}/`;
    
    logger.info('[PagePrivileges] Making request to:', apiUrl);
    
    // Forward request to Django backend
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      // If not JSON, it's likely an HTML error page
      const responseText = await response.text();
      logger.error('[PagePrivileges] Non-JSON response received:');
      logger.error('[PagePrivileges] Response status:', response.status);
      logger.error('[PagePrivileges] Content-Type:', contentType);
      
      return NextResponse.json(
        { 
          error: 'Invalid response from backend', 
          details: 'Backend returned HTML instead of JSON. The endpoint may not exist or there may be an authentication issue.',
          status: response.status,
          contentType: contentType
        },
        { status: response.status || 500 }
      );
    }
    
    if (!response.ok) {
      logger.error('[PagePrivileges] Backend error status:', response.status);
      logger.error('[PagePrivileges] Backend error data:', JSON.stringify(responseData, null, 2));
      
      return NextResponse.json(
        responseData,
        { status: response.status }
      );
    }
    
    logger.info('[PagePrivileges] Successfully fetched page privileges');
    
    // Transform the data to match what the frontend expects
    const transformedData = [{
      user_id: user_id,
      page_access: responseData.page_access || [],
      can_manage_users: responseData.can_manage_users || false
    }];
    
    return NextResponse.json(transformedData);
    
  } catch (error) {
    logger.error('[PagePrivileges] Error fetching page privileges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page privileges', message: error.message },
      { status: 500 }
    );
  }
}