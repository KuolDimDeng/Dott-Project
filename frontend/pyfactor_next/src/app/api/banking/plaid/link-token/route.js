/**
 * Plaid Link Token API Route
 * Creates Plaid Link tokens for bank connections
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * POST /api/banking/plaid/link-token
 * Creates a Plaid Link token
 */
export async function POST(request) {
  return proxyToBackend('banking/plaid/link-token', request);
}