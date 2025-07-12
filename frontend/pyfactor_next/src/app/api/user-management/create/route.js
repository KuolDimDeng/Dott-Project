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
    logger.info('[UserManagement] Creating new user');
    
    // Get cookies for session authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sid');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userData = await request.json();
    
    // Validate required fields
    if (!userData.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
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
    const response = await fetch(`${backendUrl}/auth/rbac/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sessionCookie.value}`,
        'X-Session-ID': sessionCookie.value
      },
      body: JSON.stringify(backendData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      logger.error('[UserManagement] Backend error creating user:', {
        status: response.status,
        error: errorData
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
    
    logger.info('[UserManagement] User created successfully:', {
      userId: result.id,
      email: result.email,
      role: result.role
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