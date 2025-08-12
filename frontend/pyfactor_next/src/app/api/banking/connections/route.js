/**
 * Banking Connections API Route
 * Manages bank account connections
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * GET /api/banking/connections
 * Fetches user's bank connections
 */
export async function GET(request) {
  return proxyToBackend('banking/connections', request);
}

/**
 * POST /api/banking/connections
 * Creates a new bank connection
 */
export async function POST(request) {
  return proxyToBackend('banking/connections', request);
}