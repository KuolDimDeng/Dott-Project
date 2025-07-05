import { NextResponse } from 'next/server';
import { isValidUUID } from '@/utils/tenantUtils';
import axiosInstance from '@/lib/axiosConfig';
import { serverLogger } from '@/utils/serverLogger';
import { updateUserAttributes  } from '@/config/amplifyUnified';
import { API_ERROR_CODES } from '@/constants/errors';

/**
 * API route to verify tenant access
 * Used by middleware to check if user has access to specific tenant
 */
export async function POST(request) {
  try {
    const { tenantId, userId, email } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Missing tenant ID', 
        code: API_ERROR_CODES.INVALID_PARAMS 
      }, { status: 400 });
    }
    
    serverLogger.info(`[verify-tenant] Verifying tenant ID: ${tenantId} for user: ${userId || email}`);
    
    // First check if this tenant ID exists in the database
    try {
      // Connect to database and query tenant
      const db = await import('@/lib/db');
      const client = await db.getClient();
      
      const tenantQuery = `
        SELECT id, name, owner_id, schema_name, is_active 
        FROM custom_auth_tenant 
        WHERE id = $1
      `;
      
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        // Tenant ID doesn't exist in database - check if there's another tenant for this user
        const userTenantQuery = `
          SELECT id, name, owner_id, schema_name, is_active 
          FROM custom_auth_tenant 
          WHERE owner_id = $1
        `;
        
        const userTenantResult = await client.query(userTenantQuery, [userId]);
        
        if (userTenantResult.rows.length > 0) {
          // User has a tenant in database but the ID doesn't match - sync the IDs
          const dbTenantId = userTenantResult.rows[0].id;
          
          serverLogger.info(`[verify-tenant] Found tenant mismatch. Cognito: ${tenantId}, Database: ${dbTenantId}`);
          
          // Return the correct tenant ID from database
          return NextResponse.json({
            success: true,
            tenantId: dbTenantId,
            name: userTenantResult.rows[0].name,
            isActive: userTenantResult.rows[0].is_active,
            schemaName: userTenantResult.rows[0].schema_name,
            mismatch: true,
            message: "Found tenant ID mismatch. Using database tenant ID."
          });
        }
        
        // No tenant found for this user - return error
        return NextResponse.json({ 
          error: 'Tenant not found',
          code: API_ERROR_CODES.TENANT_NOT_FOUND 
        }, { status: 404 });
      }
      
      const tenant = tenantResult.rows[0];
      
      // Tenant exists - verify ownership if userId provided
      if (userId && tenant.owner_id !== userId) {
        // This tenant exists but is not owned by this user
        serverLogger.warn(`[verify-tenant] Tenant ${tenantId} is not owned by user ${userId}`);
        
        // Check if user has any other tenants
        const userTenantQuery = `
          SELECT id, name, owner_id, schema_name, is_active 
          FROM custom_auth_tenant 
          WHERE owner_id = $1
        `;
        
        const userTenantResult = await client.query(userTenantQuery, [userId]);
        
        if (userTenantResult.rows.length > 0) {
          // User has a different tenant - return that instead
          return NextResponse.json({
            success: true,
            tenantId: userTenantResult.rows[0].id,
            name: userTenantResult.rows[0].name,
            isActive: userTenantResult.rows[0].is_active,
            schemaName: userTenantResult.rows[0].schema_name,
            mismatch: true,
            message: "Found tenant ownership mismatch. Using user's tenant ID."
          });
        }
        
        // User doesn't own any tenants - return error
        return NextResponse.json({ 
          error: 'Tenant not owned by user',
          code: API_ERROR_CODES.TENANT_NOT_OWNED 
        }, { status: 403 });
      }
      
      // Tenant ID is valid and owned by user (if userId provided)
      return NextResponse.json({
        success: true,
        tenantId: tenant.id,
        name: tenant.name,
        isActive: tenant.is_active,
        schemaName: tenant.schema_name
      });
      
    } catch (dbError) {
      serverLogger.error('[verify-tenant] Database error:', dbError);
      return NextResponse.json({ 
        error: 'Database error', 
        code: API_ERROR_CODES.DATABASE_ERROR,
        message: dbError.message
      }, { status: 500 });
    }
    
  } catch (error) {
    serverLogger.error('[verify-tenant] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: error.message
    }, { status: 500 });
  }
}

/**
 * API endpoint to verify if a tenant ID is valid
 * GET /api/auth/verify-tenant?tenantId=...
 */
export async function GET(request) {
  try {
    // Get tenant ID from URL params
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    
    // Validate tenant ID format
    if (!tenantId || !isValidUUID(tenantId)) {
      return NextResponse.json(
        { valid: false, message: 'Invalid tenant ID format' },
        { status: 400 }
      );
    }
    
    try {
      // Verify tenant ID with backend
      const response = await axiosInstance.get(`/api/tenants/verify?tenantId=${tenantId}`);
      
      // If no error was thrown, tenant is valid
      return NextResponse.json(
        { valid: true, data: response.data },
        { status: 200 }
      );
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Tenant not found
        return NextResponse.json(
          { valid: false, message: 'Tenant not found' },
          { status: 404 }
        );
      }
      
      // Other errors
      console.error('Error verifying tenant:', error);
      return NextResponse.json(
        { valid: false, message: 'Error verifying tenant' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}