/**
 * API endpoint to create missing tables in AWS RDS with improved performance
 * This includes caching and parallel execution to reduce dashboard loading time
 */
import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';

// Use the standard logger instead of creating a custom one
// Constant to identify this component in logs
const LOG_PREFIX = '[aws-tables]';

// Cache successful setup results to avoid redundant operations
const setupCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache time

// Create a DB pool for AWS RDS
const createAwsRdsPool = async () => {
  // Only import pg when needed to avoid issues with serverless environments
  const { Pool } = await import('pg');
  
  // Determine SSL configuration
  const useSSL = process.env.AWS_RDS_SSL !== 'false';
  const sslConfig = useSSL ? { rejectUnauthorized: false } : false;
  
  // Create a connection pool with optimized parameters for quick setup
  return new Pool({
    host: process.env.AWS_RDS_HOST || process.env.DB_HOST || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    port: parseInt(process.env.AWS_RDS_PORT || process.env.DB_PORT || '5432'),
    database: process.env.AWS_RDS_DATABASE || process.env.DB_NAME || 'dott_main',
    user: process.env.AWS_RDS_USER || process.env.DB_USER || 'dott_admin',
    password: process.env.AWS_RDS_PASSWORD || process.env.DB_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
    ssl: sslConfig,
    max: 5, // Reduced for serverless environment
    idleTimeoutMillis: 10000, // Reduced to 10 seconds
    connectionTimeoutMillis: 5000, // Reduced to 5 seconds
  });
};

/**
 * GET handler to create missing tables in AWS RDS
 * Optimized for performance with caching and parallel operations
 */
