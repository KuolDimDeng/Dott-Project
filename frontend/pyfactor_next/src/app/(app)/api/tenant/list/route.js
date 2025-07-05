import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';
import { getJwtFromRequest } from '@/utils/auth/authUtils';

/**
 * API route to list all tenants
 */
export async function GET(request) {
  const requestId = Date.now().toString(36);
  let pool = null;
  let client = null;

  try {
    console.log(`[${requestId}] Tenant list request received`);
    
    // Connect to database
    try {
      pool = await createDbPool();
      client = await pool.connect();
      console.log(`[${requestId}] Database connection successful`);
    } catch (dbError) {
      console.error(`[${requestId}] Database connection error:`, dbError);
      
      // In development mode, provide mock data
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] Returning mock data in development mode`);
        return NextResponse.json({
          success: true,
          tenants: [
            {
              id: '0cf5abab-70d7-4bee-b69c-1a0270054eac',
              name: 'Development Tenant 1',
              schema: 'tenant_0cf5abab_70d7_4bee_b69c_1a0270054eac',
              status: 'active'
            },
            {
              id: 'ff0e46de-8f17-493a-8e6b-9cabebf53f57',
              name: 'Development Tenant 2',
              schema: 'tenant_ff0e46de_8f17_493a_8e6b_9cabebf53f57',
              status: 'active'
            }
          ]
        });
      }
      
      return NextResponse.json({
        success: false,
        message: `Database connection failed: ${dbError.message}`
      }, { status: 500 });
    }
    
    // Get tenant list
    let tenantsResult;
    try {
      tenantsResult = await client.query(`
        SELECT 
          id, 
          name, 
          schema_name AS schema,
          created_at,
          updated_at,
          CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END AS status
        FROM public.custom_auth_tenant
        ORDER BY name ASC
      `);
    } catch (queryError) {
      console.error(`[${requestId}] Error querying tenants:`, queryError);
      return NextResponse.json({
        success: false,
        message: `Database query failed: ${queryError.message}`
      }, { status: 500 });
    }
    
    console.log(`[${requestId}] Successfully returned ${tenantsResult.rows.length} tenants`);
    
    return NextResponse.json({
      success: true,
      tenants: tenantsResult.rows
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error getting tenant list:`, error);
    
    return NextResponse.json({
      success: false,
      message: `Failed to get tenant list: ${error.message}`
    }, { status: 500 });
    
  } finally {
    // Release database resources
    if (client) {
      try {
        client.release();
        console.log(`[${requestId}] Database client released`);
      } catch (releaseError) {
        console.error(`[${requestId}] Error releasing client:`, releaseError);
      }
    }
  }
} 