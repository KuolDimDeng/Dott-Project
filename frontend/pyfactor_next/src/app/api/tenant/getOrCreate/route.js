import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';
import { getJwtFromRequest } from '@/utils/auth/authUtils';
import { generateDeterministicTenantId, formatSchemaName } from '@/utils/tenant';
import { updateCognitoAttribute } from '@/utils/cognito';

/**
 * API route to get or create a tenant for a user
 * Uses deterministic UUIDs to ensure users always get the same tenant
 * Implements proper locking to prevent race conditions
 */
export async function POST(request) {
  const requestId = Date.now().toString(36);
  let pool = null;
  let client = null;

  try {
    // Extract user information from JWT
    const jwt = await getJwtFromRequest(request);
    
    if (!jwt || !jwt.sub) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: No authenticated user found'
      }, { status: 401 });
    }
    
    const userId = jwt.sub;
    const userEmail = jwt.email || '';
    const userName = jwt.name || jwt.given_name || jwt.email?.split('@')[0] || 'User';
    
    console.log(`[${requestId}] Getting or creating tenant for user: ${userId}, ${userEmail}`);
    
    // Connect to database
    pool = await createDbPool();
    client = await pool.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Get advisory lock to prevent race conditions
    // Use a hash of the user ID as the lock key
    const lockKey = BigInt(`0x${Buffer.from(userId).toString('hex')}`) % 2147483647n;
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey.toString()]);
    
    // First, check if the user already has a tenant in the tenant_users table
    console.log(`[${requestId}] Checking if user already has a tenant...`);
    const existingUserTenantResult = await client.query(`
      SELECT tenant_id 
      FROM public.tenant_users 
      WHERE user_id = $1 
      LIMIT 1
    `, [userId]);
    
    if (existingUserTenantResult.rows.length > 0) {
      const existingTenantId = existingUserTenantResult.rows[0].tenant_id;
      console.log(`[${requestId}] User already has tenant: ${existingTenantId}`);
      
      // Get tenant details
      const tenantDetailsResult = await client.query(`
        SELECT * FROM public.custom_auth_tenant WHERE id = $1
      `, [existingTenantId]);
      
      // Update Cognito with the tenant ID if needed
      try {
        await updateCognitoAttribute(userId, 'custom:businessid', existingTenantId);
      } catch (error) {
        console.error(`[${requestId}] Error updating Cognito attribute: ${error.message}`);
        // Continue anyway since we found the tenant
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        tenantId: existingTenantId,
        tenant: tenantDetailsResult.rows[0],
        message: 'Found existing tenant for user',
        isNew: false
      });
    }
    
    // User doesn't have a tenant, generate a deterministic tenant ID
    const tenantId = generateDeterministicTenantId(userId);
    if (!tenantId) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: false,
        message: 'Failed to generate tenant ID'
      }, { status: 500 });
    }
    
    // Check if this tenant ID already exists (but not associated with user)
    const existingTenantResult = await client.query(`
      SELECT * FROM public.custom_auth_tenant WHERE id = $1
    `, [tenantId]);
    
    let tenantExists = false;
    if (existingTenantResult.rows.length > 0) {
      console.log(`[${requestId}] Tenant ${tenantId} already exists, associating with user...`);
      tenantExists = true;
    }
    
    // Format schema name
    const schemaName = formatSchemaName(tenantId);
    
    // Generate tenant name
    const tenantName = `${userName}'s Organization`;
    
    // If tenant doesn't exist, create it
    if (!tenantExists) {
      console.log(`[${requestId}] Creating new tenant: ${tenantId}`);
      
      // Create tenant record
      await client.query(`
        INSERT INTO public.custom_auth_tenant (
          id, name, owner_id, schema_name, created_at, updated_at, rls_enabled, is_active
        ) VALUES ($1, $2, $3, $4, NOW(), NOW(), true, true)
        ON CONFLICT (id) DO NOTHING
      `, [tenantId, tenantName, userId, schemaName]);
      
      // Create schema for tenant
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    }
    
    // Associate user with tenant
    console.log(`[${requestId}] Associating user ${userId} with tenant ${tenantId}`);
    await client.query(`
      INSERT INTO public.tenant_users (tenant_id, user_id, role, created_at)
      VALUES ($1, $2, 'owner', NOW())
      ON CONFLICT (user_id) DO NOTHING
    `, [tenantId, userId]);
    
    // Update user's Cognito attributes
    try {
      await updateCognitoAttribute(userId, 'custom:businessid', tenantId);
    } catch (error) {
      console.error(`[${requestId}] Error updating Cognito attribute: ${error.message}`);
    }
    
    // Get updated tenant details
    const tenantDetailsResult = await client.query(`
      SELECT * FROM public.custom_auth_tenant WHERE id = $1
    `, [tenantId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      tenantId,
      tenant: tenantDetailsResult.rows[0],
      message: tenantExists ? 'Associated user with existing tenant' : 'Created new tenant',
      isNew: !tenantExists
    });
    
  } catch (error) {
    // Rollback transaction in case of error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(`[${requestId}] Error during rollback: ${rollbackError.message}`);
      }
    }
    
    console.error(`[${requestId}] Error getting/creating tenant: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: `Failed to get/create tenant: ${error.message}`
    }, { status: 500 });
    
  } finally {
    // Release database resources
    if (client) client.release();
    if (pool) await pool.end();
  }
} 