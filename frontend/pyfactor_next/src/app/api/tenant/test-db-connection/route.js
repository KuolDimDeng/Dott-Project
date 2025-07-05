import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { createDbPool, getDbConfig, testDbConnection } from '../db-config';

/**
 * Test API endpoint to verify database connection and check table structure
 * This is helpful for debugging database connection issues
 */
export async function GET(request) {
  let pool = null;
  
  try {
    // Test basic database connection
    const connectionTest = await testDbConnection();
    
    // Return early if connection fails
    if (!connectionTest.success) {
      return NextResponse.json(connectionTest);
    }
    
    // Get information about the custom_auth_tenant table
    pool = await createDbPool();
    
    // Query for table existence
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'custom_auth_tenant'
      );
    `;
    
    const tableExists = await pool.query(tableExistsQuery);
    
    // If table exists, get its structure
    let tableStructure = null;
    let tableCount = null;
    
    if (tableExists.rows[0].exists) {
      // Get table structure
      const structureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'custom_auth_tenant'
        ORDER BY ordinal_position;
      `;
      
      // Get record count
      const countQuery = `
        SELECT COUNT(*) FROM custom_auth_tenant;
      `;
      
      // Execute both queries
      const [structureResult, countResult] = await Promise.all([
        pool.query(structureQuery),
        pool.query(countQuery)
      ]);
      
      tableStructure = structureResult.rows;
      tableCount = countResult.rows[0].count;
    }
    
    // Check database version
    const versionQuery = `SELECT version();`;
    const versionResult = await pool.query(versionQuery);
    
    // Check permission status
    let permissionStatus = null;
    try {
      const permissionQuery = `
        SELECT grantee, privilege_type 
        FROM information_schema.table_privileges 
        WHERE table_name = 'custom_auth_tenant' AND table_schema = 'public'
        ORDER BY grantee, privilege_type;
      `;
      
      const permissionResult = await pool.query(permissionQuery);
      permissionStatus = permissionResult.rows;
    } catch (permError) {
      permissionStatus = { error: permError.message };
    }
    
    return NextResponse.json({
      success: true,
      connectionTest,
      tableExists: tableExists.rows[0].exists,
      tableStructure,
      tableCount: tableCount || 0,
      databaseVersion: versionResult.rows[0].version,
      permissions: permissionStatus,
      currentTimestamp: new Date().toISOString(),
      dbConfig: {
        host: getDbConfig().host,
        port: getDbConfig().port,
        database: getDbConfig().database,
        user: getDbConfig().user
      }
    });
  } catch (error) {
    logger.error('[TestDbConnection] Error testing database connection:', error);
    
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
      } catch (closeError) {
        logger.error('[TestDbConnection] Error closing pool:', closeError.message);
      }
    }
  }
}