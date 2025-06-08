import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';

/**
 * API route for testing database connection and tenant existence
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('id');
  
  console.log(`Testing connection for tenant ID: ${tenantId}`);
  
  let pool = null;
  let client = null;
  
  try {
    // Connect to database
    try {
      pool = await createDbPool();
      client = await pool.connect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({
        success: false,
        message: `Database connection failed: ${dbError.message}`,
        error: dbError
      }, { status: 500 });
    }
    
    // Test query
    try {
      const connectionTest = await client.query('SELECT 1 as test');
      console.log('Connection test query successful:', connectionTest.rows[0]);
    } catch (queryError) {
      console.error('Test query error:', queryError);
      return NextResponse.json({
        success: false,
        message: `Test query failed: ${queryError.message}`,
        error: queryError
      }, { status: 500 });
    }
    
    // Check if tenant exists (if tenant ID provided)
    if (tenantId) {
      try {
        const tenantQuery = await client.query(`
          SELECT * FROM public.custom_auth_tenant WHERE id = $1
        `, [tenantId]);
        
        if (tenantQuery.rows.length > 0) {
          const tenant = tenantQuery.rows[0];
          console.log('Tenant found:', tenant);
          
          return NextResponse.json({
            success: true,
            tenant: {
              id: tenant.id,
              name: tenant.name,
              schema: tenant.schema_name,
              tenant_id: tenant.tenant_id,
              created_at: tenant.created_at,
              updated_at: tenant.updated_at,
              rls_enabled: tenant.rls_enabled,
              is_active: tenant.is_active
            },
            message: 'Tenant exists in database'
          });
        } else {
          console.warn(`Tenant not found: ${tenantId}`);
          return NextResponse.json({
            success: false,
            message: 'Tenant not found in database'
          }, { status: 404 });
        }
      } catch (tenantError) {
        console.error('Error checking tenant:', tenantError);
        return NextResponse.json({
          success: false,
          message: `Error checking tenant: ${tenantError.message}`,
          error: tenantError
        }, { status: 500 });
      }
    }
    
    // Return generic success if no tenant ID provided
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-connection route:', error);
    return NextResponse.json({
      success: false,
      message: `Error in test-connection: ${error.message}`,
      error: error
    }, { status: 500 });
  } finally {
    if (client) client.release();
  }
} 