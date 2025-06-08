import { logger } from '@/utils/logger';

/**
 * Role-based access control utilities for Auth0 authentication
 */

export const USER_ROLES = {
  OWNER: 'owner',
  USER: 'user'
};

export const ROLE_HIERARCHY = {
  [USER_ROLES.OWNER]: 2,
  [USER_ROLES.USER]: 1
};

/**
 * Get user role from Auth0 session
 * @returns {Promise<string>} User role
 */
export async function getUserRole() {
  try {
    const response = await fetch('/api/auth/session');
    if (response.ok) {
      const sessionData = await response.json();
      return sessionData?.user?.role || sessionData?.user?.userRole || USER_ROLES.USER;
    }
  } catch (error) {
    logger.error('[RoleUtils] Error fetching user role:', error);
  }
  return USER_ROLES.USER; // Default to user role
}

/**
 * Check if user has a specific role
 * @param {string} requiredRole - Required role
 * @returns {Promise<boolean>} True if user has the role
 */
export async function hasRole(requiredRole) {
  const userRole = await getUserRole();
  return userRole === requiredRole;
}

/**
 * Check if user is an owner
 * @returns {Promise<boolean>} True if user is owner
 */
export async function isOwner() {
  return await hasRole(USER_ROLES.OWNER);
}

/**
 * Check if user is a regular user (not owner)
 * @returns {Promise<boolean>} True if user is regular user
 */
export async function isUser() {
  return await hasRole(USER_ROLES.USER);
}

/**
 * Check if user has minimum role level
 * @param {string} minimumRole - Minimum required role
 * @returns {Promise<boolean>} True if user meets minimum role requirement
 */
export async function hasMinimumRole(minimumRole) {
  const userRole = await getUserRole();
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Synchronous version - gets role from cached session data
 * @param {Object} sessionData - Auth0 session data
 * @returns {string} User role
 */
export function getUserRoleSync(sessionData) {
  if (!sessionData?.user) return USER_ROLES.USER;
  return sessionData.user.role || sessionData.user.userRole || USER_ROLES.USER;
}

/**
 * Check if user can manage other users (only owners can)
 * @returns {Promise<boolean>} True if user can manage users
 */
export async function canManageUsers() {
  const userRole = await getUserRole();
  return userRole === USER_ROLES.OWNER;
}

/**
 * Get user permissions based on role
 * @returns {Promise<Object>} User permissions object
 */
export async function getUserPermissions() {
  const userRole = await getUserRole();
  
  const basePermissions = {
    canViewDashboard: true,
    canViewReports: false,
    canManageProducts: false,
    canManageUsers: false,
    canManageSettings: false,
    canManageBilling: false,
    canViewFinancials: false,
    canManageEmployees: false
  };

  switch (userRole) {
    case USER_ROLES.OWNER:
      return {
        ...basePermissions,
        canViewReports: true,
        canManageProducts: true,
        canManageUsers: true,
        canManageSettings: true,
        canManageBilling: true,
        canViewFinancials: true,
        canManageEmployees: true
      };
    
    case USER_ROLES.USER:
    default:
      // Users have limited permissions set by owner
      return basePermissions;
  }
}

export default {
  USER_ROLES,
  ROLE_HIERARCHY,
  getUserRole,
  hasRole,
  isOwner,
  isUser,
  hasMinimumRole,
  getUserRoleSync,
  canManageUsers,
  getUserPermissions
};