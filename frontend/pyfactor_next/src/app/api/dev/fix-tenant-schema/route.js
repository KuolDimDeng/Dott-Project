/**
 * API endpoint to fix tenant schema issues in local development
 */
import { NextResponse } from 'next/server';

// Create a simple db pool for this route
const createLocalDbPool = async () => {
  // Only import pg when needed to avoid issues with serverless environments
  const { Pool } = await import('pg');
  
  // Create a connection pool with local database parameters
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'pyfactor',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

/**
 * GET handler to fix tenant schema issues
 */
export async function GET(request) {
  let pool = null;
  
  try {
    // Extract tenant ID from query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    
    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required tenant_id parameter'
      }, { status: 400 });
    }
    
    console.log(`[Fix Tenant Schema] Attempting to fix schema for tenant: ${tenantId}`);
    
    // Generate schema name from tenant ID
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Connect to the database
    pool = await createLocalDbPool();
    
    // Step 1: Ensure the public tenant table exists
    const publicTableExists = await checkTableExists(pool, 'public', 'custom_auth_tenant');
    
    if (!publicTableExists) {
      await createPublicTenantTable(pool);
      console.log('[Fix Tenant Schema] Created public.custom_auth_tenant table');
    }
    
    // Step 2: Check if this tenant exists in the public table
    const tenantExists = await checkTenantExists(pool, tenantId);
    
    if (!tenantExists) {
      // Create a tenant record in the public table
      await createTenantRecord(pool, tenantId, schemaName);
      console.log(`[Fix Tenant Schema] Created tenant record for ${tenantId}`);
    }
    
    // Step 3: Ensure the schema exists
    await ensureSchemaExists(pool, schemaName);
    console.log(`[Fix Tenant Schema] Ensured schema ${schemaName} exists`);
    
    // Step 4: Create required tables in the tenant schema
    const tablesCreated = await createTenantTables(pool, schemaName);
    console.log(`[Fix Tenant Schema] Created tables in schema ${schemaName}`);
    
    // Step 5: Create the products table if it doesn't exist
    await createProductsTable(pool, schemaName);
    console.log(`[Fix Tenant Schema] Created products table in schema ${schemaName}`);
    
    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      /* RLS: tenant_id instead of schema_name */
    tenant_id: tenant.id,
      tables_created: tablesCreated,
      message: `Successfully fixed schema for tenant: ${tenantId}`
    });
    
  } catch (error) {
    console.error('[Fix Tenant Schema] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    // Close the pool
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Check if a table exists in a schema
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
 * Check if a tenant exists in the public table
 */
async function checkTenantExists(pool, tenantId) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM public.custom_auth_tenant 
      WHERE id = $1
    );
  `, [tenantId]);
  
  return result.rows[0].exists;
}

/**
 * Create the public tenant table
 */
async function createPublicTenantTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
      id UUID PRIMARY KEY,
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
 * Create a tenant record in the public table
 */
async function createTenantRecord(pool, tenantId, schemaName) {
  await pool.query(`
    INSERT INTO public.custom_auth_tenant (
      id, name, schema_name, created_at, updated_at, rls_enabled, is_active
    ) VALUES (
      $1, $2, $3, NOW(), NOW(), TRUE, TRUE
    ) ON CONFLICT (id) DO NOTHING;
  `, [tenantId, `Tenant ${tenantId.substring(0, 8)}`, schemaName]);
}

/**
 * Ensure the schema exists
 */
async function ensureSchemaExists(pool, schemaName) {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
}

/**
 * Create required tables in the tenant schema
 */
async function createTenantTables(pool, schemaName) {
  // Create the tables in the tenant schema
  await pool.query(`
    -- Create auth tables
    CREATE TABLE IF NOT EXISTS "${schemaName}"."custom_auth_user" (
      id UUID PRIMARY KEY,
      password VARCHAR(128) NOT NULL,
      last_login TIMESTAMP WITH TIME ZONE NULL,
      is_superuser BOOLEAN NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      first_name VARCHAR(100) NOT NULL DEFAULT '',
      last_name VARCHAR(100) NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_staff BOOLEAN NOT NULL DEFAULT FALSE,
      date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      confirmation_token UUID NOT NULL DEFAULT gen_random_uuid(),
      is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
      stripe_customer_id VARCHAR(255) NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'OWNER',
      occupation VARCHAR(50) NOT NULL DEFAULT 'OWNER',
      tenant_id UUID NULL,
      cognito_sub VARCHAR(36) NULL
    );
    
    CREATE INDEX IF NOT EXISTS custom_auth_user_email_key ON "${schemaName}"."custom_auth_user" (email);
    CREATE INDEX IF NOT EXISTS idx_user_tenant ON "${schemaName}"."custom_auth_user" (tenant_id);
    
    -- Auth User Permissions
    CREATE TABLE IF NOT EXISTS "${schemaName}"."custom_auth_user_user_permissions" (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      permission_id INTEGER NOT NULL,
      CONSTRAINT custom_auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
    );
    
    -- Auth User Groups
    CREATE TABLE IF NOT EXISTS "${schemaName}"."custom_auth_user_groups" (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      group_id INTEGER NOT NULL,
      CONSTRAINT custom_auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
    );
    
    -- Tenant table
    CREATE TABLE IF NOT EXISTS "${schemaName}"."custom_auth_tenant" (
      id UUID PRIMARY KEY,
      /* RLS: schema_name deprecated */
    /* RLS: schema_name deprecated, will be removed */
      schema_name VARCHAR(63) NULL /* deprecated */NULL -- Kept for backward compatibility, will be removed,
      name VARCHAR(100) NOT NULL,
      created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      setup_status VARCHAR(20) NOT NULL DEFAULT 'complete',
      setup_task_id VARCHAR(255) NULL,
      last_setup_attempt TIMESTAMP WITH TIME ZONE NULL,
      setup_error_message TEXT NULL,
      last_health_check TIMESTAMP WITH TIME ZONE NULL,
      storage_quota_bytes BIGINT NOT NULL DEFAULT 2147483648,
      owner_id UUID NULL
    );
  `);
  
  return ['custom_auth_user', 'custom_auth_user_user_permissions', 'custom_auth_user_groups', 'custom_auth_tenant'];
}

/**
 * Create the products table in the tenant schema
 */
async function createProductsTable(pool, schemaName) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"."products" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_name VARCHAR(255) NOT NULL,
      description TEXT,
      sku VARCHAR(50),
      price DECIMAL(10, 2),
      unit VARCHAR(50),
      tenant_id UUID NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_products_tenant ON "${schemaName}"."products" (tenant_id);
  `);
  
  return ['products'];
} 