import { NextResponse } from 'next/server';
import { createServerLogger } from '@/utils/serverLogger';
import { getAuth } from '@/utils/auth-helpers';
import { Pool } from 'pg';

const logger = createServerLogger('tenant-verify');

/**
 * GET handler to verify user access to a tenant
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant ID is required', hasAccess: false },
      { status: 400 }
    );
  }
  
  logger.info(`Verifying tenant access for tenant ID: ${tenantId}`);
  
  // Get authentication information
  const auth = await getAuth();
  
  if (!auth.user) {
    logger.warn('Unauthorized attempt to verify tenant access');
    return NextResponse.json(
      { error: 'Authentication required', hasAccess: false },
      { status: 401 }
    );
  }
  
  // Create database connection
  const pool = new Pool({
    host: process.env.RDS_HOSTNAME || 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
    port: process.env.RDS_PORT || 5432,
    database: process.env.RDS_DB_NAME || 'dott_main',
    user: process.env.RDS_USERNAME || 'dott_admin',
    password: process.env.RDS_PASSWORD || 'RRfXU6uPPUbBEg1JqGTJ',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Get tenant information to check if it exists
    const tenantResult = await pool.query(`
      SELECT id, name, schema_name, owner_id, is_active
      FROM custom_auth_tenant
      WHERE id = $1
    `, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      logger.warn(`Tenant not found with ID: ${tenantId}`);
      return NextResponse.json({ hasAccess: false, reason: 'tenant_not_found' });
    }
    
    const tenant = tenantResult.rows[0];
    
    // Check if tenant is active
    if (!tenant.is_active) {
      logger.warn(`Tenant is inactive: ${tenantId}`);
      return NextResponse.json({ hasAccess: false, reason: 'tenant_inactive' });
    }
    
    // Check if user is the owner
    const userId = auth.user.sub;
    const userEmail = auth.user.email;
    const isOwner = tenant.owner_id === userId || tenant.owner_id === userEmail;
    
    if (isOwner) {
      logger.info(`User ${userEmail} is the owner of tenant ${tenantId}`);
      return NextResponse.json({ 
        hasAccess: true, 
        role: 'owner',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          schemaName: tenant.schema_name
        }
      });
    }
    
    // Check user membership
    const userResult = await pool.query(`
      SELECT id, email, is_admin
      FROM custom_auth_user
      WHERE (email = $1 OR id = $2) AND tenant_id = $3
    `, [userEmail, userId, tenantId]);
    
    if (userResult.rows.length === 0) {
      logger.warn(`User ${userEmail} does not have access to tenant ${tenantId}`);
      return NextResponse.json({ hasAccess: false, reason: 'user_not_member' });
    }
    
    // Determine role
    const userRole = userResult.rows[0].is_admin ? 'admin' : 'member';
    
    logger.info(`User ${userEmail} has ${userRole} access to tenant ${tenantId}`);
    
    return NextResponse.json({
      hasAccess: true,
      role: userRole,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        schemaName: tenant.schema_name
      }
    });
  } catch (error) {
    logger.error(`Error verifying tenant access: ${error.message}`, error);
    return NextResponse.json(
      { error: 'Failed to verify tenant access', hasAccess: false },
      { status: 500 }
    );
  } finally {
    // Always close the pool
    await pool.end();
  }
}

// Add support for POST method
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { tenantId, accessToken } = body;
    
    if (!tenantId) {
      console.error('[TenantVerify] No tenant ID provided in request');
      return NextResponse.json(
        {
          isValid: false,
          error: 'No tenant ID provided'
        },
        { status: 400 }
      );
    }
    
    // Format tenant ID for database compatibility
    const formattedTenantId = formatTenantId(tenantId);
    
    console.info('[TenantVerify] Verifying tenant:', { 
      originalId: tenantId,
      formattedId: formattedTenantId
    });
    
    try {
      // Try to validate tenant ID with database
      const { Pool } = require('pg');
      
      const dbConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME
      };
      
      // Only attempt direct DB connection if we have credentials
      if (dbConfig.user && dbConfig.password && dbConfig.host && dbConfig.database) {
        console.info('[TenantVerify] Attempting direct database check');
        
        const pool = new Pool(dbConfig);
        
        const query = `
          SELECT id, name, status
          FROM tenants
          WHERE id = $1
          LIMIT 1;
        `;
        
        const result = await pool.query(query, [formattedTenantId]);
        
        pool.end();
        
        if (result.rows && result.rows.length > 0) {
          console.info('[TenantVerify] Tenant found in database:', result.rows[0]);
          
          return NextResponse.json({
            isValid: true,
            tenant: {
              id: formattedTenantId,
              name: result.rows[0].name,
              status: result.rows[0].status,
              schema_name: `tenant_${formattedTenantId.replace(/-/g, '_')}`
            },
            direct_db: true
          });
        } else {
          console.warn('[TenantVerify] Tenant not found in database:', { tenantId: formattedTenantId });
          
          // Return invalid status to keep dashboard in loading state
          return NextResponse.json({
            isValid: false,
            message: 'Tenant not found in database',
            error: 'TENANT_NOT_FOUND',
            tenantId: formattedTenantId
          }, { status: 404 });
        }
      }
    } catch (dbError) {
      console.error('[TenantVerify] Database verification failed:', dbError);
      // Return error to keep dashboard in loading state
      return NextResponse.json({
        isValid: false,
        message: 'Database verification failed',
        error: 'DB_ERROR',
        details: dbError.message
      }, { status: 500 });
    }
    
    // Return invalid status since no tenant was found
    return NextResponse.json({
      isValid: false,
      message: 'No valid tenant record found',
      error: 'TENANT_INVALID',
      tenantId: formattedTenantId
    }, { status: 404 });
    
  } catch (error) {
    console.error('[TenantVerify] Error in POST verify:', error);
    
    // Return error to keep dashboard in loading state
    return NextResponse.json({
      isValid: false,
      message: 'Error processing request',
      error: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 });
  }
} 