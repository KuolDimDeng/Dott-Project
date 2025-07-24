/**
 * User Page Privileges API - Set Privileges Endpoint
 * Proxies page privilege updates to the backend
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * POST /api/users/page-privileges/set_privileges
 * Set page access privileges for a user
 */
export async function POST(request) {
  try {
    logger.info('[PagePrivileges] Setting user page privileges');
    
    // Get cookies for session authentication
    const cookieHeader = request.headers.get('cookie') || '';
    
    if (!cookieHeader || !cookieHeader.includes('sid=')) {
      logger.error('[PagePrivileges] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get request body
    const data = await request.json();
    logger.info('[PagePrivileges] Request data:', JSON.stringify(data, null, 2));
    
    const { user_id, page_access, can_manage_users } = data;
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const apiUrl = `${backendUrl}/auth/rbac/users/${user_id}/update_permissions/`;
    
    logger.info('[PagePrivileges] Making request to:', apiUrl);
    
    // Prepare data for backend API
    const backendData = {
      page_access: page_access || [],
      can_manage_users: can_manage_users || false
    };
    
    // Forward request to Django backend
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-CSRFToken': request.headers.get('x-csrftoken') || '',
      },
      body: JSON.stringify(backendData),
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
      logger.error('[PagePrivileges] Response text (first 500 chars):', responseText.substring(0, 500));
      
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
        {
          ...responseData,
          debug: {
            requestUrl: apiUrl,
            requestData: backendData,
            status: response.status
          }
        },
        { status: response.status }
      );
    }
    
    logger.info('[PagePrivileges] Successfully updated page privileges');
    
    return NextResponse.json({
      success: true,
      message: 'Page privileges updated successfully',
      data: responseData
    });
    
  } catch (error) {
    logger.error('[PagePrivileges] Error updating page privileges:', error);
    return NextResponse.json(
      { error: 'Failed to update page privileges', message: error.message },
      { status: 500 }
    );
  }
}