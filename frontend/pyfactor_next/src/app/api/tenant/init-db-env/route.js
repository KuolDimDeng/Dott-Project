import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { createDbPool, getDbConfig } from '../db-config';

/**
 * Special endpoint to create initial DB environment
 * Uses hardcoded credentials and creates tenant table if needed
 */
export async function GET(request) {
  let pool = null;
  
  try {
    // Create database pool
    pool = await createDbPool();
    logger.info('[InitDbEnv] Created database pool successfully');
    
    // Check if custom_auth_tenant table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'custom_auth_tenant'
      );
    `;
    
    const checkResult = await pool.query(checkTableQuery);
    const tableExists = checkResult.rows[0].exists;
    
    if (tableExists) {
      logger.info('[InitDbEnv] Table custom_auth_tenant already exists');
    } else {
      logger.info('[InitDbEnv] Table custom_auth_tenant does not exist, creating now');
      
      // Create tenant table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          owner_id VARCHAR(255),
          schema_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          rls_enabled BOOLEAN DEFAULT TRUE,
          rls_setup_date TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT TRUE
        );
      `;
      
      await pool.query(createTableQuery);
      logger.info('[InitDbEnv] Successfully created custom_auth_tenant table');
    }
    
    // Check table structure
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_auth_tenant'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(tableStructureQuery);
    
    // Ensure indices exist for performance
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_tenant_owner_id ON public.custom_auth_tenant(owner_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_schema_name ON public.custom_auth_tenant(schema_name);
    `;
    
    await pool.query(createIndexQuery);
    logger.info('[InitDbEnv] Ensured indices exist on custom_auth_tenant table');
    
    // Create init function to set up RLS for tenants
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION setup_tenant_rls(tenant_id UUID, schema_name TEXT)
      RETURNS VOID AS $$
      DECLARE
        table_name TEXT;
      BEGIN
        -- Loop through all tables in the schema
        FOR table_name IN
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = schema_name
        LOOP
          -- Enable RLS for each table
          EXECUTE format('ALTER TABLE IF EXISTS %I.%I ENABLE ROW LEVEL SECURITY', 
                        schema_name, table_name);
          
          -- Create or replace RLS policy
          EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I.%I', 
                        schema_name, table_name);
          
          EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I.%I 
                          USING (tenant_id = %L)
                          WITH CHECK (tenant_id = %L)', 
                          schema_name, table_name, tenant_id, tenant_id);
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Try to create the function
    try {
      await pool.query(createFunctionQuery);
      logger.info('[InitDbEnv] Created RLS setup function');
    } catch (funcError) {
      logger.warn('[InitDbEnv] Error creating RLS function (may already exist):', funcError.message);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database environment initialized successfully',
      tableExists,
      tableStructure: structureResult.rows,
      dbConfig: {
        host: getDbConfig().host,
        port: getDbConfig().port,
        database: getDbConfig().database,
        user: getDbConfig().user
      }
    });
  } catch (error) {
    logger.error('[InitDbEnv] Error initializing database environment:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      detail: error.detail,
      message: 'Failed to initialize database environment'
    }, { status: 500 });
  } finally {
    if (pool) {
      try {
        await pool.end();
        logger.info('[InitDbEnv] Database connection closed');
      } catch (closeError) {
        logger.error('[InitDbEnv] Error closing pool:', closeError.message);
      }
    }
  }
}