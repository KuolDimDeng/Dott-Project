/**
 * User Management API - Update User Permissions Endpoint
 * Handles updating user permissions with read/write levels
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { convertPageIdsToPermissions } from '@/utils/permissionMapping';

/**
 * POST /api/user-management/users/[id]/update-permissions
 * Update user permissions with read/write levels
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    logger.info(`[UserManagement] Updating permissions for user: ${id}`);
    
    // Get cookies for session authentication
    const cookieHeader = request.headers.get('cookie') || '';
    logger.info('[UserManagement] Cookie header present:', !!cookieHeader);
    
    if (!cookieHeader || !cookieHeader.includes('sid=')) {
      logger.error('[UserManagement] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get request body
    const data = await request.json();
    
    // Convert permissions if needed
    let processedData = { ...data };
    if (data.page_permissions && typeof data.page_permissions === 'object' && !Array.isArray(data.page_permissions)) {
      // Convert from frontend object format to backend array format
      processedData.page_permissions = convertPageIdsToPermissions(data.page_permissions);
    }
    
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const apiUrl = `${backendUrl}/auth/rbac/users/${id}/update_permissions/`;
    
    logger.info('[UserManagement] Making request to:', apiUrl);
    logger.info('[UserManagement] Request data:', processedData);
    
    // Forward request to Django backend with the update_permissions action
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(processedData),
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
      logger.error('[UserManagement] Non-JSON response received:');
      logger.error('[UserManagement] Response status:', response.status);
      logger.error('[UserManagement] Content-Type:', contentType);
      logger.error('[UserManagement] Response text (first 500 chars):', responseText.substring(0, 500));
      
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
      logger.error('[UserManagement] Backend error:', responseData);
      return NextResponse.json(
        responseData,
        { status: response.status }
      );
    }
    
    logger.info('[UserManagement] Successfully updated permissions');
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    logger.error('[UserManagement] Error updating user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions', message: error.message },
      { status: 500 }
    );
  }
}