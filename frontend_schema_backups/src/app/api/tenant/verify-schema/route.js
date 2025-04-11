import { NextResponse } from 'next/server';
import { createServerLogger } from '@/utils/serverLogger';

// Create server logger
const logger = createServerLogger('tenant-verify-schema');

// Pool connection cache
let poolCache = null;
let poolCacheExpiration = 0;
const POOL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Creates or gets a cached database pool for AWS RDS connection
 */
async function getAwsDbPool() {
  const { Pool } = await import('pg');
  
  // Use cache if valid
  const now = Date.now();
  if (poolCache && poolCacheExpiration > now) {
    logger.info('Using cached database pool');
    return poolCache;
  }
  
  // Create new pool
  logger.info('Creating new AWS RDS database pool');
  
  // Configure SSL based on environment
  const sslConfig = process.env.DB_USE_SSL === 'false' ? false : {
    rejectUnauthorized: false
  };
  
  poolCache = new Pool({
    host: process.env.DB_HOST || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'dott_main',
    user: process.env.DB_USER || 'dott_admin',
    password: process.env.DB_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
    ssl: sslConfig,
    // Connection settings
    max: 3,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 5000
  });
  
  // Set expiration
  poolCacheExpiration = now + POOL_CACHE_TTL;
  
  return poolCache;
}

/**
 * Check if a schema exists
 */
async function schemaExists(pool, schemaName) {
  try {
    const result = await pool.query(
      'SELECT EXISTS(-- RLS: No need to check tenant schema existence
    SELECT TRUE -- RLS handles tenant isolation now through policies)',
      [schemaName]
    );
    return result.rows[0].exists;
  } catch (error) {
    logger.error(`Error checking if schema '${schemaName}' exists:`, error);
    return false;
  }
}

/**
 * Check if a table exists in a schema
 */
async function tableExists(pool, schemaName, tableName) {
  try {
    const result = await pool.query(
      'SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)',
      [schemaName, tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    logger.error(`Error checking if table '${tableName}' exists in schema '${schemaName}':`, error);
    return false;
  }
}

/**
 * Create schema if it doesn't exist
 */
async function createSchemaIfNotExists(pool, schemaName) {
  try {
    const exists = await schemaExists(pool, schemaName);
    if (!exists) {
      logger.info(`Creating schema '${schemaName}'`);
      await pool.query(`CREATE SCHEMA "${schemaName}"`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error creating schema '${schemaName}':`, error);
    return false;
  }
}

/**
 * Create system tables in a schema
 */
async function createSystemTables(pool, schemaName) {
  const createdTables = [];
  
  try {
    // Check and create user table
    const userTableName = 'custom_auth_user';
    if (!await tableExists(pool, schemaName, userTableName)) {
      await pool.query(`
        CREATE TABLE "${schemaName}"."${userTableName}" (
          id UUID PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          tenant_id UUID,
          is_active BOOLEAN DEFAULT TRUE
        )
      `);
      createdTables.push(userTableName);
    }
    
    // Check and create product tables
    const productTables = ['product', 'products'];
    for (const tableName of productTables) {
      if (!await tableExists(pool, schemaName, tableName)) {
        await pool.query(`
          CREATE TABLE "${schemaName}"."${tableName}" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price NUMERIC(12,2) DEFAULT 0,
            is_for_sale BOOLEAN DEFAULT TRUE,
            stock_quantity INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            tenant_id UUID
          )
        `);
        createdTables.push(tableName);
      }
    }
    
    return createdTables;
  } catch (error) {
    logger.error(`Error creating system tables in schema '${schemaName}':`, error);
    throw error;
  }
}

/**
 * POST endpoint handler to verify and set up tenant schema
 */
export async function POST(request) {
  const startTime = Date.now();
  let pool = null;
  
  try {
    // Parse request body
    const body = await request.json();
    const { tenantId } = body;
    
    if (!tenantId) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing tenantId parameter'
      }, { status: 400 });
    }
    
    // Format tenant ID for schema name
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    logger.info(`Verifying schema '${schemaName}' for tenant '${tenantId}'`);
    
    // Get database pool
    pool = await getAwsDbPool();
    
    // Check schema existence
    const schemaExistsResult = await schemaExists(pool, schemaName);
    
    // Create schema if it doesn't exist
    let schemaCreated = false;
    if (!schemaExistsResult) {
      schemaCreated = await createSchemaIfNotExists(pool, schemaName);
    }
    
    // Create system tables
    const createdTables = await createSystemTables(pool, schemaName);
    
    // Check the tenant record in public schema
    let tenantRecord = null;
    try {
      const tenantResult = await pool.query(
        'SELECT id, name, rls_enabled FROM custom_auth_tenant WHERE id = $1', /* RLS: Removed schema_name */
        [tenantId]
      );
      
      if (tenantResult.rows.length > 0) {
        tenantRecord = tenantResult.rows[0];
      }
    } catch (error) {
      logger.error(`Error checking tenant record for '${tenantId}':`, error);
    }
    
    // Create tenant record if it doesn't exist
    let tenantCreated = false;
    if (!tenantRecord) {
      try {
        const result = await pool.query(
          `INSERT INTO custom_auth_tenant 
           (id, name, schema_name, created_at, updated_at, rls_enabled)
           VALUES ($1, $2, $3, NOW(), NOW(), true)
           RETURNING id, name, schema_name`,
          [tenantId, `Tenant ${tenantId}`, schemaName]
        );
        
        if (result.rows.length > 0) {
          tenantRecord = result.rows[0];
          tenantCreated = true;
        }
      } catch (error) {
        logger.error(`Error creating tenant record for '${tenantId}':`, error);
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    // Return detailed response
    return NextResponse.json({
      success: true,
      schema: {
        name: schemaName,
        exists: schemaExistsResult,
        created: schemaCreated
      },
      tables: {
        created: createdTables,
        count: createdTables.length
      },
      tenant: {
        id: tenantId,
        record: tenantRecord,
        created: tenantCreated
      },
      timing: {
        durationMs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error verifying tenant schema:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timing: {
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  } finally {
    // Don't close the pooled connection, it's cached
  }
}

/**
 * GET endpoint handler to verify and set up tenant schema
 */
export async function GET(request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId');
  
  if (!tenantId) {
    return NextResponse.json({ 
      success: false,
      error: 'Missing tenantId parameter'
    }, { status: 400 });
  }
  
  // Create a simulated POST request with the tenantId in the body
  const mockRequest = {
    json: async () => ({ tenantId })
  };
  
  // Call the POST handler
  return POST(mockRequest);
}