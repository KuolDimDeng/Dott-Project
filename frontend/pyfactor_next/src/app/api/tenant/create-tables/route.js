import { NextResponse } from 'next/server';
import { createDbPool } from '@/app/api/tenant/db-config';
import { logger } from '@/utils/serverLogger';

/**
 * API route to create and ensure all required tables exist
 * This sets up the subscription and business details tables with RLS policies
 */
export async function GET(request) {
  let pool = null;
  let connection = null;
  const tablesCreated = [];
  const tablesExisted = [];
  const errors = [];
  
  try {
    logger.info('[create-tables] Creating database pool');
    pool = await createDbPool();
    
    // Get a client connection
    connection = await pool.connect();
    await connection.query('BEGIN');
    
    try {
      // Check and create tenant isolation function for RLS
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
      
      logger.info('[create-tables] Created tenant isolation function');
      
      // Ensure custom_auth_tenant table exists
      try {
        // Check if table exists
        const tenantTableCheck = await connection.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'custom_auth_tenant'
          );
        `);
        
        if (!tenantTableCheck.rows[0].exists) {
          // Create tenant table
          await connection.query(`
            CREATE TABLE custom_auth_tenant (
              id UUID PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              owner_id VARCHAR(255),
              schema_name VARCHAR(255) NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              rls_enabled BOOLEAN DEFAULT TRUE,
              rls_setup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              is_active BOOLEAN DEFAULT TRUE
            );
          `);
          
          // Enable RLS
          await connection.query(`
            ALTER TABLE custom_auth_tenant ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS tenant_isolation_policy ON custom_auth_tenant;
            CREATE POLICY tenant_isolation_policy ON custom_auth_tenant
              USING (tenant_isolation_policy(id));
          `);
          
          tablesCreated.push('custom_auth_tenant');
          logger.info('[create-tables] Created custom_auth_tenant table with RLS');
        } else {
          tablesExisted.push('custom_auth_tenant');
          logger.info('[create-tables] custom_auth_tenant table already exists');
        }
      } catch (tenantTableError) {
        errors.push({
          table: 'custom_auth_tenant',
          error: tenantTableError.message
        });
        logger.error('[create-tables] Error creating tenant table:', tenantTableError);
      }
      
      // Ensure users_subscription table exists
      try {
        // Check if table exists
        const subscriptionTableCheck = await connection.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users_subscription'
          );
        `);
        
        if (!subscriptionTableCheck.rows[0].exists) {
          // Create subscription table
          await connection.query(`
            CREATE TABLE users_subscription (
              id UUID PRIMARY KEY,
              tenant_id UUID NOT NULL,
              business_id UUID NOT NULL,
              selected_plan VARCHAR(50) NOT NULL DEFAULT 'free',
              billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
              is_active BOOLEAN DEFAULT TRUE,
              start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              end_date TIMESTAMP WITH TIME ZONE,
              stripe_subscription_id VARCHAR(255),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX idx_subscription_tenant ON users_subscription(tenant_id);
          `);
          
          // Enable RLS
          await connection.query(`
            ALTER TABLE users_subscription ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS tenant_isolation_policy ON users_subscription;
            CREATE POLICY tenant_isolation_policy ON users_subscription
              USING (tenant_isolation_policy(tenant_id));
          `);
          
          tablesCreated.push('users_subscription');
          logger.info('[create-tables] Created users_subscription table with RLS');
        } else {
          tablesExisted.push('users_subscription');
          logger.info('[create-tables] users_subscription table already exists');
        }
      } catch (subscriptionTableError) {
        errors.push({
          table: 'users_subscription',
          error: subscriptionTableError.message
        });
        logger.error('[create-tables] Error creating subscription table:', subscriptionTableError);
      }
      
      // Ensure users_business_details table exists
      try {
        // Check if table exists
        const businessDetailsTableCheck = await connection.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users_business_details'
          );
        `);
        
        if (!businessDetailsTableCheck.rows[0].exists) {
          // Create business details table
          await connection.query(`
            CREATE TABLE users_business_details (
              business_id UUID PRIMARY KEY,
              tenant_id UUID NOT NULL,
              business_type VARCHAR(50) DEFAULT 'Other',
              business_subtype_selections JSONB,
              legal_structure VARCHAR(50),
              date_founded DATE,
              country VARCHAR(2) DEFAULT 'US',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX idx_business_details_tenant ON users_business_details(tenant_id);
          `);
          
          // Enable RLS
          await connection.query(`
            ALTER TABLE users_business_details ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS tenant_isolation_policy ON users_business_details;
            CREATE POLICY tenant_isolation_policy ON users_business_details
              USING (tenant_isolation_policy(tenant_id));
          `);
          
          tablesCreated.push('users_business_details');
          logger.info('[create-tables] Created users_business_details table with RLS');
        } else {
          tablesExisted.push('users_business_details');
          logger.info('[create-tables] users_business_details table already exists');
        }
      } catch (businessDetailsTableError) {
        errors.push({
          table: 'users_business_details',
          error: businessDetailsTableError.message
        });
        logger.error('[create-tables] Error creating business details table:', businessDetailsTableError);
      }
      
      // Ensure users_business table exists
      try {
        // Check if table exists
        const businessTableCheck = await connection.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users_business'
          );
        `);
        
        if (!businessTableCheck.rows[0].exists) {
          // Create business table
          await connection.query(`
            CREATE TABLE users_business (
              id UUID PRIMARY KEY,
              tenant_id UUID NOT NULL,
              name VARCHAR(255) NOT NULL,
              type VARCHAR(50) DEFAULT 'Other',
              country VARCHAR(2) DEFAULT 'US',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX idx_business_tenant ON users_business(tenant_id);
          `);
          
          // Enable RLS
          await connection.query(`
            ALTER TABLE users_business ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS tenant_isolation_policy ON users_business;
            CREATE POLICY tenant_isolation_policy ON users_business
              USING (tenant_isolation_policy(tenant_id));
          `);
          
          tablesCreated.push('users_business');
          logger.info('[create-tables] Created users_business table with RLS');
        } else {
          tablesExisted.push('users_business');
          logger.info('[create-tables] users_business table already exists');
        }
      } catch (businessTableError) {
        errors.push({
          table: 'users_business',
          error: businessTableError.message
        });
        logger.error('[create-tables] Error creating business table:', businessTableError);
      }
      
      // Commit the transaction
      await connection.query('COMMIT');
      logger.info('[create-tables] Committed table creation transaction');
      
      return NextResponse.json({
        success: true,
        tablesCreated,
        tablesExisted,
        errors: errors.length > 0 ? errors : null,
        message: 'Database tables created or verified'
      });
      
    } catch (error) {
      // Rollback on error
      try {
        await connection.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('[create-tables] Error during rollback:', rollbackError);
      }
      
      throw error;
    }
  } catch (error) {
    logger.error('[create-tables] Error creating tables:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      tables: {
        created: tablesCreated,
        existed: tablesExisted
      },
      errors
    }, { status: 500 });
  } finally {
    // Release connection if acquired
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        logger.error('[create-tables] Error releasing connection:', releaseError);
      }
    }
    
    // Close pool if opened
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        logger.error('[create-tables] Error closing pool:', poolError);
      }
    }
  }
} 