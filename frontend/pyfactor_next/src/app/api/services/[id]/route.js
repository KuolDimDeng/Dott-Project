'use server';

import { NextResponse } from 'next/server';
import { extractTenantId } from '@/utils/auth/tenant';
import * as db from '@/utils/db/rls-database';

// Fix logger import and add fallback
const logger = {
  info: function(message, ...args) {
    console.log(message, ...args);
  },
  error: function(message, ...args) {
    console.error(message, ...args);
  },
  warn: function(message, ...args) {
    console.warn(message, ...args);
  }
};

/**
 * GET handler for retrieving a specific service by ID
 */
export async function GET(request, { params }) {
  const { id } = params;
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    logger.info(`[${requestId}] GET /api/services/${id} - Start processing request`);
    
    // Extract tenant info from various sources
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Fetching service ${id} for tenant ${finalTenantId}`);
    
    // Ensure the inventory_service table exists
    try {
      await ensureInventoryServiceTable({
        debug: true,
        requestId
      });
    } catch (tableError) {
      logger.error(`[${requestId}] Error ensuring inventory_service table: ${tableError.message}`);
      return NextResponse.json(
        { error: 'Database table initialization failed' },
        { status: 500 }
      );
    }
    
    // Query for the specific service with RLS
    const query = `
      SELECT * FROM public.inventory_service 
      WHERE id = $1
    `;
    
    // Execute the query with tenant context for RLS
    let result;
    try {
      result = await db.query(query, [id], {
        signal: controller.signal,
        requestId,
        tenantId: finalTenantId,
        debug: true
      });
    } catch (dbError) {
      logger.error(`[${requestId}] Database error fetching service: ${dbError.message}`);
      return NextResponse.json(
        { error: 'Database error', message: dbError.message },
        { status: 500 }
      );
    }
    
    // Check if service was found
    if (result.rows.length === 0) {
      logger.warn(`[${requestId}] Service ${id} not found for tenant ${finalTenantId}`);
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    logger.info(`[${requestId}] Successfully retrieved service ${id} for tenant ${finalTenantId}`);
    
    return NextResponse.json(result.rows[0]);
    
  } catch (error) {
    console.error(`[${requestId}] Error retrieving service: ${error.message}`, error);
    
    // If this is an abort error from the timeout
    if (error.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        message: 'Request timed out',
        error: 'Database request timed out after 30 seconds'
      }, { status: 504 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Error retrieving service',
      error: error.message
    }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * PUT handler for updating a specific service by ID
 */
export async function PUT(request, { params }) {
  const { id } = params;
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);

  try {
    logger.info(`[${requestId}] PUT /api/services/${id} - Start processing request`);
    
    // Parse request body
    const requestData = await request.json();
    
    // Extract tenant info from various sources
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Updating service ${id} for tenant ${finalTenantId}`);
    
    // Validate required service data
    const { name } = requestData;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Service name is required'
      }, { status: 400 });
    }
    
    // Update the service using RLS-aware query
    const query = `
      UPDATE public.inventory_service
      SET 
        name = $1,
        description = $2,
        price = $3,
        is_for_sale = $4,
        is_recurring = $5,
        salestax = $6,
        duration = $7,
        billing_cycle = $8,
        unit = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    
    const params = [
      name,
      requestData.description || '',
      parseFloat(requestData.price) || 0,
      requestData.is_for_sale === true,
      requestData.is_recurring === true,
      parseFloat(requestData.salestax) || 0,
      requestData.duration || '',
      requestData.billing_cycle || 'monthly',
      requestData.unit || '',
      id
    ];
    
    // Execute the update with tenant context for RLS
    let result;
    try {
      result = await db.query(query, params, {
        requestId,
        tenantId: finalTenantId,
        debug: true
      });
    } catch (dbError) {
      logger.error(`[${requestId}] Database error updating service: ${dbError.message}`);
      return NextResponse.json(
        { error: 'Database error', message: dbError.message },
        { status: 500 }
      );
    }
    
    // Check if service was found and updated
    if (result.rows.length === 0) {
      logger.warn(`[${requestId}] Service ${id} not found for tenant ${finalTenantId}`);
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    logger.info(`[${requestId}] Successfully updated service ${id} for tenant ${finalTenantId}`);
    
    return NextResponse.json({
      success: true,
      service: result.rows[0],
      message: 'Service updated successfully'
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error updating service: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Error updating service',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE handler for removing a specific service by ID
 */
export async function DELETE(request, { params }) {
  const { id } = params;
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  try {
    logger.info(`[${requestId}] DELETE /api/services/${id} - Start processing request`);
    
    // Extract tenant info from various sources
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request`);
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Deleting service ${id} for tenant ${finalTenantId}`);
    
    // Delete the service using RLS-aware query
    const query = `
      DELETE FROM public.inventory_service 
      WHERE id = $1
      RETURNING id
    `;
    
    // Execute the delete with tenant context for RLS
    let result;
    try {
      result = await db.query(query, [id], {
        requestId,
        tenantId: finalTenantId,
        debug: true
      });
    } catch (dbError) {
      logger.error(`[${requestId}] Database error deleting service: ${dbError.message}`);
      return NextResponse.json(
        { error: 'Database error', message: dbError.message },
        { status: 500 }
      );
    }
    
    // Check if service was found and deleted
    if (result.rows.length === 0) {
      logger.warn(`[${requestId}] Service ${id} not found for tenant ${finalTenantId}`);
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    logger.info(`[${requestId}] Successfully deleted service ${id} for tenant ${finalTenantId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully'
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error deleting service: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Error deleting service',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Helper function to ensure the inventory_service table exists
 */
async function ensureInventoryServiceTable({ debug = false, requestId = 'system' } = {}) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS public.inventory_service (
      id UUID PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      service_code VARCHAR(100),
      price DECIMAL(10, 2) DEFAULT 0,
      unit VARCHAR(100),
      is_for_sale BOOLEAN DEFAULT true,
      is_recurring BOOLEAN DEFAULT false,
      salestax DECIMAL(10, 2) DEFAULT 0,
      duration VARCHAR(100),
      billing_cycle VARCHAR(50) DEFAULT 'monthly',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create an RLS policy if it doesn't already exist
    ALTER TABLE public.inventory_service ENABLE ROW LEVEL SECURITY;

    -- Drop any existing policies
    DROP POLICY IF EXISTS inventory_service_tenant_isolation ON public.inventory_service;

    -- Create new policy
    CREATE POLICY inventory_service_tenant_isolation 
      ON public.inventory_service
      USING (tenant_id = current_setting('app.current_tenant_id')::VARCHAR);
  `;

  if (debug) {
    logger.info(`[${requestId}] Ensuring inventory_service table exists`);
  }

  try {
    await db.query(createTableQuery, [], { requestId });
    if (debug) {
      logger.info(`[${requestId}] inventory_service table initialized successfully`);
    }
  } catch (error) {
    logger.error(`[${requestId}] Error initializing inventory_service table: ${error.message}`);
    throw error;
  }
} 