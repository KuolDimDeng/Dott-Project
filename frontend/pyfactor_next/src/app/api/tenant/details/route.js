import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';
import { getJwtFromRequest } from '@/utils/auth/authUtils';
import { formatSchemaName } from '@/utils/tenant';

/**
 * API route to get tenant details
 */
export async function GET(request) {
  const requestId = Date.now().toString(36);
  let pool = null;
  let client = null;

  try {
    // Extract tenant ID from query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('id');
    
    console.log(`[${requestId}] Tenant details request for ID: ${tenantId}`);
    
    if (!tenantId) {
      console.warn(`[${requestId}] Missing tenant ID parameter`);
      return NextResponse.json({
        success: false,
        message: 'Missing tenant ID parameter'
      }, { status: 400 });
    }
    
    // Get JWT token for authorization
    const jwt = await getJwtFromRequest(request);
    
    // Connect to database
    try {
      pool = await createDbPool();
      client = await pool.connect();
      console.log(`[${requestId}] Database connection successful`);
    } catch (dbError) {
      console.error(`[${requestId}] Database connection error:`, dbError);
      
      // In development mode, provide a mock response for easier frontend development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${requestId}] Returning mock data in development mode`);
        return NextResponse.json({
          success: true,
          tenant: {
            id: tenantId,
            name: `Test Tenant (${tenantId.substring(0, 8)})`,
            schema: `tenant_${tenantId.replace(/-/g, '_')}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            owner_id: 'mock-owner-id',
            status: 'active'
          }
        });
      }
      
      return NextResponse.json({
        success: false,
        message: `Database connection failed: ${dbError.message}`
      }, { status: 500 });
    }
    
    // Get tenant details
    let tenantDetailsResult;
    try {
      tenantDetailsResult = await client.query(`
        SELECT * FROM public.custom_auth_tenant WHERE id = $1
      `, [tenantId]);
    } catch (queryError) {
      console.error(`[${requestId}] Error querying tenant details:`, queryError);
      return NextResponse.json({
        success: false,
        message: `Database query failed: ${queryError.message}`
      }, { status: 500 });
    }
    
    if (tenantDetailsResult.rows.length === 0) {
      console.warn(`[${requestId}] Tenant not found: ${tenantId}`);
      
      // Try to create the tenant automatically as fallback
      try {
        console.log(`[${requestId}] Attempting to create tenant ${tenantId} automatically`);
        
        // Create schema name from tenant ID
        const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
        
        // Create tenant record
        await client.query(`
          INSERT INTO public.custom_auth_tenant (
            id, name, schema_name, created_at, updated_at, 
            rls_enabled, rls_setup_date, is_active, tenant_id
          ) VALUES (
            $1, $2, $3, NOW(), NOW(), 
            TRUE, NOW(), TRUE, $1
          )
          ON CONFLICT (id) DO NOTHING
        `, [tenantId, `Tenant ${tenantId.substring(0, 8)}`, schemaName]);
        
        // Check if tenant was created
        const checkResult = await client.query(`
          SELECT * FROM public.custom_auth_tenant WHERE id = $1
        `, [tenantId]);
        
        if (checkResult.rows.length > 0) {
          console.log(`[${requestId}] Successfully created tenant ${tenantId}`);
          tenantDetailsResult = checkResult;
        } else {
          console.error(`[${requestId}] Failed to create tenant ${tenantId}`);
          return NextResponse.json({
            success: false,
            message: 'Tenant not found and auto-creation failed'
          }, { status: 404 });
        }
      } catch (createError) {
        console.error(`[${requestId}] Error creating tenant:`, createError);
        return NextResponse.json({
          success: false,
          message: 'Tenant not found and error during auto-creation'
        }, { status: 404 });
      }
    }
    
    const tenant = tenantDetailsResult.rows[0];
    console.log(`[${requestId}] Tenant found:`, tenant.id);
    
    // Check if the user has access to this tenant
    if (jwt && jwt.sub) {
      let userAccessResult;
      try {
        userAccessResult = await client.query(`
          SELECT * FROM public.tenant_users 
          WHERE tenant_id = $1 AND user_id = $2
        `, [tenantId, jwt.sub]);
      } catch (accessError) {
        console.warn(`[${requestId}] Error checking user access:`, accessError);
        // Continue without access check if it fails
      }
      
      if (userAccessResult && userAccessResult.rows.length === 0) {
        console.warn(`[${requestId}] User ${jwt.sub} attempted to access tenant ${tenantId} without permission`);
        // We still return the tenant details but mark it as unauthorized
        return NextResponse.json({
          success: true,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            schema: tenant.schema_name,
            status: tenant.is_active ? 'active' : 'inactive',
            unauthorized: true
          }
        });
      }
    }
    
    // We're skipping the dashboard elements query and returning just the tenant info
    // This will make the system use the custom dashboard component instead of 
    // looking for tenant_dashboard table entries
    const responseData = {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        schema: tenant.schema_name,
        created_at: tenant.created_at,
        updated_at: tenant.updated_at,
        owner_id: tenant.owner_id,
        status: tenant.is_active ? 'active' : 'inactive'
      }
    };
    
    console.log(`[${requestId}] Successfully returning tenant details without dashboard elements`);
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error(`[${requestId}] Error getting tenant details:`, error);
    
    return NextResponse.json({
      success: false,
      message: `Failed to get tenant details: ${error.message}`
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