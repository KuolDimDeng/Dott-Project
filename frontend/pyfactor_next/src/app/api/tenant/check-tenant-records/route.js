import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { logger } from '@/utils/serverLogger';
import { Pool } from 'pg';
import { getDbConfig } from '@/config/database';

/**
 * Endpoint to check tenant records in the database
 * This is helpful for debugging tenant creation issues
 */
export async function GET(request) {
  let pool = null;
  try {
    const config = getDbConfig();
    
    // Create a database connection
    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl
    });
    
    // Test the connection
    await pool.query('SELECT NOW()');
    logger.info('[check-tenant-records] Database connection successful');
    
    // Query all tenant records
    const result = await pool.query('SELECT id, name, schema_name, owner_id, created_at FROM custom_auth_tenant ORDER BY created_at DESC LIMIT 10');
    
    // Check schemas
    const schemaResult = await pool.query(`
      SELECT nspname AS schema_name 
      FROM pg_catalog.pg_namespace 
      WHERE nspname LIKE 'tenant_%' 
      ORDER BY nspname
      LIMIT 20
    `);
    
    // Return the results
    return NextResponse.json({
      success: true,
      tenant_records: result.rows,
      schema_count: schemaResult.rowCount,
      schemas: schemaResult.rows.map(row => row.schema_name)
    });
  } catch (error) {
    logger.error(`[check-tenant-records] Error: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      error_stack: error.stack
    }, { status: 500 });
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (closeError) {
        logger.warn('[check-tenant-records] Error closing database pool:', closeError);
      }
    }
  }
}