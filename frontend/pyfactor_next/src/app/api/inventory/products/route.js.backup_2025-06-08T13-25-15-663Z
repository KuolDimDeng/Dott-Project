'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
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
 * GET handler for product listing with tenant-aware RLS
 */
export async function GET(request) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    logger.info(`[${requestId}] GET /api/inventory/products - Start processing request`);
    
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
    
    logger.info(`[${requestId}] Fetching products for tenant ${tenantId}`);
    
    // Get search and filter parameters from URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Ensure tables and RLS policies exist
    try {
      await db.ensureInventoryProductTable({
        debug: true,
        requestId
      });
    } catch (tableError) {
      logger.error(`[${requestId}] Error ensuring inventory_product table: ${tableError.message}`);
      return NextResponse.json(
        { 
          error: 'Database table initialization failed', 
          message: tableError.message 
        },
        { status: 500 }
      );
    }
    
    // Query products with RLS
    // Add explicit tenant_id check in the query as a secondary security measure
    const query = `
      SELECT * FROM public.inventory_product
      WHERE tenant_id = $1
      AND ($2 = '' OR name ILIKE $3 OR description ILIKE $3)
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
      logger.error(`[${requestId}] Database error fetching products: ${dbError.message}`);
      
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
    
    logger.info(`[${requestId}] Found ${result.rows.length} products for tenant ${tenantId}`);
    
    return NextResponse.json({
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit,
        offset,
        tenant: tenantId.substring(0, 8) + '...' // Include partial tenant ID for debugging
      }
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error retrieving products: ${error.message}`, error);
    
    // If this is an abort error from the timeout
    if (error.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        message: 'Request timed out',
        error: 'Database request timed out after 15 seconds'
      }, { status: 504 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Error retrieving products',
      error: error.message
    }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST handler for creating a new product with tenant-aware RLS
 */
export async function POST(request) {
  const requestId = crypto.randomUUID();

  try {
    // Parse request body
    const requestData = await request.json();
    
    // Extract tenant ID using the utility function with strict validation
    const tenantId = extractTenantId(request);
    
    if (!tenantId) {
      logger.error(`[${requestId}] SECURITY ERROR: No valid tenant ID found in request headers for product creation`);
      return NextResponse.json({
        success: false,
        message: 'Authentication required. Valid tenant ID is required for product creation.'
      }, { status: 401 });
    }
    
    // Validate tenant ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      logger.error(`[${requestId}] SECURITY ERROR: Invalid tenant ID format during product creation: ${tenantId}`);
      return NextResponse.json({ 
        success: false,
        message: 'Invalid tenant ID format'
      }, { status: 403 });
    }
    
    logger.info(`[${requestId}] Creating product for tenant: ${tenantId}`);
    
    // Ensure inventory_product table exists with RLS
    await db.ensureInventoryProductTable({
      debug: true,
      requestId
    });
    
    // Validate required product data
    const { name } = requestData;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Product name is required'
      }, { status: 400 });
    }
    
    // Generate a UUID for the product
    const productId = uuidv4();
    
    // Validate and process supplier_id if provided
    let supplierId = null;
    if (requestData.supplier_id) {
      // Check if supplier_id is a valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestData.supplier_id);
      
      if (isValidUUID) {
        supplierId = requestData.supplier_id;
      } else {
        logger.warn(`[${requestId}] Invalid supplier_id format: ${requestData.supplier_id}, converting to null`);
      }
    }
    
    // Create product with transaction to ensure consistency
    const newProduct = await db.transaction(async (client, options) => {
      // Insert the new product using RLS-aware query
      const query = `
        INSERT INTO public.inventory_product (
          id, 
          tenant_id, 
          name, 
          description, 
          sku,
          price, 
          cost,
          stock_quantity, 
          reorder_level, 
          for_sale, 
          for_rent,
          supplier_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const params = [
        productId,
        tenantId,
        name,
        requestData.description || '',
        requestData.sku || `SKU-${Date.now()}`,
        parseFloat(requestData.price) || 0,
        parseFloat(requestData.cost) || 0,
        parseInt(requestData.stock_quantity || requestData.stockQuantity) || 0,
        parseInt(requestData.reorder_level || requestData.reorderLevel) || 0,
        requestData.for_sale === true || requestData.forSale === true,
        requestData.for_rent === true || requestData.forRent === true,
        supplierId // Use the validated supplier_id
      ];
      
      logger.info(`[${requestId}] Executing product insert with tenant context: ${tenantId}`);
      
      // Verify tenant ID one more time before executing the query
      if (options.tenantId !== tenantId) {
        throw new Error(`Tenant ID mismatch during insert. Expected ${tenantId}, got ${options.tenantId || 'undefined'}`);
      }
      
      const result = await db.query(query, params, {
        ...options,
        client,
        requestId,
        tenantId // Pass tenant ID for RLS context
      });
      
      return result.rows[0];
    }, {
      requestId,
      tenantId,
      debug: true
    });
    
    logger.info(`[${requestId}] Product created successfully: ${newProduct.id}`);
    
    return NextResponse.json({
      success: true,
      product: newProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    logger.error(`[${requestId}] Error creating product: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Error creating product',
      error: error.message
    }, { status: 500 });
  }
}
