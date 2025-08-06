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
  return proxyToBackend('users/me', request);
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