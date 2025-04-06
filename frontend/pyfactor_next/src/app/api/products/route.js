import { NextResponse } from 'next/server';
import { applyRLS, verifyTenantId, getDefaultTenantId } from '@/middleware/dev-tenant-middleware';
import axios from 'axios';
import { createDbPool } from '../tenant/db-config';

// Create a DB pool for AWS RDS
const createAwsRdsPool = async () => {
  // Only import pg when needed to avoid issues with serverless environments
  const { Pool } = await import('pg');
  
  // Determine SSL configuration
  const useSSL = process.env.AWS_RDS_SSL === 'true';
  const sslConfig = useSSL ? { rejectUnauthorized: false } : false;
  
  // Create a connection pool with AWS RDS parameters
  return new Pool({
    host: process.env.AWS_RDS_HOST,
    port: parseInt(process.env.AWS_RDS_PORT || '5432'),
    database: process.env.AWS_RDS_DATABASE || 'dott_main',
    user: process.env.AWS_RDS_USER,
    password: process.env.AWS_RDS_PASSWORD,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
};

// Define the backend API URL
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000';

// Simple in-memory mock database for development
const mockDb = {
  products: [
    {
      id: '1',
      product_name: 'Standard Shipping Container',
      description: 'Standard 20ft shipping container for general cargo',
      sku: 'CONT-STD-20',
      price: 2500.00,
      unit: 'each',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      product_name: 'Large Shipping Container',
      description: 'Large 40ft shipping container for bulk cargo',
      sku: 'CONT-LRG-40',
      price: 4500.00,
      unit: 'each',
      tenant_id: 'dev-tenant-dashboard-123',
      created_at: new Date().toISOString()
    }
  ]
};

/**
 * GET handler for products with tenant-aware RLS
 */
export async function GET(request) {
  let pool = null;
  let client = null;
  
  try {
    // Get schema from query params
    const url = new URL(request.url);
    const schema = url.searchParams.get('schema') || 'public';
    
    console.log(`[api/products] GET request received with schema: ${schema}`);
    
    // Create database connection
    pool = await createDbPool();
    
    // Get a client with transaction
    client = await pool.connect();
    
    // Create schema if it doesn't exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    
    // Check if products table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1
        AND table_name = 'products'
      )
    `;
    
    const tableExists = await client.query(checkTableQuery, [schema]);
    
    if (!tableExists.rows[0].exists) {
      console.log(`[api/products] Products table doesn't exist in schema ${schema}, creating it`);
      
      // Create products table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${schema}"."products" (
          "id" SERIAL PRIMARY KEY,
          "product_name" VARCHAR(255) NOT NULL,
          "description" TEXT,
          "price" DECIMAL(10, 2) NOT NULL DEFAULT 0,
          "sku" VARCHAR(50),
          "is_for_sale" BOOLEAN DEFAULT true,
          "stock_quantity" INTEGER DEFAULT 0,
          "weight" DECIMAL(10, 2),
          "dimensions" VARCHAR(100),
          "image_url" TEXT,
          "category" VARCHAR(100),
          "tenant_id" VARCHAR(100),
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add RLS policy for multi-tenant security
        ALTER TABLE "${schema}"."products" ENABLE ROW LEVEL SECURITY;
        
        -- Create policy that restricts access to rows based on tenant_id
        DROP POLICY IF EXISTS tenant_isolation_policy ON "${schema}"."products";
        CREATE POLICY tenant_isolation_policy ON "${schema}"."products"
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE));
      `;
      
      await client.query(createTableQuery);
      
      // Return empty array for new table
      console.log(`[api/products] Created new products table in schema ${schema}`);
      return NextResponse.json([]);
    }
    
    // Extract tenant ID from query params or headers
    const tenantId = url.searchParams.get('tenantId') || 
                    request.headers.get('x-tenant-id') || 
                    'default';
    
    // Apply RLS policy by setting tenant ID in session
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    
    // Query to get products
    const query = `
      SELECT * FROM "${schema}"."products"
      ORDER BY "product_name" ASC
    `;
    
    const result = await client.query(query);
    console.log(`[api/products] Successfully retrieved ${result.rows.length} products`);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(`[api/products] Error fetching products:`, error);
    
    // Check if error is about relation not existing
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.log('[api/products] Table does not exist yet. Returning empty array.');
      return NextResponse.json([]);
    }
    
    // Check for connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      console.error('[api/products] Database connection error:', error.message);
      return NextResponse.json([], { status: 200 }); // Return empty array with 200 status
    }
    
    return NextResponse.json(
      { message: error.message, error: error.stack },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
    if (pool) await pool.end().catch(err => console.error('[api/products] Error closing pool:', err));
  }
}

/**
 * POST handler for product creation with tenant-aware RLS
 */
export async function POST(request) {
  let pool = null;
  let client = null;
  
  try {
    // Get schema from query params
    const url = new URL(request.url);
    const schema = url.searchParams.get('schema') || 'public';
    
    // Parse request body
    const body = await request.json();
    
    console.log(`[api/products] POST request received with schema: ${schema}`);
    
    // Create database connection
    pool = await createDbPool();
    
    // Get a client with transaction
    client = await pool.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if schema exists, if not create it
    try {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      
      // Check if products table exists
      const checkTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1
          AND table_name = 'products'
        )
      `;
      
      const tableExists = await client.query(checkTableQuery, [schema]);
      
      if (!tableExists.rows[0].exists) {
        console.log(`[api/products] Products table doesn't exist in schema ${schema}, creating it`);
        
        // Create products table
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS "${schema}"."products" (
            "id" SERIAL PRIMARY KEY,
            "product_name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "price" DECIMAL(10, 2) NOT NULL DEFAULT 0,
            "sku" VARCHAR(50),
            "is_for_sale" BOOLEAN DEFAULT true,
            "stock_quantity" INTEGER DEFAULT 0,
            "weight" DECIMAL(10, 2),
            "dimensions" VARCHAR(100),
            "image_url" TEXT,
            "category" VARCHAR(100),
            "tenant_id" VARCHAR(100),
            "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Add RLS policy for multi-tenant security
          ALTER TABLE "${schema}"."products" ENABLE ROW LEVEL SECURITY;
          
          -- Create policy that restricts access to rows based on tenant_id
          DROP POLICY IF EXISTS tenant_isolation_policy ON "${schema}"."products";
          CREATE POLICY tenant_isolation_policy ON "${schema}"."products"
            USING (tenant_id = current_setting('app.current_tenant_id', TRUE));
        `;
        
        await client.query(createTableQuery);
      }
    } catch (error) {
      console.error(`[api/products] Error creating products table:`, error);
      throw error;
    }
    
    // Map fields if necessary
    const productData = {
      product_name: body.name || body.product_name,
      description: body.description,
      price: body.price,
      sku: body.product_code || body.sku,
      is_for_sale: body.for_sale || body.is_for_sale || true,
      stock_quantity: body.stock_quantity || 0,
      tenant_id: body.tenant_id
    };
    
    console.log(`[api/products] Creating product: ${JSON.stringify(productData)}`);
    
    // Query to create product
    const query = `
      -- Set RLS policy
      SET LOCAL app.current_tenant_id = '${productData.tenant_id}';
      
      INSERT INTO "${schema}"."products" (
        "product_name", "description", "price", "sku", 
        "is_for_sale", "stock_quantity", "tenant_id"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      productData.product_name,
      productData.description,
      productData.price,
      productData.sku,
      productData.is_for_sale,
      productData.stock_quantity,
      productData.tenant_id
    ];
    
    const result = await client.query(query, values);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log(`[api/products] Successfully created product with ID: ${result.rows[0].id}`);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    // Rollback the transaction if it was started
    if (client) {
      await client.query('ROLLBACK').catch(err => {
        console.error('[api/products] Error rolling back transaction:', err);
      });
    }
    
    console.error(`[api/products] Error creating product:`, error);
    
    // Check if error is about relation not existing
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      try {
        // Create schema directly if possible
        if (client) {
          const schema = url.searchParams.get('schema') || 
                        `tenant_${(body?.tenant_id || 'default').replace(/-/g, '_')}`;
          
          console.log(`[api/products] Directly initializing schema: ${schema}`);
          
          // Create schema
          await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
          
          // Create products table
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS "${schema}"."products" (
              "id" SERIAL PRIMARY KEY,
              "product_name" VARCHAR(255) NOT NULL,
              "description" TEXT,
              "price" DECIMAL(10, 2) NOT NULL DEFAULT 0,
              "sku" VARCHAR(50),
              "is_for_sale" BOOLEAN DEFAULT true,
              "stock_quantity" INTEGER DEFAULT 0,
              "weight" DECIMAL(10, 2),
              "dimensions" VARCHAR(100),
              "image_url" TEXT,
              "category" VARCHAR(100),
              "tenant_id" VARCHAR(100),
              "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `;
          
          await client.query(createTableQuery);
          
          return NextResponse.json({
            message: 'Schema initialized, please try creating the product again',
            schemaCreated: true
          }, { status: 202 });
        }
      } catch (initError) {
        console.error(`[api/products] Error initializing schema:`, initError);
      }
      
      return NextResponse.json(
        { message: 'Products table does not exist. Schema initialization failed. Please try again.' },
        { status: 500 }
      );
    }
    
    // Check for connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return NextResponse.json(
        { 
          message: 'Database connection failed. The server might be temporarily unavailable. Please try again later.',
          error: error.message,
          temporary: true
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { message: error.message, error: error.stack },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
    if (pool) await pool.end().catch(err => console.error('[api/products] Error closing pool:', err));
  }
} 