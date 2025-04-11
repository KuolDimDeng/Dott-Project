/**
 * API endpoint that validates tenant records in the database
 */
import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';

/**
 * GET handler to check tenant records exist in AWS RDS
 */
export async function GET(request) {
  let pool = null;
  
  try {
    pool = await createDbPool();
    
    // Check if tenant table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_auth_tenant'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (!tableExists) {
      // Table doesn't exist, create it
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          owner_id VARCHAR(255),
          /* RLS: schema_name deprecated */
    schema_name VARCHAR(255) NULL -- Kept for backward compatibility, will be removed,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          rls_enabled BOOLEAN DEFAULT TRUE,
          rls_setup_date TIMESTAMP WITH TIME ZONE NULL,
          is_active BOOLEAN DEFAULT TRUE
        );
      `);
      
      return NextResponse.json({
        success: true,
        tableExists: false,
        tableCreated: true,
        message: "Tenant table was created successfully"
      });
    }
    
    // Get tenant count
    const countResult = await pool.query('SELECT COUNT(*) FROM custom_auth_tenant');
    const tenantCount = parseInt(countResult.rows[0].count);
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      tenantCount,
      message: tenantCount > 0 
        ? `AWS RDS database has ${tenantCount} tenant records`
        : "AWS RDS database has no tenant records yet"
    });
  } catch (error) {
    console.error('Error checking tenant records:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}