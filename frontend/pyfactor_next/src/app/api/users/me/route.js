/**
 * User Profile API Route
 * Industry-standard implementation with proper authentication
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * GET /api/users/me
 * Fetches current user profile
 */
export async function GET(request) {
  const response = await proxyToBackend('users/me', request);
  
  // Clone the response to read it
  const clonedResponse = response.clone();
  const data = await clonedResponse.json();
  
  console.log('🎯 [/api/users/me] Response data:', {
    email: data.email,
    country: data.country,
    business_country: data.business_country,
    tenant_id: data.tenant_id
  });
  
  return response;
}

/**
 * PATCH /api/users/me
 * Updates current user profile
 */
export async function PATCH(request) {
  return proxyToBackend('users/me', request);
}

/**
 * PUT /api/users/me
 * Replaces current user profile
 */
export async function PUT(request) {
  return proxyToBackend('users/me', request);
}