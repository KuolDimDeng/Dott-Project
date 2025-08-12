import { cookies } from 'next/headers';

/**
 * Server-side auth utilities for API routes
 */

/**
 * Get session from request for API routes
 * @returns {Promise<Object|null>}
 */
export async function getSessionFromRequest() {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return null;
    }
    
    // Validate session with backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/sessions/validate/${sidCookie.value}/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('[Auth Server] Error getting session:', error);
    return null;
  }
}

/**
 * Validate tenant access for a user
 * @param {Object} user - The user object
 * @param {string} tenantId - The tenant ID to validate
 * @returns {boolean}
 */
export function validateTenantAccess(user, tenantId) {
  if (!user || !tenantId) return false;
  
  // Check if user's tenant_id or business_id matches
  return user.tenant_id === tenantId || user.business_id === tenantId;
}

/**
 * Get auth headers for backend requests
 * @returns {Promise<Object>}
 */
export async function getAuthHeaders() {
  const cookieStore = cookies();
  const sidCookie = cookieStore.get('sid');
  
  if (!sidCookie?.value) {
    return {};
  }
  
  return {
    'Authorization': `Session ${sidCookie.value}`,
    'Content-Type': 'application/json'
  };
}