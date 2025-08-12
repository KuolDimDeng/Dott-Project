/**
 * Customers API Route
 * Industry-standard implementation with proper authentication
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * GET /api/backend/crm/customers
 * Fetches customers from backend with authentication
 */
export async function GET(request) {
  return proxyToBackend('crm/customers', request);
}

/**
 * POST /api/backend/crm/customers
 * Creates a new customer
 */
export async function POST(request) {
  return proxyToBackend('crm/customers', request);
}

/**
 * PUT /api/backend/crm/customers
 * Updates a customer
 */
export async function PUT(request) {
  return proxyToBackend('crm/customers', request);
}

/**
 * DELETE /api/backend/crm/customers
 * Deletes a customer
 */
export async function DELETE(request) {
  return proxyToBackend('crm/customers', request);
}