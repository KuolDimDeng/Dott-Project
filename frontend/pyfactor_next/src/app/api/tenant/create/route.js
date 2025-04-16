import { NextResponse } from 'next/server';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { logger } from '@/utils/logger';
import { getAuth } from '@/lib/auth';
import { isValidUUID } from '@/utils/tenantUtils';
import { Pool } from 'pg';

// Namespace for tenant IDs (consistent with other parts of the application)
const TENANT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Create a tenant record in the database
 * This endpoint handles tenant creation for the onboarding flow
 * 
 * It ensures proper RLS policy application for AWS RDS and
 * avoids using cookies or localStorage for tenant ID storage
 */
export async function POST(request) {
  const requestId = Date.now().toString(36);
  let connection = null;
  
  try {
    logger.debug(`[TenantCreate:${requestId}] Received tenant creation request`);
    
    // Get auth context for the current user
    const auth = await getAuth();
    if (!auth?.user?.sub) {
      logger.error(`[TenantCreate:${requestId}] No authenticated user found`);
      return NextResponse.json({
        success: false,
        error: 'unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Get or generate tenant ID
    let tenantId = body.tenantId || null;
    const userId = body.userId || auth.user.sub;
    
    // If no tenant ID provided, generate a deterministic one from userId
    if (!tenantId && userId) {
      try {
        tenantId = uuidv5(userId, TENANT_NAMESPACE);
        logger.info(`[TenantCreate:${requestId}] Generated deterministic tenant ID: ${tenantId}`);
      } catch (uuidError) {
        logger.error(`[TenantCreate:${requestId}] Error generating UUID:`, uuidError);
        tenantId = uuidv4(); // Fallback to random UUID
      }
    }
    
    // Validate tenant ID format
    if (!tenantId || !isValidUUID(tenantId)) {
      logger.error(`[TenantCreate:${requestId}] Invalid tenant ID format: ${tenantId}`);
      return NextResponse.json({
        success: false,
        error: 'invalid_tenant_id',
        message: 'Invalid tenant ID format'
      }, { status: 400 });
    }
    
    // Extract business info from request body
    const businessName = body.businessName || 'My Business';
    const businessType = body.businessType || 'Other';
    const country = body.country || 'US';
    
    // Connect to the database
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      logger.error(`[TenantCreate:${requestId}] No database connection string found`);
      return NextResponse.json({
        success: false,
        error: 'configuration_error',
        message: 'Database configuration missing'
      }, { status: 500 });
    }
    
    // Create a database connection
    const pool = new Pool({ connectionString });
    connection = await pool.connect();
    
    // Start a transaction
    await connection.query('BEGIN');
    
    try {
      // First check if the tenant already exists
      const checkResult = await connection.query(
        'SELECT id, schema_name, rls_enabled FROM custom_auth_tenant WHERE id = $1',
        [tenantId]
      );
      
      let schemaName = '';
      let isNewTenant = false;
      
      if (checkResult.rows.length > 0) {
        // Tenant already exists, use the existing schema name
        schemaName = checkResult.rows[0].schema_name;
        const rlsEnabled = checkResult.rows[0].rls_enabled;
        
        logger.info(`[TenantCreate:${requestId}] Tenant already exists: ${tenantId}, schema: ${schemaName}, RLS: ${rlsEnabled}`);
        
        // If RLS is not enabled, enable it now
        if (!rlsEnabled) {
          logger.info(`[TenantCreate:${requestId}] Enabling RLS for existing tenant`);
          
          // Update tenant record to mark RLS as enabled
          await connection.query(
            'UPDATE custom_auth_tenant SET rls_enabled = true, updated_at = NOW() WHERE id = $1',
            [tenantId]
          );
          
          // Enable RLS on all tables in the schema
          await enableRlsOnSchema(connection, schemaName);
        }
      } else {
        // Create a new tenant record
        isNewTenant = true;
        
        // Format schema name from tenant ID
        schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        
        logger.info(`[TenantCreate:${requestId}] Creating new tenant: ${tenantId}, schema: ${schemaName}`);
        
        // Insert the tenant record
        await connection.query(
          `INSERT INTO custom_auth_tenant 
           (id, name, owner_id, schema_name, created_at, updated_at, rls_enabled, is_active) 
           VALUES ($1, $2, $3, $4, NOW(), NOW(), true, true)`,
          [tenantId, businessName, userId, schemaName]
        );
        
        // Create the schema for the tenant
        await connection.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
        
        // Enable RLS on all tables in the schema
        await enableRlsOnSchema(connection, schemaName);
        
        // Create the tenant_users association
        await connection.query(
          `INSERT INTO tenant_users (tenant_id, user_id, created_at, updated_at, role) 
           VALUES ($1, $2, NOW(), NOW(), 'owner')
           ON CONFLICT (tenant_id, user_id) DO NOTHING`,
          [tenantId, userId]
        );
        
        // Create RLS policies for this tenant
        await createRlsPolicies(connection, schemaName, tenantId);
      }
      
      // Ensure the user has access to the tenant
      await ensureUserTenantAccess(connection, tenantId, userId);
      
      // Commit the transaction
      await connection.query('COMMIT');
      
      // Return success response - don't include any cookies, only return the data
      return NextResponse.json({
        success: true,
        tenantId,
        schemaName,
        isNew: isNewTenant,
        message: isNewTenant ? 'Tenant created successfully' : 'Existing tenant found'
      });
    } catch (dbError) {
      // Rollback the transaction on error
      await connection.query('ROLLBACK');
      
      logger.error(`[TenantCreate:${requestId}] Database error:`, dbError);
      
      return NextResponse.json({
        success: false,
        error: 'database_error',
        message: 'Error creating tenant record in database',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      }, { status: 500 });
    }
  } catch (error) {
    logger.error(`[TenantCreate:${requestId}] Unexpected error:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'internal_error',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  } finally {
    // Release the database connection
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        logger.error(`[TenantCreate:${requestId}] Error releasing connection:`, releaseError);
      }
    }
  }
}

/**
 * Enable RLS on all tables in the given schema
 * @param {Object} connection - Database connection
 * @param {string} schemaName - Schema name
 */
async function enableRlsOnSchema(connection, schemaName) {
  await connection.query(
    `DO $$
     DECLARE
       tbl text;
     BEGIN
       FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = $1
       LOOP
         EXECUTE 'ALTER TABLE ' || quote_ident($1) || '.' || quote_ident(tbl) || ' ENABLE ROW LEVEL SECURITY';
       END LOOP;
     END $$;`,
    [schemaName]
  );
}

/**
 * Create RLS policies for tenant isolation
 * @param {Object} connection - Database connection
 * @param {string} schemaName - Schema name
 * @param {string} tenantId - Tenant ID
 */
async function createRlsPolicies(connection, schemaName, tenantId) {
  // Get all tables in the schema
  const tablesResult = await connection.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1`,
    [schemaName]
  );
  
  // For each table, create a tenant isolation policy
  for (const tableRow of tablesResult.rows) {
    const tableName = tableRow.tablename;
    const policyName = `tenant_isolation_${tableName}`;
    
    // Create policy using CURRENT_SETTING to get tenant ID from session
    // This assumes you're setting the RLS tenant context in middleware
    await connection.query(
      `DO $$
       BEGIN
         -- Drop policy if it exists
         BEGIN
           EXECUTE 'DROP POLICY IF EXISTS ${policyName} ON ' || quote_ident($1) || '.' || quote_ident($2);
         EXCEPTION WHEN undefined_object THEN
           -- Policy doesn't exist, continue
         END;
         
         -- Create the policy for the tenant
         EXECUTE 'CREATE POLICY ${policyName} ON ' || 
                 quote_ident($1) || '.' || quote_ident($2) || 
                 ' USING (tenant_id = ' || quote_literal($3) || ' OR tenant_id IS NULL)';
       END $$;`,
      [schemaName, tableName, tenantId]
    );
  }
}

/**
 * Ensure user has access to tenant
 * @param {Object} connection - Database connection
 * @param {string} tenantId - Tenant ID
 * @param {string} userId - User ID
 */
async function ensureUserTenantAccess(connection, tenantId, userId) {
  // Check if user-tenant relationship exists
  const checkResult = await connection.query(
    `SELECT 1 FROM tenant_users WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );
  
  // If not exists, create it
  if (checkResult.rows.length === 0) {
    await connection.query(
      `INSERT INTO tenant_users (tenant_id, user_id, created_at, updated_at, role) 
       VALUES ($1, $2, NOW(), NOW(), 'owner')`,
      [tenantId, userId]
    );
  }
} 