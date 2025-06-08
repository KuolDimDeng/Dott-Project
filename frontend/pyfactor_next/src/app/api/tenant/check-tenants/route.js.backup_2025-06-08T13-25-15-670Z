import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { createDbPool, getDbConfig } from '../db-config';

/**
 * Diagnostic endpoint to check tenant records in the database
 * This is helpful for debugging tenant issues
 */
export async function GET(request) {
  let pool = null;
  
  try {
    // Create database pool
    pool = await createDbPool();
    logger.info('[CheckTenants] Created database pool successfully');
    
    // Check if custom_auth_tenant table exists
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
        error: "Table custom_auth_tenant does not exist",
        message: "The tenant table does not exist in the database"
      }, { status: 404 });
    }
    
    // Get all tenant records
    const tenantsQuery = `
      SELECT 
        id, name, owner_id, schema_name, 
        created_at, updated_at, rls_enabled, rls_setup_date,
        is_active
      FROM 
        custom_auth_tenant
      ORDER BY 
        created_at DESC;
    `;
    
    const tenantsResult = await pool.query(tenantsQuery);
    
    // Get count of records in the table
    const countQuery = `SELECT COUNT(*) FROM custom_auth_tenant;`;
    const countResult = await pool.query(countQuery);
    
    // Check for schemas that match tenant schemas
    const schemasQuery = `
      SELECT 
        schema_name 
      FROM 
        information_schema.schemata 
      WHERE 
        schema_name LIKE 'tenant_%'
      ORDER BY 
        schema_name;
    `;
    
    const schemasResult = await pool.query(schemasQuery);
    
    // Get database version
    const versionQuery = `SELECT version();`;
    const versionResult = await pool.query(versionQuery);
    
    return NextResponse.json({
      success: true,
      tenants: tenantsResult.rows,
      count: parseInt(countResult.rows[0].count),
      tenants: schemasResult.rows.map(row => ({ id: row.id, name: row.name })) /* RLS: Using tenant records */,
      databaseVersion: versionResult.rows[0].version,
      dbConfig: {
        host: getDbConfig().host,
        port: getDbConfig().port,
        database: getDbConfig().database,
        user: getDbConfig().user
      }
    });
  } catch (error) {
    logger.error('[CheckTenants] Error checking tenants:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      detail: error.detail,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    if (pool) {
      try {
        await pool.end();
        logger.info('[CheckTenants] Database connection closed');
      } catch (closeError) {
        logger.error('[CheckTenants] Error closing pool:', closeError.message);
      }
    }
  }
}