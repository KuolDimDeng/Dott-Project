import { NextResponse } from 'next/server';
import { createDbPool } from '@/app/api/tenant/db-config';
import { logger } from '@/utils/serverLogger';
import crypto from 'crypto';

/**
 * Debug endpoint for testing tenant creation directly
 * This bypasses normal flow to help diagnose database issues
 */
export async function POST(request) {
  const requestId = crypto.randomUUID().substring(0, 8);
  logger.info(`[DebugCreateTenant][${requestId}] Starting debug tenant creation`);
  
  let connection = null;
  let pool = null;
  
  try {
    const body = await request.json();
    const tenantId = body.tenantId || crypto.randomUUID();
    const businessName = body.businessName || 'Debug Business';
    
    logger.info(`[DebugCreateTenant][${requestId}] Creating tenant with ID: ${tenantId}`);
    
    // Connect to database
    pool = await createDbPool();
    connection = await pool.connect();
    
    // Check if tenant already exists
    const existingTenant = await connection.query(`
      SELECT id, tenant_id, name FROM custom_auth_tenant WHERE id = $1
    `, [tenantId]);
    
    if (existingTenant.rows.length > 0) {
      logger.info(`[DebugCreateTenant][${requestId}] Tenant already exists:`, existingTenant.rows[0]);
      return NextResponse.json({ 
        success: true, 
        message: 'Tenant already exists',
        tenant: existingTenant.rows[0]
      });
    }
    
    // Start transaction
    await connection.query('BEGIN');
    
    // Insert tenant record with both id and tenant_id populated
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    const ownerId = body.ownerId || 'debug_owner';
    
    const result = await connection.query(`
      INSERT INTO custom_auth_tenant (
        id, tenant_id, name, owner_id, schema_name, created_at, updated_at,
        rls_enabled, rls_setup_date, is_active
      )
      VALUES ($1, $1, $2, $3, $4, NOW(), NOW(), true, NOW(), true)
      RETURNING id, tenant_id, name, schema_name, owner_id;
    `, [tenantId, businessName, ownerId, schemaName]);
    
    // Set RLS policy
    await connection.query(`SET app.current_tenant_id = '${tenantId}'`);
    
    // Insert a default business record
    await connection.query(`
      INSERT INTO users_business (id, name, tenant_id, created_at, updated_at, type, country)
      VALUES ($1, $2, $1, NOW(), NOW(), 'Other', 'US')
      ON CONFLICT DO NOTHING
    `, [tenantId, businessName]);
    
    // Commit transaction
    await connection.query('COMMIT');
    
    logger.info(`[DebugCreateTenant][${requestId}] Successfully created tenant:`, result.rows[0]);
    
    return NextResponse.json({
      success: true,
      message: 'Tenant created successfully',
      tenant: result.rows[0]
    });
    
  } catch (error) {
    logger.error(`[DebugCreateTenant][${requestId}] Error creating tenant:`, error);
    
    if (connection) {
      try {
        await connection.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error(`[DebugCreateTenant][${requestId}] Error during rollback:`, rollbackError);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to create tenant'
    }, { status: 500 });
    
  } finally {
    if (connection) connection.release();
    if (pool) await pool.end();
  }
} 