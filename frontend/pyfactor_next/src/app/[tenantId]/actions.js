'use server';

import { cookies } from 'next/headers';

/**
 * Sets the tenant ID cookie
 * @param {string} tenantId - The tenant ID to set in the cookie
 * @returns {Promise<{ success: boolean, error?: string }>} Result of the operation
 */
export async function setTenantCookie(tenantId) {
  try {
    if (!tenantId) {
      return { success: false, error: 'No tenant ID provided' };
    }
    
    const cookieStore = cookies();
    
    cookieStore.set({
      name: 'tenantId',
      value: tenantId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting tenant cookie:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to set tenant cookie' 
    };
  }
} 