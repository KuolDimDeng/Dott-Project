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
    
    // Get request body
    const data = await request.json();
    
    // Convert permissions if needed
    let processedData = { ...data };
    if (data.page_permissions && typeof data.page_permissions === 'object' && !Array.isArray(data.page_permissions)) {
      // Convert from frontend object format to backend array format
      processedData.page_permissions = convertPageIdsToPermissions(data.page_permissions);
    }
    
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';
    
    // Forward request to Django backend with the update_permissions action
    const response = await fetch(`${backendUrl}/api/user-management/users/${id}/update_permissions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(processedData),
      credentials: 'include',
    });

    const responseData = await response.json();
    
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