import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { createServerLogger } from '@/utils/serverLogger';
import { getDbConfigFromEnv } from '@/utils/db-config';
import { isUUID, validateAndRepairUuid } from '@/utils/uuid-helpers';
import { getAuth } from '@/utils/auth-helpers';

// Rename to reflect RLS-based tenant management
const logger = createServerLogger('tenant-manager');

// Constants
const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
const LOCK_TIMEOUT = 30000; // 30 seconds timeout for locks

// In-memory cache for active tenant operations
// This acts as a semaphore to prevent concurrent operations on the same tenant
const activeTenantOperations = new Map();

/**
 * Generate a deterministic tenant ID from a user ID
 */
function generateTenantIdFromUserId(userId) {
  return uuidv5(userId, TENANT_NAMESPACE);
}

/**
 * Create a database pool
 */
async function createPool() {
  try {
    const dbConfig = getDbConfigFromEnv();
    return new Pool(dbConfig);
  } catch (error) {
    logger.error('Failed to create database pool:', error);
    throw error;
  }
}

/**
 * Check if a tenant record exists in the database
 */
async function tenantExists(pool, tenantId) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM custom_auth_tenant 
      WHERE id = $1
    );
  `, [tenantId]);
  
  return result.rows[0].exists;
}

/**
 * Acquire a lock for tenant operations
 * Returns true if lock acquired, false if already locked
 */
function acquireTenantLock(tenantId, operation) {
  if (activeTenantOperations.has(tenantId)) {
    return false;
  }
  
  // Set the lock with operation details and timestamp
  activeTenantOperations.set(tenantId, {
    operation,
    timestamp: Date.now(),
    lockId: uuidv4()
  });
  
  return true;
}

/**
 * Release a tenant lock
 */
function releaseTenantLock(tenantId, lockId) {
  const lock = activeTenantOperations.get(tenantId);
  
  // Only release if lockId matches or if lock has timed out
  if (lock && (lock.lockId === lockId || Date.now() - lock.timestamp > LOCK_TIMEOUT)) {
    activeTenantOperations.delete(tenantId);
    return true;
  }
  
  return false;
}

/**
 * Clean up expired locks
 */
function cleanupExpiredLocks() {
  const now = Date.now();
  for (const [tenantId, lock] of activeTenantOperations.entries()) {
    if (now - lock.timestamp > LOCK_TIMEOUT) {
      logger.warn(`Cleaning up expired lock for tenant ${tenantId}, operation: ${lock.operation}`);
      activeTenantOperations.delete(tenantId);
    }
  }
}

/**
 * Create a tenant record if it doesn't exist
 */
async function createTenantIfNotExists(pool, tenantId, businessName, userId) {
  logger.info(`Creating tenant if not exists: ${tenantId}`);
  
  // Acquire lock for creating the tenant
  const lockId = uuidv4();
  if (!acquireTenantLock(tenantId, 'create_tenant')) {
    logger.warn(`Tenant creation already in progress for ${tenantId}`);
    return {
      success: false,
      message: 'Tenant creation already in progress',
      locked: true
    };
  }
  
  try {
    // First check if tenant already exists
    const exists = await tenantExists(pool, tenantId);
    
    if (exists) {
      logger.info(`Tenant ${tenantId} already exists, skipping creation`);
      
      // If tenant exists but doesn't have a proper name, try to update it
      if (businessName) {
        try {
          // Check if tenant record exists with default/generic name
          const tenantCheck = await pool.query(`
            SELECT id, name FROM custom_auth_tenant 
            WHERE id = $1 AND (name = 'Default Business' OR name = '')
          `, [tenantId]);
          
          if (tenantCheck.rows && tenantCheck.rows.length > 0) {
            // Update tenant name with real business name
            await pool.query(`
              UPDATE custom_auth_tenant 
              SET name = $1, updated_at = NOW()
              WHERE id = $2
            `, [businessName, tenantId]);
            
            logger.info(`Updated generic tenant name to real business name: ${businessName}`);
          }
        } catch (updateError) {
          logger.warn(`Failed to update tenant name: ${updateError.message}`);
        }
      }
      
      return {
        success: true,
        message: 'Tenant already exists',
        tenantId,
        exists: true,
        created: false
      };
    }
    
    // Tenant doesn't exist, create it
    logger.info(`Creating new tenant: ${tenantId}`);
    
    // Begin a transaction for atomicity
    await pool.query('BEGIN');
    
    // Create tenant record only if we have a real business name
    let tenantResult = null;
    if (businessName) {
      tenantResult = await pool.query(`
        INSERT INTO custom_auth_tenant (
          id, name, owner_id, created_at, updated_at,
          rls_enabled, rls_setup_date, tenant_id
        )
        VALUES ($1, $2, $3, NOW(), NOW(), true, NOW(), $1)
        ON CONFLICT (id) DO UPDATE 
        SET name = EXCLUDED.name, 
            updated_at = NOW()
        RETURNING id, name, owner_id, rls_enabled;
      `, [tenantId, businessName, userId]);
    } else {
      // Without a business name, create with default name
      tenantResult = await pool.query(`
        INSERT INTO custom_auth_tenant (
          id, name, owner_id, created_at, updated_at,
          rls_enabled, rls_setup_date, tenant_id
        )
        VALUES ($1, 'Default Business', $2, NOW(), NOW(), true, NOW(), $1)
        RETURNING id, name, owner_id, rls_enabled;
      `, [tenantId, userId]);
    }
    
    // Set up RLS policy if needed
    try {
      // Check if RLS is enabled on the table
      const rlsCheck = await pool.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'custom_auth_tenant'
      `);
      
      if (rlsCheck.rows && rlsCheck.rows.length > 0 && !rlsCheck.rows[0].relrowsecurity) {
        // Enable RLS on the table
        await pool.query(`ALTER TABLE custom_auth_tenant ENABLE ROW LEVEL SECURITY;`);
        logger.info('Enabled RLS on custom_auth_tenant table');
      }
      
      // Check if RLS policy exists
      const policyCheck = await pool.query(`
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'custom_auth_tenant' 
        AND policyname = 'tenant_isolation_policy'
      `);
      
      if (!policyCheck.rows || policyCheck.rows.length === 0) {
        // Create RLS policy
        await pool.query(`
          CREATE POLICY tenant_isolation_policy ON custom_auth_tenant
          USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID OR id = current_setting('app.current_tenant_id', TRUE)::UUID OR tenant_id IS NULL)
          WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID OR id = current_setting('app.current_tenant_id', TRUE)::UUID);
        `);
        logger.info('Created RLS policy for custom_auth_tenant table');
      }
    } catch (rlsError) {
      logger.warn(`Error setting up RLS: ${rlsError.message}`);
      // Continue anyway, not critical for tenant creation
    }
    
    // Commit the transaction
    await pool.query('COMMIT');
    
    logger.info(`Successfully created tenant record for ${tenantId}`);
    
    return {
      success: true,
      message: 'Tenant created successfully',
      tenantId,
      tenantInfo: tenantResult?.rows[0] || null,
      exists: false,
      created: true
    };
  } catch (error) {
    // Roll back the transaction if anything fails
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error(`Error during rollback: ${rollbackError.message}`);
    }
    
    logger.error(`Error creating tenant: ${error.message}`, error);
    
    return {
      success: false,
      message: `Failed to create tenant: ${error.message}`,
      error: error.message
    };
  } finally {
    // Always release the lock
    releaseTenantLock(tenantId, lockId);
  }
}

