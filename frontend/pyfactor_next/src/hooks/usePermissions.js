import { useSession } from './useSession-v2';
import { canPerformAction, getAccessibleRoutes } from '@/middleware/permissionChecker';

export function usePermissions() {
  const { session, loading } = useSession();
  
  const user = session?.user;
  
  // ENHANCED DEBUG: Log detailed session information
  console.log('🔍 [usePermissions] === PERMISSIONS DEBUG START ===');
  console.log('🔍 [usePermissions] Raw session object:', session);
  console.log('🔍 [usePermissions] Session type:', typeof session);
  console.log('🔍 [usePermissions] Session keys:', session ? Object.keys(session) : 'null session');
  console.log('🔍 [usePermissions] Session authenticated:', session?.authenticated);
  console.log('🔍 [usePermissions] Session loading:', loading);
  console.log('🔍 [usePermissions] Extracted user:', user);
  console.log('🔍 [usePermissions] User type:', typeof user);
  console.log('🔍 [usePermissions] User keys:', user ? Object.keys(user) : 'null user');
  console.log('🔍 [usePermissions] User role:', user?.role);
  console.log('🔍 [usePermissions] User permissions:', user?.permissions);
  console.log('🔍 [usePermissions] User page_permissions:', user?.page_permissions);
  console.log('🔍 [usePermissions] === PERMISSIONS DEBUG END ===');
  
  // Original debug logging
  console.log('[usePermissions] Hook data:', {
    session: session,
    user: user,
    userRole: user?.role,
    loading: loading
  });
  
  // Check if user can access a specific route
  const canAccessRoute = (path) => {
    if (!user) {
      return false;
    }
    
    // Owner/Admin can access all routes
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      return true;
    }
    
    // Check user page permissions (from session)
    console.log(`🔍 [usePermissions] Checking access to path: ${path}`);
    console.log('🔍 [usePermissions] Available page_permissions:', user.page_permissions);
    
    if (user.page_permissions && Array.isArray(user.page_permissions)) {
      const permission = user.page_permissions.find(p => p.path === path || p.page_id === path);
      console.log('🔍 [usePermissions] Found permission:', permission);
      return permission?.can_read || false;
    }
    
    // Fallback to old permissions format
    const permission = user.permissions?.find(p => p.path === path);
    return permission?.can_read || false;
  };
  
  // Check if user can perform a specific action on a route
  const canPerform = (path, action) => {
    return canPerformAction(user, path, action);
  };
  
  // Get all accessible routes for the user
  const accessibleRoutes = getAccessibleRoutes(user);
  
  // Check if user has a specific role
  const hasRole = (role) => {
    return user?.role === role;
  };
  
  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };
  
  // Check if user is owner
  const isOwner = () => {
    return user?.role === 'OWNER';
  };
  
  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };
  
  // Check if user is owner or admin
  const isOwnerOrAdmin = () => {
    return user?.role === 'OWNER' || user?.role === 'ADMIN';
  };
  
  return {
    user,
    isLoading: loading,
    canAccessRoute,
    canPerform,
    accessibleRoutes,
    hasRole,
    hasAnyRole,
    isOwner,
    isAdmin,
    isOwnerOrAdmin
  };
}