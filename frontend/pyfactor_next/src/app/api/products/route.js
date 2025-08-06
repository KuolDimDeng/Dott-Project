/**
 * Products API Route
 * Industry-standard implementation with proper authentication
 */

import { proxyToBackend } from '@/lib/auth/api-auth';

/**
 * GET /api/products
 * Fetches products from backend with authentication
 */
export async function GET(request) {
  return proxyToBackend('inventory/products', request);
}

/**
 * POST /api/products
 * Creates a new product
 */
export async function POST(request) {
  return proxyToBackend('inventory/products', request);
}

/**
 * PUT /api/products
 * Updates a product
 */
export async function PUT(request) {
  return proxyToBackend('inventory/products', request);
}

/**
 * DELETE /api/products
 * Deletes a product
 */
export async function DELETE(request) {
  return proxyToBackend('inventory/products', request);
}