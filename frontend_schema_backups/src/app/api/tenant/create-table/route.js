import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { createDbPool, getDbConfig } from '../db-config';

/**
 * Specialized endpoint to create the custom_auth_tenant table
 * This is helpful as a final fallback for tenant setup
 * 
 * This endpoint is called automatically when a user signs in or views the dashboard
 * to ensure the required tables exist without manual intervention
 */
export async function GET(request) {
  let pool = null;
  
  try {
    // Create database pool
    pool = await createDbPool();
    logger.info('[CreateTenantTable] Created database pool successfully');
    
    // Create tenant table with explicit schema
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_id VARCHAR(255),
        /* RLS: schema_name deprecated */
    schema_name VARCHAR(255) NULL -- Kept for backward compatibility, will be removed,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        rls_enabled BOOLEAN DEFAULT TRUE,
        rls_setup_date TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE
      );
      
      CREATE INDEX IF NOT EXISTS idx_tenant_owner_id ON public.custom_auth_tenant(owner_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_schema_name ON public.custom_auth_tenant(schema_name);
    `;
    
    await pool.query(createTableQuery);
    logger.info('[CreateTenantTable] Successfully created custom_auth_tenant table');
    
    // Check if table was created
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'custom_auth_tenant'
      );
    `;
    
    const checkResult = await pool.query(checkTableQuery);
    const tableExists = checkResult.rows[0].exists;
    
    if (!tableExists) {
      return NextResponse.json({
        success: false,
        error: "Failed to create table",
        message: "The table creation query executed but verification failed"
      }, { status: 500 });
    }
    
    // Check table structure
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_auth_tenant'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await pool.query(tableStructureQuery);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully created custom_auth_tenant table',
      tableStructure: structureResult.rows,
      dbConfig: {
        host: getDbConfig().host,
        port: getDbConfig().port,
        database: getDbConfig().database,
        user: getDbConfig().user
      }
    });
  } catch (error) {
    logger.error('[CreateTenantTable] Error creating tenant table:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      detail: error.detail,
      message: 'Failed to create tenant table'
    }, { status: 500 });
  } finally {
    if (pool) {
      try {
        await pool.end();
        logger.info('[CreateTenantTable] Database connection closed');
      } catch (closeError) {
        logger.error('[CreateTenantTable] Error closing pool:', closeError.message);
      }
    }
  }
}