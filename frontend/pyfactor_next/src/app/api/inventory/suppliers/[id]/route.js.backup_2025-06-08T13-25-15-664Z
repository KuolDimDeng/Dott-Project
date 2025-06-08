import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * GET handler for /api/inventory/suppliers/:id endpoint
 * Returns a single supplier by ID
 */
export async function GET(request, { params }) {
  // Generate a unique request ID for tracing
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  logger.info(`[API] [${requestId}] Supplier GET request received for ID: ${params.id}`);
  
  try {
    // Extract tenant ID from request headers
    const tenantId = request.headers.get('x-tenant-id');
    logger.debug(`[API] [${requestId}] Tenant ID from header:`, tenantId);
    
    if (!tenantId) {
      logger.warn(`[API] [${requestId}] No tenant ID provided in headers`);
      return NextResponse.json(
        { error: 'Tenant ID is required' }, 
        { status: 400 }
      );
    }
    
    // Generate a mock supplier (in production, this would fetch from your RDS database)
    logger.debug(`[API] [${requestId}] Generating mock supplier data for ID: ${params.id}`);
    const mockSupplier = {
      id: params.id,
      name: `Supplier ${params.id.slice(-4)}`,
      contact_person: `Contact Person for ${params.id.slice(-4)}`,
      email: `supplier-${params.id.slice(-4)}@example.com`,
      phone: `555-${params.id.slice(-3)}-${params.id.slice(-4)}`,
      address: `${Math.floor(Math.random() * 1000) + 1} Main St, New York`,
      tenant_id: tenantId,
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      updated_at: new Date().toISOString()
    };
    
    logger.info(`[API] [${requestId}] Successfully retrieved supplier: ${params.id}`);
    return NextResponse.json(mockSupplier);
  } catch (error) {
    logger.error(`[API] [${requestId}] Error in supplier GET:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch supplier', 
        message: error.message,
        requestId 
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT handler for /api/inventory/suppliers/:id endpoint
 * Updates a supplier by ID
 */
export async function PUT(request, { params }) {
  // Generate a unique request ID for tracing
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  logger.info(`[API] [${requestId}] Supplier PUT request received for ID: ${params.id}`);
  
  try {
    // Extract tenant ID from request headers
    const tenantId = request.headers.get('x-tenant-id');
    logger.debug(`[API] [${requestId}] Tenant ID from header:`, tenantId);
    
    if (!tenantId) {
      logger.warn(`[API] [${requestId}] No tenant ID provided in headers`);
      return NextResponse.json(
        { error: 'Tenant ID is required' }, 
        { status: 400 }
      );
    }
    
    // Get supplier data from request body
    const supplierData = await request.json();
    logger.debug(`[API] [${requestId}] Supplier update data:`, supplierData);
    
    // Validate required fields
    if (!supplierData.name) {
      logger.warn(`[API] [${requestId}] Missing required field: name`);
      return NextResponse.json(
        { error: 'Name is required' }, 
        { status: 400 }
      );
    }
    
    // Update supplier (in production, this would update your RDS database)
    const updatedSupplier = {
      id: params.id,
      ...supplierData,
      tenant_id: tenantId,
      updated_at: new Date().toISOString()
    };
    
    logger.info(`[API] [${requestId}] Successfully updated supplier: ${params.id}`);
    return NextResponse.json(updatedSupplier);
  } catch (error) {
    logger.error(`[API] [${requestId}] Error in supplier PUT:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to update supplier', 
        message: error.message,
        requestId 
      }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for /api/inventory/suppliers/:id endpoint
 * Deletes a supplier by ID
 */
export async function DELETE(request, { params }) {
  // Generate a unique request ID for tracing
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  logger.info(`[API] [${requestId}] Supplier DELETE request received for ID: ${params.id}`);
  
  try {
    // Extract tenant ID from request headers
    const tenantId = request.headers.get('x-tenant-id');
    logger.debug(`[API] [${requestId}] Tenant ID from header:`, tenantId);
    
    if (!tenantId) {
      logger.warn(`[API] [${requestId}] No tenant ID provided in headers`);
      return NextResponse.json(
        { error: 'Tenant ID is required' }, 
        { status: 400 }
      );
    }
    
    // Delete supplier (in production, this would delete from your RDS database)
    logger.info(`[API] [${requestId}] Successfully deleted supplier: ${params.id}`);
    return NextResponse.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    logger.error(`[API] [${requestId}] Error in supplier DELETE:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to delete supplier', 
        message: error.message,
        requestId 
      }, 
      { status: 500 }
    );
  }
} 