export async function GET(request) {
  // Extract tenant ID from request for cache key
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId');
  const cacheKey = tenantId || 'global';
  
  // Check cache first to avoid redundant operations
  if (setupCache.has(cacheKey)) {
    const cached = setupCache.get(cacheKey);
    if (cached.timestamp > Date.now() - CACHE_TTL) {
      logger.info(`${LOG_PREFIX} Using cached setup result for tenant: ${cacheKey}`);
      return NextResponse.json(cached.result);
    } else {
      // Cache expired, remove it
      setupCache.delete(cacheKey);
    }
  }
  
  let pool = null;
  const startTime = Date.now();
  
  try {
    logger.info(`${LOG_PREFIX} Starting table creation for tenant: ${tenantId || 'all'}`);
    
    // Connect to the AWS RDS database
    pool = await createAwsRdsPool();
    
    // Arrays to track results
    const createdTables = [];
    const existingTables = [];
    const errors = [];
    
    // Step 1: Ensure the public tenant table exists (critical)
    const publicTableExists = await checkTableExists(pool, 'public', 'custom_auth_tenant');
    
    if (!publicTableExists) {
      await createPublicTenantTable(pool);
      createdTables.push('public.custom_auth_tenant');
      logger.info(`${LOG_PREFIX} Created public.custom_auth_tenant table`);
    } else {
      existingTables.push('public.custom_auth_tenant');
      logger.info(`${LOG_PREFIX} public.custom_auth_tenant table already exists`);
    }
    
    // If a specific tenant ID was provided, focus only on that tenant's schema
    if (tenantId) {
      const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Create schema if it doesn't exist
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      
      // Check and create essential tables for this tenant
      const essentialTables = ['product', 'products', 'custom_auth_user'];
      
      // Execute table creation in parallel for faster processing
      await Promise.all(essentialTables.map(async (table) => {
        try {
          const exists = await checkTableExists(pool, schema, table);
          if (!exists) {
            if (table === 'product' || table === 'products') {
              await createProductTable(pool, schema, table);
              createdTables.push(`${schema}.${table}`);
            } else if (table === 'custom_auth_user') {
              await createUserTable(pool, schema);
              createdTables.push(`${schema}.${table}`);
            }
          } else {
            existingTables.push(`${schema}.${table}`);
          }
        } catch (err) {
          errors.push({ table: `${schema}.${table}`, error: err.message });
          logger.error(`${LOG_PREFIX} Error creating table ${schema}.${table}:`, err.message);
        }
      }));
    } else {
      // Handle global setup (all tenants) - only do this if no specific tenant
      // Get existing tenant schemas
      const schemas = await getTenantSchemas(pool);
      logger.info(`${LOG_PREFIX} Found ${schemas.length} tenant schemas`);
      
      // Only process a reasonable number of schemas at once to avoid overwhelming the server
      const BATCH_SIZE = 5; 
      const schemaGroups = [];
      
      // Divide schemas into batches
      for (let i = 0; i < schemas.length; i += BATCH_SIZE) {
        schemaGroups.push(schemas.slice(i, i + BATCH_SIZE));
      }
      
      // Process each batch sequentially, but tables within a batch in parallel
      for (const schemaGroup of schemaGroups) {
        await Promise.all(schemaGroup.map(async (schema) => {
          try {
            // Ensure essential tables exist in this schema
            const tableChecks = ['product', 'products', 'custom_auth_user'].map(async (table) => {
              const exists = await checkTableExists(pool, schema, table);
              if (!exists) {
                if (table === 'product' || table === 'products') {
                  await createProductTable(pool, schema, table);
                  createdTables.push(`${schema}.${table}`);
                } else if (table === 'custom_auth_user') {
                  await createUserTable(pool, schema);
                  createdTables.push(`${schema}.${table}`);
                }
              } else {
                existingTables.push(`${schema}.${table}`);
              }
            });
            
            await Promise.all(tableChecks);
          } catch (err) {
            errors.push({ schema, error: err.message });
            logger.error(`${LOG_PREFIX} Error processing schema ${schema}:`, err.message);
          }
        }));
      }
    }
    
    // Prepare the result
    const result = {
      success: true,
      timing: {
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString()
      },
      summary: {
        createdTables: createdTables.length,
        existingTables: existingTables.length,
        errors: errors.length
      },
      details: {
        createdTables,
        existingTables: existingTables.length > 100 ? `${existingTables.length} tables (list truncated)` : existingTables,
        errors
      }
    };
    
    // Store in cache
    setupCache.set(cacheKey, {
      timestamp: Date.now(),
      result
    });
    
    logger.info(`${LOG_PREFIX} Table creation complete in ${result.timing.durationMs}ms`);
    return NextResponse.json(result);
  } catch (error) {
    logger.error(`${LOG_PREFIX} Error in AWS RDS setup:`, error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      timing: {
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString()
      }
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Check if a table exists in the database
 */
async function checkTableExists(pool, schema, table) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_name = $2
    );
  `, [schema, table]);
  
  return result.rows[0].exists;
}

/**
 * Get a list of tenant schemas
 */
async function getTenantSchemas(pool) {
  const result = await pool.query(`
    -- RLS: Get tenant IDs directly instead of looking up schemas
    SELECT id, name FROM custom_auth_tenant WHERE rls_enabled = TRUE
  `);
  
  return result.rows.map(row => row.schema_name);
}

/**
 * Create the public tenant table
 */
async function createPublicTenantTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      owner_id VARCHAR(255),
      /* RLS: schema_name deprecated */
    /* RLS: schema_name deprecated, will be removed */
      schema_name VARCHAR(255) NULL /* deprecated */NULL -- Kept for backward compatibility, will be removed,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      rls_enabled BOOLEAN DEFAULT TRUE,
      rls_setup_date TIMESTAMP WITH TIME ZONE NULL,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);
}

/**
 * Create the product table in a tenant schema
 */
async function createProductTable(pool, schema, tableName) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}"."${tableName}" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(12,2) DEFAULT 0,
      is_for_sale BOOLEAN DEFAULT TRUE,
      is_for_rent BOOLEAN DEFAULT FALSE,
      stock_quantity INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      tenant_id UUID
    );
  `);
}

/**
 * Create the user table in a tenant schema
 */
async function createUserTable(pool, schema) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schema}"."custom_auth_user" (
      id UUID PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      tenant_id UUID,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);
}