/**
 * GET handler for tenant status
 */
export async function GET(request) {
  try {
    // Clean up any expired locks
    cleanupExpiredLocks();
    
    // Extract tenant ID from query params
    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenant_id');
    const userId = searchParams.get('user_id');
    
    // If user_id provided but no tenant_id, generate one
    if (!tenantId && userId) {
      tenantId = generateTenantIdFromUserId(userId);
    }
    
    // Validate tenant ID
    if (!tenantId || !isUUID(tenantId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid tenant ID',
        tenantId
      }, { status: 400 });
    }
    
    // Create pool and check tenant status
    const pool = await createPool();
    try {
      const exists = await tenantExists(pool, tenantId);
      
      // Get tenant details if it exists
      let tenantDetails = null;
      if (exists) {
        const result = await pool.query(`
          SELECT id, name, owner_id, created_at, updated_at, rls_enabled
          FROM custom_auth_tenant
          WHERE id = $1
        `, [tenantId]);
        
        if (result.rows && result.rows.length > 0) {
          tenantDetails = result.rows[0];
        }
      }
      
      return NextResponse.json({
        success: true,
        tenantId,
        exists,
        tenant: tenantDetails
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error('Error in GET handler:', error);
    return NextResponse.json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * POST handler for tenant creation
 */
export async function POST(request) {
  try {
    // Clean up any expired locks
    cleanupExpiredLocks();
    
    // Parse request body
    const body = await request.json();
    
    // Extract parameters with fallbacks
    let { tenant_id, user_id, business_name } = body;
    
    // Try to get tenant info from auth if available
    let auth = null;
    try {
      auth = await getAuth();
      if (auth && auth.user) {
        if (!user_id) user_id = auth.user.id;
        if (!tenant_id) tenant_id = auth.user.tenantId;
        if (!business_name && auth.user.businessName) {
          business_name = auth.user.businessName;
        }
      }
    } catch (authError) {
      logger.warn('Failed to get auth information:', authError.message);
    }
    
    // If user_id provided but no tenant_id, generate one
    if (!tenant_id && user_id) {
      tenant_id = generateTenantIdFromUserId(user_id);
    }
    
    // Validate tenant ID
    if (!tenant_id || !isUUID(tenant_id)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or missing tenant ID',
        tenant_id
      }, { status: 400 });
    }
    
    // Create pool and tenant if needed
    const pool = await createPool();
    try {
      const result = await createTenantIfNotExists(pool, tenant_id, business_name, user_id);
      return NextResponse.json(result);
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error('Error in POST handler:', error);
    return NextResponse.json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 