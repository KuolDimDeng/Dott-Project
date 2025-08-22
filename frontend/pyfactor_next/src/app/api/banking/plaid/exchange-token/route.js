/**
 * Plaid Token Exchange API Route
 * Exchanges public tokens for access tokens
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * POST /api/banking/plaid/exchange-token
 * Exchanges Plaid public token for access token
 */
export async function POST(request) {
  return proxyToBackend('banking/exchange_token', request);
}