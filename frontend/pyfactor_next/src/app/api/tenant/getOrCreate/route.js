import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';
import { getJwtFromRequest } from '@/utils/auth/authUtils';
import { generateDeterministicTenantId, formatSchemaName } from '@/utils/tenant';
// Removed AWS Cognito import - now using Auth0

// Import logger for better debugging
import { logger } from '@/utils/serverLogger';

/**
 * API route to get or create a tenant for a user
 * Uses deterministic UUIDs to ensure users always get the same tenant
 * Implements proper locking to prevent race conditions
 */
export async function POST(request) {
  const requestId = Date.now().toString(36);
  let pool = null;
  let client = null;

  // Log environment variables for debugging AWS access
  logger.debug(`[${requestId}] Environment variables check:`, {
    region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_COGNITO_REGION || '(not set)',
    userPoolId: process.env.COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '(not set)',
    accessKeyAvailable: !!process.env.AWS_ACCESS_KEY_ID,
    secretKeyAvailable: !!process.env.AWS_SECRET_ACCESS_KEY
  });

  try {
    // Extract user information from JWT
    const jwt = await getJwtFromRequest(request);
    
    if (!jwt || !jwt.sub) {
      console.error(`[${requestId}] No valid JWT or subject found in request`);
      return NextResponse.json({
        success: false,
        message: 'Unauthorized: No authenticated user found'
      }, { status: 401 });
    }
    
    const userId = jwt.sub;
    const userEmail = jwt.email || '';
    
    // Log the user ID for tracking
    logger.info(`[${requestId}] Processing tenant request for user: ${userId.substring(0, 8)}...`);
    
    // Parse request body for additional parameters
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error(`[${requestId}] Error parsing request body:`, parseError);
      requestBody = {};
    }
    
    const providedTenantId = requestBody.tenantId;
    const planId = requestBody.planId;
    const billingCycle = requestBody.billingCycle;
    
    // Generate username with capitalized first letter if from email
    let userName = jwt.name || jwt.given_name;
    if (!userName && userEmail) {
      const emailName = userEmail.split('@')[0];
      userName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    if (!userName) {
      userName = 'Guest';
    }
    
    console.log(`[${requestId}] Getting or creating tenant for user: ${userId}, ${userEmail}`);
    
    // Connect to database
    pool = await createDbPool();
    client = await pool.connect();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Set unset tenant context to bypass RLS for tenant management operations
    await client.query("SELECT set_config('app.current_tenant_id', 'unset', false)");
    
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
      
      // Update Cognito with the tenant ID and subscription information if provided
      try {
        // Collect all attributes to update in one operation
        const cognitoAttributes = {
          'custom:tenant_ID': existingTenantId,
          'custom:businessid': existingTenantId
        };
        
        // Add subscription info if provided
        if (planId) {
          cognitoAttributes['custom:subplan'] = planId;
          cognitoAttributes['custom:requirespayment'] = planId === 'free' ? 'false' : 'true';
        }
        
        if (billingCycle) {
          cognitoAttributes['custom:subscriptioninterval'] = billingCycle;
        }
        
        // Update onboarding status
        cognitoAttributes['custom:onboarding'] = 'complete';
        cognitoAttributes['custom:setupdone'] = 'true';
        cognitoAttributes['custom:updated_at'] = new Date().toISOString();
        
        // Send all updates at once
        await updateUserAttributesServer(userId, cognitoAttributes);
        console.log(`[${requestId}] Updated Cognito attributes for existing tenant`);
      } catch (error) {
        console.error(`[${requestId}] Error updating Cognito attributes: ${error.message}`);
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
    
    // User doesn't have a tenant
    // If a tenant ID was provided in the request, use it if valid
    // Otherwise generate a deterministic tenant ID
    let tenantId;
    if (providedTenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedTenantId)) {
      console.log(`[${requestId}] Using provided tenant ID: ${providedTenantId}`);
      tenantId = providedTenantId;
    } else {
      tenantId = generateDeterministicTenantId(userId);
      console.log(`[${requestId}] Generated deterministic tenant ID: ${tenantId}`);
    }
    
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
      
      // Create schema for tenant (for backward compatibility) - not actually used with RLS
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    }
    
    // Associate user with tenant
    console.log(`[${requestId}] Associating user ${userId} with tenant ${tenantId}`);
    await client.query(`
      INSERT INTO public.tenant_users (tenant_id, user_id, role, created_at)
      VALUES ($1, $2, 'owner', NOW())
      ON CONFLICT (user_id) DO UPDATE SET tenant_id = $1, updated_at = NOW()
    `, [tenantId, userId]);
    
    // Update user's Cognito attributes with tenant ID and subscription info
    try {
      // Collect all attributes to update in one operation
      const cognitoAttributes = {
        'custom:tenant_ID': tenantId,
        'custom:businessid': tenantId
      };
      
      // Add subscription info if provided
      if (planId) {
        cognitoAttributes['custom:subplan'] = planId;
        cognitoAttributes['custom:subscriptionstatus'] = 'active';
        cognitoAttributes['custom:requirespayment'] = planId === 'free' ? 'false' : 'true';
      }
      
      if (billingCycle) {
        cognitoAttributes['custom:subscriptioninterval'] = billingCycle;
      }
      
      // Update onboarding status
      cognitoAttributes['custom:onboarding'] = 'complete';
      cognitoAttributes['custom:setupdone'] = 'true';
      cognitoAttributes['custom:updated_at'] = new Date().toISOString();
      cognitoAttributes['custom:acctstatus'] = 'active';
      
      // Log the attributes we're about to update
      logger.info(`[${requestId}] Updating Cognito attributes for user with tenant ID: ${tenantId}`);
      logger.debug(`[${requestId}] Attributes to update:`, cognitoAttributes);
      
      // Send all updates at once
      await updateUserAttributesServer(userId, cognitoAttributes);
      logger.info(`[${requestId}] Updated all Cognito attributes for user with tenant ID: ${tenantId}`);
    } catch (error) {
      logger.error(`[${requestId}] Error updating Cognito attributes: ${error.message}`);
      // Continue with the tenant creation process
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return NextResponse.json({
      success: true,
      tenantId,
      message: tenantExists ? 'Associated tenant with user' : 'Created new tenant',
      isNew: !tenantExists
    });
    
  } catch (error) {
    // Log error details for debugging
    console.error(`[${requestId}] Error processing tenant request:`, error);
    logger.error(`[${requestId}] Error processing tenant request:`, {
      message: error.message,
      stack: error.stack
    });
    
    // Rollback transaction if it was started
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(`[${requestId}] Error rolling back transaction:`, rollbackError);
      }
    }
    
    return NextResponse.json({
      success: false,
      message: `Error processing tenant request: ${error.message}`,
      error: error.message
    }, { status: 500 });
  } finally {
    // Release client and close pool
    if (client) client.release();
    // Don't close the pool as it may be reused
  }
} 