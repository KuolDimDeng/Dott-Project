/**
 * Banking Connection Detail API Route
 * Manages individual bank account connections
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * PATCH /api/banking/connections/:id
 * Updates a bank connection (e.g., set as primary)
 */
export async function PATCH(request, { params }) {
  const { id } = params;
  return proxyToBackend(`banking/connections/${id}`, request);
}

/**
 * DELETE /api/banking/connections/:id
 * Disconnects a bank account
 */
export async function DELETE(request, { params }) {
  const { id } = params;
  return proxyToBackend(`banking/connections/${id}`, request);
}