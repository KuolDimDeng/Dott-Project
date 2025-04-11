'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { extractTenantId } from '@/utils/auth/tenant';
import * as db from '@/utils/db/rls-database';
import { logger } from '@/utils/logger';

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
  let pool = null;
  let client = null;

  try {
    // Parse request body
    const requestData = await request.json();
    
    // Extract tenant info
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId') || 
                    requestData.tenantId || 
                    request.headers.get('x-tenant-id');
    
    let schemaName = url.searchParams.get('schema') || requestData.schema || 'public';
    
    // If schema name looks like a UUID or doesn't include tenant_ prefix, transform it
    if (schemaName === 'default_schema' || (tenantId && !schemaName.startsWith('tenant_'))) {
      // Use tenant ID to create schema name
      schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    }
    
    console.log(`[${requestId}] Creating product in schema: ${schemaName}`);

    // Connect to database
    pool = await createDbPool();
    client = await pool.connect();
    
    // Check if products table exists, if not create it
    const tableExists = await checkTableExists(client, schemaName, 'products');
    if (!tableExists) {
      await createProductsTable(client, schemaName);
    }

    // Validate product data
    const { name, description, price, stockQuantity, reorderLevel, forSale } = requestData;
    
    if (!name) {
      return NextResponse.json({
        success: false,
        message: 'Product name is required'
      }, { status: 400 });
    }
    
    // Insert the new product
    const result = await client.query(
      `INSERT INTO "${schemaName}".products
       (name, description, price, stock_quantity, reorder_level, for_sale, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        name,
        description || '',
        parseFloat(price) || 0,
        parseInt(stockQuantity) || 0,
        parseInt(reorderLevel) || 0,
        forSale === 'on' || forSale === true
      ]
    );
    
    const newProduct = result.rows[0];
    
    console.log(`[${requestId}] Product created successfully: ${newProduct.id}`);
    
    return NextResponse.json({
      success: true,
      product: formatProduct(newProduct),
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error(`[${requestId}] Error creating product: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Error creating product',
      error: error.message
    }, { status: 500 });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (err) {
        console.error(`[${requestId}] Error releasing client: ${err.message}`);
      }
    }
    
    if (pool) {
      try {
        await pool.end();
      } catch (err) {
        console.error(`[${requestId}] Error closing pool: ${err.message}`);
      }
    }
  }
}

// Helper to check if a table exists
async function checkTableExists(client, schemaName, tableName) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = $2
    );
  `, [schemaName, tableName]);
  
  return result.rows[0].exists;
}

// Helper to create products table
async function createProductsTable(client, schemaName) {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS "${schemaName}";
    
    CREATE TABLE IF NOT EXISTS "${schemaName}".products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 0,
      for_sale BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
  
  // Create sample products
  await client.query(`
    INSERT INTO "${schemaName}".products
    (name, description, price, stock_quantity, reorder_level, for_sale, created_at, updated_at)
    VALUES
    ('Sample Product 1', 'This is a sample product', 19.99, 100, 10, true, NOW(), NOW()),
    ('Sample Product 2', 'Another sample product', 29.99, 50, 5, true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  `);
}

// Helper to format product data
function formatProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: parseFloat(product.price),
    stockQuantity: product.stock_quantity,
    reorderLevel: product.reorder_level,
    forSale: product.for_sale,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}
