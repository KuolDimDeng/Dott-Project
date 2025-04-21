'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { extractTenantId } from '@/utils/auth/tenant';
import * as db from '@/utils/db/rls-database';
import { logger } from '@/utils/logger';

/**
 * GET handler for /api/inventory/suppliers endpoint
 * Returns a list of suppliers for the given tenant with RLS
 */
export async function GET(request) {
  // Generate a unique request ID for tracing
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    logger.info(`[${requestId}] GET /api/inventory/suppliers - Start processing request`);
    
    // Extract tenant ID from request headers with strict validation
    const tenantId = extractTenantId(request);
    
    if (!tenantId) {
      logger.error(`[${requestId}] SECURITY ERROR: No valid tenant ID found in request headers`);
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Valid tenant ID is required for data access'
        },
        { status: 401 }
      );
    }
    
    // Validate tenant ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      logger.error(`[${requestId}] SECURITY ERROR: Invalid tenant ID format: ${tenantId}`);
      return NextResponse.json(
        { 
          error: 'Invalid tenant ID',
          message: 'Tenant ID format is incorrect'
        },
        { status: 403 }
      );
    }
    
    logger.info(`[${requestId}] Fetching suppliers for tenant ${tenantId}`);
    
    // Get search and filter parameters from URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Ensure tables and RLS policies exist
    try {
      await ensureInventorySupplierTable({
        debug: true,
        requestId
      });
    } catch (tableError) {
      logger.error(`[${requestId}] Error ensuring inventory_supplier table: ${tableError.message}`);
      return NextResponse.json(
        { 
          error: 'Database table initialization failed', 
          message: tableError.message 
        },
        { status: 500 }
      );
    }
    
    // Query suppliers with RLS
    // Add explicit tenant_id check in the query as a secondary security measure
    const query = `
      SELECT * FROM public.inventory_supplier
      WHERE tenant_id = $1
      AND ($2 = '' OR name ILIKE $3 OR contact_person ILIKE $3 OR email ILIKE $3)
      ORDER BY ${sortBy} ${sortDir === 'asc' ? 'ASC' : 'DESC'}
      LIMIT $4 OFFSET $5
    `;
    
    const params = [
      tenantId,
      search,
      `%${search}%`,
      limit,
      offset
    ];
    
    // Execute the query with tenant context for RLS
    let result;
    try {
      result = await db.query(query, params, {
        signal: controller.signal,
        requestId,
        tenantId: tenantId,
        debug: true
      });
    } catch (dbError) {
      logger.error(`[${requestId}] Database error fetching suppliers: ${dbError.message}`);
      
      // Check if this is a tenant context verification error
      const isTenantContextError = dbError.message.includes('Tenant context verification failed') ||
                                   dbError.message.includes('tenant context');
      
      return NextResponse.json(
        { 
          error: isTenantContextError ? 'Database initialization error' : 'Database error', 
          message: isTenantContextError ? 
            'Database is still initializing tenant context. Please try again in a moment.' : 
            dbError.message,
          details: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        },
        { status: 500 }
      );
    }
    
    logger.info(`[${requestId}] Found ${result.rows.length} suppliers for tenant ${tenantId}`);
    
    return NextResponse.json(result.rows);
    
  } catch (error) {
    logger.error(`[${requestId}] Error retrieving suppliers: ${error.message}`, error);
    
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
      message: 'Error retrieving suppliers',
      error: error.message
    }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST handler for /api/inventory/suppliers endpoint
 * Creates a new supplier for the given tenant with RLS
 */
export async function POST(request) {
  const requestId = crypto.randomUUID();

  try {
    // Parse request body
    const requestData = await request.json();
    
    // Extract tenant ID using the utility function with strict validation
    const tenantId = extractTenantId(request);
    
    if (!tenantId) {
      logger.error(`[${requestId}] SECURITY ERROR: No valid tenant ID found in request headers for supplier creation`);
      return NextResponse.json({
        success: false,
        message: 'Authentication required. Valid tenant ID is required for supplier creation.'
      }, { status: 401 });
    }
    
    // Validate tenant ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      logger.error(`[${requestId}] SECURITY ERROR: Invalid tenant ID format during supplier creation: ${tenantId}`);
      return NextResponse.json({ 
        success: false,
        message: 'Invalid tenant ID format'
      }, { status: 403 });
    }
    
    logger.info(`[${requestId}] Creating supplier for tenant: ${tenantId}`);
    
    // Ensure inventory_supplier table exists with RLS
    await ensureInventorySupplierTable({
      debug: true,
      requestId
    });
    
    // Validate required supplier data
    const { name } = requestData;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Supplier name is required'
      }, { status: 400 });
    }
    
    // Generate a UUID for the supplier
    const supplierId = uuidv4();
    
    // Create supplier with transaction to ensure consistency
    const newSupplier = await db.transaction(async (client, options) => {
      // Insert the new supplier using RLS-aware query
      const query = `
        INSERT INTO public.inventory_supplier (
          id, 
          tenant_id, 
          name, 
          contact_person, 
          email,
          phone, 
          address,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const params = [
        supplierId,
        tenantId,
        name,
        requestData.contact_person || '',
        requestData.email || '',
        requestData.phone || '',
        requestData.address || '',
      ];
      
      const result = await db.query(query, params, {
        client,
        tenantId,
        requestId,
        debug: true
      });
      
      return result.rows[0];
    }, { 
      tenantId, 
      requestId,
      debug: true
    });
    
    logger.info(`[${requestId}] Successfully created supplier: ${supplierId}`);
    
    return NextResponse.json(newSupplier, { status: 201 });
    
  } catch (error) {
    logger.error(`[${requestId}] Error creating supplier: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Error creating supplier',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Ensure the inventory_supplier table exists with RLS policies
 * @param {Object} options - Options for the operation
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
async function ensureInventorySupplierTable(options = {}) {
  const debug = options.debug || false;
  const requestId = options.requestId || 'no-req-id';
  
  try {
    if (debug) {
      logger.info(`[${requestId}] Ensuring inventory_supplier table exists`);
    }
    
    // Initialize RLS
    await db.initializeRLS({ debug, requestId });
    
    // Create the inventory_supplier table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS public.inventory_supplier (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
      
      -- Add index on tenant_id for better performance with RLS
      CREATE INDEX IF NOT EXISTS idx_inventory_supplier_tenant_id ON public.inventory_supplier(tenant_id);
      
      -- Enable RLS on the table
      ALTER TABLE public.inventory_supplier ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policy for tenant isolation
      DROP POLICY IF EXISTS inventory_supplier_tenant_isolation ON public.inventory_supplier;
      CREATE POLICY inventory_supplier_tenant_isolation ON public.inventory_supplier
        USING (
          -- Strict tenant isolation with explicit checks
          tenant_id IS NOT NULL AND
          tenant_id <> '' AND
          current_setting('app.current_tenant_id', TRUE) IS NOT NULL AND
          current_setting('app.current_tenant_id', TRUE) <> '' AND
          current_setting('app.current_tenant_id', TRUE) <> 'unset' AND
          tenant_id = current_setting('app.current_tenant_id', TRUE)
        );
    `, [], { 
      skipTenantCheck: true, 
      debug, 
      requestId 
    });
    
    if (debug) {
      logger.info(`[${requestId}] inventory_supplier table verified`);
    }
    
    return true;
  } catch (error) {
    logger.error(`[${requestId}] Error ensuring inventory_supplier table: ${error.message}`);
    throw error;
  }
} 