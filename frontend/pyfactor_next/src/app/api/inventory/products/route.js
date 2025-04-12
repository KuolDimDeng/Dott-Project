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
    
    // Extract tenant info from various sources
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request, headers:`, {
        'x-tenant-id': request.headers.get('x-tenant-id'),
        'x-business-id': request.headers.get('x-business-id'),
        referer: request.headers.get('referer'),
        cookie: request.headers.get('cookie')?.substring(0, 50) + '...' // Log partial cookie for debugging
      });
      
      return NextResponse.json(
        { 
          error: 'Tenant ID is required',
          message: 'No tenant ID found in request headers, cookies, or JWT',
          sources: tenantInfo
        },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Fetching products for tenant ${finalTenantId}`);
    
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
    // Note: No need to filter by tenant_id in the query - RLS will handle that
    const query = `
      SELECT * FROM public.inventory_product
      WHERE ($1 = '' OR name ILIKE $2 OR description ILIKE $2)
      ORDER BY ${sortBy} ${sortDir === 'asc' ? 'ASC' : 'DESC'}
      LIMIT $3 OFFSET $4
    `;
    
    const params = [
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
        tenantId: finalTenantId,
        debug: true
      });
    } catch (dbError) {
      logger.error(`[${requestId}] Database error fetching products: ${dbError.message}`);
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: dbError.message,
          details: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        },
        { status: 500 }
      );
    }
    
    logger.info(`[${requestId}] Found ${result.rows.length} products for tenant ${finalTenantId}`);
    
    return NextResponse.json({
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit,
        offset,
        tenant: finalTenantId.substring(0, 8) + '...' // Include partial tenant ID for debugging
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
    
    // Extract tenant info from various sources
    const tenantId = requestData.tenant_id || 
                    requestData.tenantId || 
                    request.headers.get('x-tenant-id') ||
                    request.headers.get('tenant-id') ||
                    request.headers.get('x-business-id');
    
    if (!tenantId) {
      logger.error(`[${requestId}] No tenant ID found in request headers or body`);
      return NextResponse.json({
        success: false,
        message: 'Tenant ID is required'
      }, { status: 400 });
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
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      requestData.for_rent === true || requestData.forRent === true
    ];
    
    logger.info(`[${requestId}] Executing product insert with tenant context: ${tenantId}`);
    
    const result = await db.query(query, params, {
      requestId,
      tenantId, // Pass tenant ID for RLS context
      debug: true
    });
    
    const newProduct = result.rows[0];
    
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
