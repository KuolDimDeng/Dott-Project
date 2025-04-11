import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { createDbPool } from '@/app/api/tenant/db-config';

/**
 * API route to initialize tenant database tables and RLS policies
 * Called after tenant creation to ensure all required database structures exist
 */
export async function POST(request) {
  let pool = null;
  let connection = null;
  
  try {
    // Parse request body with better error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('[InitializeTenant] Failed to parse request body:', parseError);
      body = {};
    }
    
    // Get tenant ID from request body or headers
    let tenantId = body.tenantId || '';
    if (!tenantId) {
      // Try to get from headers
      tenantId = request.headers.get('x-tenant-id');
    }
    
    // Validate tenant ID
    if (!tenantId || tenantId.length !== 36) {
      logger.error('[InitializeTenant] Invalid tenant ID format:', tenantId);
      return NextResponse.json({ 
        success: false, 
        error: 'invalid_tenant_id',
        message: 'Invalid tenant ID format'
      }, { status: 400 });
    }
    
    // Initialize database connection pool
    try {
      logger.debug('[InitializeTenant] Creating database connection pool');
      pool = await createDbPool();
      
      // Test connection with a simple query
      const testResult = await pool.query('SELECT 1 AS connection_test');
      logger.debug('[InitializeTenant] Database connection successful');
    } catch (dbError) {
      logger.error('[InitializeTenant] Database connection error:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'database_connection_failed',
        message: 'Failed to connect to database'
      }, { status: 500 });
    }
    
    // Start a transaction to ensure database consistency
    try {
      logger.debug('[InitializeTenant] Beginning transaction');
      connection = await pool.connect();
      await connection.query('BEGIN');
      
      // Check if tenant exists
      const tenantCheckResult = await connection.query(`
        SELECT id, name, owner_id, rls_enabled
        FROM custom_auth_tenant
        WHERE id = $1
      `, [tenantId]);
      
      if (tenantCheckResult.rows.length === 0) {
        // Tenant doesn't exist, can't initialize
        logger.error('[InitializeTenant] Tenant does not exist:', tenantId);
        await connection.query('ROLLBACK');
        
        return NextResponse.json({
          success: false,
          error: 'tenant_not_found',
          message: 'Tenant record not found in database'
        }, { status: 404 });
      }
      
      const tenant = tenantCheckResult.rows[0];
      logger.info('[InitializeTenant] Found tenant:', tenant);
      
      // Ensure RLS policy for tenant isolation exists
      try {
        // Create the tenant isolation function if it doesn't exist
        await connection.query(`
          CREATE OR REPLACE FUNCTION tenant_isolation_policy(record_tenant_id uuid)
          RETURNS boolean AS $$
          BEGIN
            -- Always allow super admins to see everything
            IF current_setting('app.is_admin', true) = 'true' THEN
              RETURN true;
            END IF;
            
            -- Check if current tenant ID matches record tenant ID
            IF current_setting('app.current_tenant_id', true) = record_tenant_id::text THEN
              RETURN true;
            END IF;
            
            -- No match
            RETURN false;
          END;
          $$ LANGUAGE plpgsql;
        `);
        
        logger.info('[InitializeTenant] Created tenant isolation function');
        
        // Enable RLS on the tenant table
        try {
          await connection.query(`
            ALTER TABLE custom_auth_tenant ENABLE ROW LEVEL SECURITY;
          `);
          
          logger.info('[InitializeTenant] Enabled RLS on tenant table');
        } catch (rlsEnableError) {
          logger.warn('[InitializeTenant] Error or already enabled RLS:', rlsEnableError.message);
          // Continue anyway, might already be enabled
        }
        
        // Create RLS policy if not exists
        try {
          await connection.query(`
            DROP POLICY IF EXISTS tenant_isolation_policy ON custom_auth_tenant;
            CREATE POLICY tenant_isolation_policy ON custom_auth_tenant
              USING (tenant_isolation_policy(id));
          `);
          
          logger.info('[InitializeTenant] Created tenant isolation policy');
        } catch (policyError) {
          logger.warn('[InitializeTenant] Error creating policy:', policyError.message);
          // Continue anyway, policy might already exist
        }
        
        // Set tenant context for this connection
        await connection.query(`
          SET app.current_tenant_id = $1;
        `, [tenantId]);
        
        logger.info('[InitializeTenant] Set tenant context for connection');
        
        // Enable RLS on product table if it exists
        try {
          // Check if product table exists
          const productTableCheck = await connection.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'product'
            );
          `);
          
          if (productTableCheck.rows[0].exists) {
            // Enable RLS and create policy
            await connection.query(`
              ALTER TABLE product ENABLE ROW LEVEL SECURITY;
              DROP POLICY IF EXISTS tenant_isolation_policy ON product;
              CREATE POLICY tenant_isolation_policy ON product
                USING (tenant_isolation_policy(tenant_id));
            `);
            
            logger.info('[InitializeTenant] Enabled RLS on product table');
            
            // Create sample product if none exists
            const productCount = await connection.query(`
              SELECT COUNT(*) FROM product WHERE tenant_id = $1
            `, [tenantId]);
            
            if (parseInt(productCount.rows[0].count) === 0) {
              await connection.query(`
                INSERT INTO product (
                  id, name, tenant_id, created_at, updated_at, 
                  description, product_type, is_active, price
                )
                VALUES (
                  gen_random_uuid(), 'Sample Product', $1, NOW(), NOW(),
                  'A sample product for your business', 'physical', true, 9.99
                );
              `, [tenantId]);
              
              logger.info('[InitializeTenant] Created sample product');
            }
          }
        } catch (productError) {
          logger.warn('[InitializeTenant] Error setting up product table:', productError.message);
          // Continue anyway, product table may not exist yet
        }
        
        // Mark tenant as initialized
        await connection.query(`
          UPDATE custom_auth_tenant
          SET updated_at = NOW(), 
              rls_enabled = TRUE,
              rls_setup_date = NOW(),
              is_active = TRUE
          WHERE id = $1;
        `, [tenantId]);
        
        logger.info('[InitializeTenant] Updated tenant record');
      } catch (rlsError) {
        logger.error('[InitializeTenant] Error setting up RLS:', rlsError);
        throw rlsError; // Propagate error to roll back transaction
      }
      
      // Commit the transaction
      await connection.query('COMMIT');
      logger.info('[InitializeTenant] Transaction committed successfully');
      
      return NextResponse.json({
        success: true,
        tenantId: tenantId,
        initialized: true,
        rlsEnabled: true,
        message: 'Successfully initialized tenant database structures'
      });
      
    } catch (transactionError) {
      // Roll back transaction on error
      if (connection) {
        try {
          await connection.query('ROLLBACK');
          logger.warn('[InitializeTenant] Transaction rolled back due to error');
        } catch (rollbackError) {
          logger.error('[InitializeTenant] Error rolling back transaction:', rollbackError);
        }
      }
      
      logger.error('[InitializeTenant] Transaction error:', transactionError);
      
      return NextResponse.json({
        success: false,
        error: 'transaction_failed',
        message: 'Database transaction failed',
        details: transactionError.message
      }, { status: 500 });
    } finally {
      // Release the connection
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          logger.error('[InitializeTenant] Error releasing connection:', releaseError);
        }
      }
    }
    
  } catch (error) {
    logger.error('[InitializeTenant] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'unexpected_error',
      message: 'An unexpected error occurred',
      details: error.message
    }, { status: 500 });
  } finally {
    // Close pool if opened
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        logger.error('[InitializeTenant] Error closing pool:', poolError);
      }
    }
  }
} 