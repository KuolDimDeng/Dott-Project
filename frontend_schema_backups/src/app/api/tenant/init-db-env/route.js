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
          /* RLS: schema_name deprecated */
    schema_name VARCHAR(255) NULL -- Kept for backward compatibility, will be removedNULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          rls_enabled BOOLEAN DEFAULT TRUE,
          rls_setup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE
        );
        
        -- Add comment to schema_name column to indicate it's deprecated
        COMMENT ON COLUMN public.custom_auth_tenant.schema_name IS 'Deprecated: Only kept for backward compatibility. RLS is the preferred isolation method.';
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
    
    // Update indices to remove the schema_name index
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_tenant_owner_id ON public.custom_auth_tenant(owner_id);
    `;
    
    await pool.query(createIndexQuery);
    logger.info('[InitDbEnv] Ensured indices exist on custom_auth_tenant table');
    
    // Create tenant_id RLS helper function
    const createRlsFunctionQuery = `
      CREATE OR REPLACE FUNCTION get_current_tenant_id()
      RETURNS UUID AS $$
      BEGIN
        -- If tenant ID is not set, return NULL
        IF current_setting('app.current_tenant_id', TRUE) IS NULL THEN
          RETURN NULL;
        END IF;
        
        -- Try to convert the tenant ID string to UUID
        BEGIN
          RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
        EXCEPTION WHEN OTHERS THEN
          RETURN NULL;
        END;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create function to apply RLS to a table
      CREATE OR REPLACE FUNCTION apply_rls_to_table(table_name TEXT)
      RETURNS VOID AS $$
      BEGIN
        -- Enable RLS on the table
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', 
                      table_name);
        
        -- Create policy if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = table_name 
          AND policyname = 'tenant_isolation_policy'
        ) THEN
          -- Create RLS policy
          EXECUTE format('CREATE POLICY tenant_isolation_policy ON %I 
                          USING (tenant_id = get_current_tenant_id())
                          WITH CHECK (tenant_id = get_current_tenant_id())', 
                        table_name);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Log error and continue
        RAISE NOTICE 'Error applying RLS to table %: %', table_name, SQLERRM;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Try to create the function
    try {
      await pool.query(createRlsFunctionQuery);
      logger.info('[InitDbEnv] Created RLS helper functions');
    } catch (funcError) {
      logger.warn('[InitDbEnv] Error creating RLS functions (may already exist):', funcError.message);
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