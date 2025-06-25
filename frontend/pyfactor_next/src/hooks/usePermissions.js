import { useSession } from './useSession-v2';
import { canPerformAction, getAccessibleRoutes } from '@/middleware/permissionChecker';

export function usePermissions() {
  const { session, loading } = useSession();
  
  const user = session?.user;
  
  // Debug logging
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
    
    // Check user permissions
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