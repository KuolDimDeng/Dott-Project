import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/role
 * Returns the current user's role and permissions
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        error: 'No session found',
        role: 'user',
        permissions: {
          canViewDashboard: true,
          canManageUsers: false,
          canManageSettings: false,
          canManageBilling: false
        }
      }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid session',
        role: 'user'
      }, { status: 400 });
    }
    
    const { user } = sessionData;
    
    if (!user) {
      return NextResponse.json({ 
        error: 'No user in session',
        role: 'user'
      }, { status: 401 });
    }
    
    // Get role from session (default to 'user')
    const role = user.role || user.userRole || 'user';
    
    // Define permissions based on role
    let permissions = {
      canViewDashboard: true,
      canViewReports: false,
      canManageProducts: false,
      canManageUsers: false,
      canManageSettings: false,
      canManageBilling: false,
      canViewFinancials: false,
      canManageEmployees: false,
      canInviteUsers: false
    };

    switch (role) {
      case 'owner':
        permissions = {
          canViewDashboard: true,
          canViewReports: true,
          canManageProducts: true,
          canManageUsers: true,
          canManageSettings: true,
          canManageBilling: true,
          canViewFinancials: true,
          canManageEmployees: true,
          canInviteUsers: true
        };
        break;
      
      case 'user':
      default:
        // Users have limited permissions that can be customized by owner
        // Default permissions already set above
        break;
    }
    
    return NextResponse.json({
      role,
      permissions,
      user: {
        email: user.email,
        name: user.name,
        tenantId: user.tenant_id || user.tenantId,
        businessName: user.businessName
      }
    });
    
  } catch (error) {
    console.error('[Auth Role API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      role: 'user'
    }, { status: 500 });
  }
}

/**
 * POST /api/auth/role
 * Update user role (owner only)
 */
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    
    const { user } = sessionData;
    const currentRole = user?.role || user?.userRole || 'user';
    
    // Only owners can update roles
    if (currentRole !== 'owner') {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: 'Only owners can update user roles'
      }, { status: 403 });
    }
    
    const { userId, newRole } = await request.json();
    
    // Validate new role
    const validRoles = ['owner', 'user'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ 
        error: 'Invalid role',
        validRoles
      }, { status: 400 });
    }
    
    // Here you would update the role in your backend
    // For now, we'll return success
    return NextResponse.json({
      success: true,
      message: `User role updated to ${newRole}`,
      userId,
      newRole
    });
    
  } catch (error) {
    console.error('[Auth Role API] Error updating role:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}