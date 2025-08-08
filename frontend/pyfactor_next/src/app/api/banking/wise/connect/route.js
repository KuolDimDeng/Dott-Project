/**
 * Wise Bank Connection API Route
 * Connects international bank accounts via Stripe
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * POST /api/banking/wise/connect
 * Connects a bank account via Wise/Stripe
 */
export async function POST(request) {
  return proxyToBackend('banking/wise/connect', request);
}