import { NextResponse } from 'next/server';

// Map of paths to required permissions
const PROTECTED_ROUTES = {
  // Sales Management
  '/dashboard/products': { 
    category: 'Sales',
    permissions: ['read']
  },
  '/dashboard/services': { 
    category: 'Sales',
    permissions: ['read']
  },
  '/dashboard/customers': { 
    category: 'Sales',
    permissions: ['read']
  },
  '/dashboard/invoices': { 
    category: 'Sales',
    permissions: ['read']
  },
  '/dashboard/quotes': { 
    category: 'Sales',
    permissions: ['read']
  },
  '/dashboard/payments': { 
    category: 'Sales',
    permissions: ['read']
  },
  '/dashboard/inventory': { 
    category: 'Sales',
    permissions: ['read']
  },
  
  // HR Management
  '/dashboard/employees': { 
    category: 'HR',
    permissions: ['read']
  },
  '/dashboard/benefits': { 
    category: 'HR',
    permissions: ['read']
  },
  '/dashboard/leave': { 
    category: 'HR',
    permissions: ['read']
  },
  '/dashboard/payroll': { 
    category: 'HR',
    permissions: ['read']
  },
  
  // Finance
  '/dashboard/expenses': { 
    category: 'Finance',
    permissions: ['read']
  },
  '/dashboard/reports': { 
    category: 'Finance',
    permissions: ['read']
  },
  '/dashboard/taxes': { 
    category: 'Finance',
    permissions: ['read']
  },
  
  // System (Owner/Admin only)
  '/settings/users': { 
    category: 'System',
    permissions: ['read'],
    roles: ['OWNER', 'ADMIN']
  },
  '/settings/subscription': { 
    category: 'System',
    permissions: ['read'],
    roles: ['OWNER']
  },
  '/settings/close-account': { 
    category: 'System',
    permissions: ['read'],
    roles: ['OWNER']
  }
};

// Check if user has permission to access a route
export async function checkPagePermissions(request, sessionData) {
  const pathname = request.nextUrl.pathname;
  
  // Extract the base path without tenant ID
  const pathMatch = pathname.match(/^\/[^\/]+(\/.*)$/);
  const basePath = pathMatch ? pathMatch[1] : pathname;
  
  console.log('[PermissionChecker] Checking permissions for:', {
    pathname,
    basePath,
    userRole: sessionData?.user?.role,
    hasPermissions: !!sessionData?.user?.permissions
  });
  
  // Find the protected route configuration
  const routeConfig = PROTECTED_ROUTES[basePath];
  
  if (!routeConfig) {
    // Not a protected route, allow access
    console.log('[PermissionChecker] Route not protected, allowing access');
    return NextResponse.next();
  }
  
  // Check if user is authenticated
  if (!sessionData?.user) {
    console.log('[PermissionChecker] User not authenticated');
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  const user = sessionData.user;
  
  // Check role-based access first (for system pages)
  if (routeConfig.roles) {
    if (!routeConfig.roles.includes(user.role)) {
      console.log('[PermissionChecker] User role not allowed:', {
        userRole: user.role,
        requiredRoles: routeConfig.roles
      });
      
      // Redirect to access denied with error details
      const url = new URL('/access-denied', request.url);
      url.searchParams.set('path', basePath);
      url.searchParams.set('reason', 'role');
      return NextResponse.redirect(url);
    }
  }
  
  // OWNER and ADMIN have access to all pages
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    console.log('[PermissionChecker] Owner/Admin access granted');
    return NextResponse.next();
  }
  
  // For regular users, check page-specific permissions
  if (user.role === 'USER' && user.permissions) {
    // Find permission for this specific path
    const pagePermission = user.permissions.find(p => p.path === basePath);
    
    if (!pagePermission) {
      console.log('[PermissionChecker] No permission found for path');
      const url = new URL('/access-denied', request.url);
      url.searchParams.set('path', basePath);
      url.searchParams.set('reason', 'no_permission');
      return NextResponse.redirect(url);
    }
    
    // Check if user has required permission level
    const hasRequiredPermission = routeConfig.permissions.every(perm => {
      switch (perm) {
        case 'read':
          return pagePermission.can_read;
        case 'write':
          return pagePermission.can_write;
        case 'edit':
          return pagePermission.can_edit;
        case 'delete':
          return pagePermission.can_delete;
        default:
          return false;
      }
    });
    
    if (!hasRequiredPermission) {
      console.log('[PermissionChecker] Insufficient permissions:', {
        required: routeConfig.permissions,
        userPermissions: pagePermission
      });
      
      const url = new URL('/access-denied', request.url);
      url.searchParams.set('path', basePath);
      url.searchParams.set('reason', 'insufficient_permission');
      return NextResponse.redirect(url);
    }
  }
  
  // Allow access
  console.log('[PermissionChecker] Access granted');
  return NextResponse.next();
}

// Get accessible routes for a user
export function getAccessibleRoutes(user) {
  if (!user) return [];
  
  const accessibleRoutes = [];
  
  // Owner/Admin have access to all routes
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return Object.keys(PROTECTED_ROUTES);
  }
  
  // For regular users, check permissions
  if (user.permissions) {
    user.permissions.forEach(permission => {
      if (permission.can_read && PROTECTED_ROUTES[permission.path]) {
        accessibleRoutes.push(permission.path);
      }
    });
  }
  
  return accessibleRoutes;
}

// Check if user can perform specific action on a route
export function canPerformAction(user, path, action) {
  if (!user) return false;
  
  // Owner/Admin can perform all actions
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return true;
  }
  
  // Check user permissions
  const permission = user.permissions?.find(p => p.path === path);
  if (!permission) return false;
  
  switch (action) {
    case 'read':
      return permission.can_read;
    case 'write':
      return permission.can_write;
    case 'edit':
      return permission.can_edit;
    case 'delete':
      return permission.can_delete;
    default:
      return false;
  }
}