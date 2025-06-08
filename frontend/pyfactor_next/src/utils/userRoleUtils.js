/**
 * User Role Utilities
 * Handles user role case sensitivity and validation
 */

// Simple cache for user roles
const memoryCache = new Map();

const ROLE_CACHE_KEY = 'userRole';

/**
 * Normalize role case
 * @param {string} role - The role to normalize
 * @returns {string} The normalized role
 */
export const normalizeRoleCase = (role) => {
  if (!role) return role;
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

/**
 * Store normalized user role
 * @param {string} role - The role to store
 * @returns {Promise<void>}
 */
export const storeNormalizedRole = (role) => {
  try {
    const normalizedRole = normalizeRoleCase(role);
    memoryCache.set(ROLE_CACHE_KEY, normalizedRole);
  } catch (error) {
    console.error('Error storing normalized role:', error);
    throw error;
  }
};

/**
 * Get normalized user role
 * @returns {Promise<string>} The normalized role
 */
export const getNormalizedRole = () => {
  try {
    const role = memoryCache.get(ROLE_CACHE_KEY);
    return role ? normalizeRoleCase(role) : null;
  } catch (error) {
    console.error('Error getting normalized role:', error);
    throw error;
  }
};

/**
 * Clear role cache
 * @returns {Promise<void>}
 */
export const clearRoleCache = () => {
  try {
    memoryCache.delete(ROLE_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing role cache:', error);
    throw error;
  }
};

/**
 * Validate user role
 * @param {string} role - The role to validate
 * @returns {boolean} Whether the role is valid
 */
export const isValidRole = (role) => {
  const validRoles = ['Admin', 'User', 'Manager', 'Employee'];
  return validRoles.includes(normalizeRoleCase(role));
};

/**
 * Get role permissions
 * @param {string} role - The role to get permissions for
 * @returns {Object} The role permissions
 */
export const getRolePermissions = (role) => {
  const normalizedRole = normalizeRoleCase(role);
  const permissions = {
    Admin: {
      canManageUsers: true,
      canManageRoles: true,
      canManageSettings: true,
      canViewReports: true,
      canEditData: true,
    },
    Manager: {
      canManageUsers: true,
      canManageRoles: false,
      canManageSettings: false,
      canViewReports: true,
      canEditData: true,
    },
    User: {
      canManageUsers: false,
      canManageRoles: false,
      canManageSettings: false,
      canViewReports: true,
      canEditData: false,
    },
    Employee: {
      canManageUsers: false,
      canManageRoles: false,
      canManageSettings: false,
      canViewReports: false,
      canEditData: false,
    },
  };

  return permissions[normalizedRole] || permissions.Employee;
}; 