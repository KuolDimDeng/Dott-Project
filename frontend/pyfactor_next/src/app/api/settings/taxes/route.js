/**
 * Tax Settings API Route
 * Industry-standard implementation with proper authentication
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * GET /api/settings/taxes
 * Fetches tax settings
 */
export async function GET(request) {
  return proxyToBackend('taxes/tenant-settings/current', request);
}

/**
 * POST /api/settings/taxes
 * Saves custom tax settings
 */
export async function POST(request) {
  return proxyToBackend('taxes/tenant-settings/save_custom', request);
}

/**
 * DELETE /api/settings/taxes
 * Resets to global tax settings
 */
export async function DELETE(request) {
  return proxyToBackend('taxes/tenant-settings/reset_to_global', request);
}