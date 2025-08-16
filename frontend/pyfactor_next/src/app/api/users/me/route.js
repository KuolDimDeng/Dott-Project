/**
 * User Profile API Route
 * Industry-standard implementation with proper authentication
 */

import { proxyToBackend } from '@/lib/auth/api-auth';
import { cookies } from 'next/headers';

/**
 * GET /api/users/me
 * Fetches current user profile
 */
export async function GET(request) {
  // Debug logging
  const cookieStore = cookies();
  const sid = cookieStore.get('sid');
  console.log('🔍🔍🔍 [/api/users/me route] Session cookie exists:', !!sid);
  console.log('🔍🔍🔍 [/api/users/me route] Session value:', sid?.value?.substring(0, 8) + '...');
  
  return proxyToBackend('users/me/', request);
}

/**
 * PATCH /api/users/me
 * Updates current user profile
 */
export async function PATCH(request) {
  // Debug logging
  const cookieStore = cookies();
  const sid = cookieStore.get('sid');
  console.log('🔍🔍🔍 [/api/users/me PATCH] Session cookie exists:', !!sid);
  console.log('🔍🔍🔍 [/api/users/me PATCH] Session value:', sid?.value?.substring(0, 8) + '...');
  
  return proxyToBackend('users/me/', request);
}

/**
 * PUT /api/users/me
 * Replaces current user profile
 */
export async function PUT(request) {
  return proxyToBackend('users/me', request);
}