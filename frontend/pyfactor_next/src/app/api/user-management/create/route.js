/**
 * User Management API - Create User Endpoint
 * Creates a new user with optional employee record
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

/**
 * POST /api/user-management/create
 * Create a new user with role-based access
 */
export async function POST(request) {
  try {
    logger.info('[UserManagement] ========== CREATE USER REQUEST START ==========');
    logger.info('[UserManagement] Request URL:', request.url);
    logger.info('[UserManagement] Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get cookies for session authentication
    const cookieHeader = request.headers.get('cookie') || '';
    logger.info('[UserManagement] Cookie header:', cookieHeader);
    logger.info('[UserManagement] Has sid cookie:', cookieHeader.includes('sid='));
    
    if (!cookieHeader || !cookieHeader.includes('sid=')) {
      logger.error('[UserManagement] No session cookie found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Extract session ID for logging
    const sidMatch = cookieHeader.match(/sid=([^;]+)/);
    const sessionId = sidMatch ? sidMatch[1] : 'not found';
    logger.info('[UserManagement] Session ID:', sessionId.substring(0, 8) + '...');
    
    const userData = await request.json();
    logger.info('[UserManagement] Request body:', userData);
    
    // Validate required fields
    if (!userData.email) {
      logger.error('[UserManagement] Email is required');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      logger.error('[UserManagement] Invalid email format:', userData.email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Prepare the request body for backend
    const backendData = {
      email: userData.email,
      role: userData.role || 'USER',
      permissions: userData.permissions || [],
      send_password_reset: true, // Always send password reset email for new users
      onboarding_completed: true, // Skip onboarding for invited users
      create_employee: userData.create_employee || false,
      link_employee: userData.link_employee || false,
      employee_id: userData.employee_id || null,
      employee_data: userData.employee_data || null
    };
    
    logger.info('[UserManagement] Sending create user request to backend', {
      email: backendData.email,
      role: backendData.role,
      create_employee: backendData.create_employee,
      link_employee: backendData.link_employee
    });
    
    // Call backend API to create user
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    logger.info('[UserManagement] Making backend request to:', `${backendUrl}/auth/rbac/users/`);
    logger.info('[UserManagement] Request data:', backendData);
    
    const response = await fetch(`${backendUrl}/auth/rbac/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-Session-ID': sessionId
      },
      body: JSON.stringify(backendData)
    });
    
    logger.info('[UserManagement] Backend response status:', response.status);
    logger.info('[UserManagement] Backend response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[UserManagement] Backend error response text:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        logger.error('[UserManagement] Failed to parse error response as JSON:', parseError);
        errorData = { message: errorText };
      }
      
      logger.error('[UserManagement] Backend error creating user:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        requestUrl: `${backendUrl}/auth/rbac/users/`,
        requestHeaders: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader ? 'present' : 'missing',
          'X-Session-ID': sessionId ? 'present' : 'missing'
        }
      });
      
      // Handle specific error cases
      if (response.status === 409 || errorData.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'You do not have permission to create users' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: errorData.message || 'Failed to create user' },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    logger.info('[UserManagement] Backend success response:', result);
    
    logger.info('[UserManagement] User created successfully:', {
      userId: result.id,
      email: result.email,
      role: result.role,
      onboarding_completed: result.onboarding_completed,
      tenant_id: result.tenant_id
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        email: result.email,
        name: result.name || result.email,
        role: result.role,
        status: 'pending', // New users are pending until they set password
        permissions: result.permissions || [],
        employee_id: result.employee_id,
        created_at: result.created_at || new Date().toISOString()
      },
      message: `User created successfully. Password reset email sent to ${result.email}`
    }, { status: 201 });
    
  } catch (error) {
    logger.error('[UserManagement] Error creating user:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', message: error.message },
      { status: 500 }
    );
  }
}