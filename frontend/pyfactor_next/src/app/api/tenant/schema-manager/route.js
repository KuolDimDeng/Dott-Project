import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { createLogger } from '@/utils/logger';
import { getDbConfigFromEnv } from '@/utils/db-config';
import { isUUID, validateAndRepairUuid } from '@/utils/uuid-helpers';
import { getAuth } from '@/utils/auth-helpers';

// Dedicated logger for schema operations
const logger = createLogger('schema-manager');

// Constants
const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';
const LOCK_TIMEOUT = 30000; // 30 seconds timeout for locks
const SCHEMA_NAME_PREFIX = 'tenant_';

// In-memory cache for active schema operations
// This acts as a semaphore to prevent concurrent operations on the same schema
const activeSchemaOperations = new Map();

/**
 * Generate a deterministic schema name from a tenant ID
 */
function generateSchemaName(tenantId) {
  // Ensure the tenantId is a valid UUID
  const validTenantId = validateAndRepairUuid(tenantId);
  return `${SCHEMA_NAME_PREFIX}${validTenantId.replace(/-/g, '_')}`;
}

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
 * Check if a schema exists in the database
 */
async function schemaExists(pool, schemaName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = $1
    );
  `, [schemaName]);
  
  return result.rows[0].exists;
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
 * Acquire a lock for schema operations
 * Returns true if lock acquired, false if already locked
 */
function acquireSchemaLock(schemaName, operation) {
  if (activeSchemaOperations.has(schemaName)) {
    return false;
  }
  
  // Set the lock with operation details and timestamp
  activeSchemaOperations.set(schemaName, {
    operation,
    timestamp: Date.now(),
    lockId: uuidv4()
  });
  
  return true;
}

/**
 * Release a schema lock
 */
function releaseSchemaLock(schemaName, lockId) {
  const lock = activeSchemaOperations.get(schemaName);
  
  // Only release if lockId matches or if lock has timed out
  if (lock && (lock.lockId === lockId || Date.now() - lock.timestamp > LOCK_TIMEOUT)) {
    activeSchemaOperations.delete(schemaName);
    return true;
  }
  
  return false;
}

/**
 * Clean up expired locks
 */
function cleanupExpiredLocks() {
  const now = Date.now();
  for (const [schemaName, lock] of activeSchemaOperations.entries()) {
    if (now - lock.timestamp > LOCK_TIMEOUT) {
      logger.warn(`Cleaning up expired lock for schema ${schemaName}, operation: ${lock.operation}`);
      activeSchemaOperations.delete(schemaName);
    }
  }
}

/**
 * Create a schema if it doesn't exist
 */
async function createSchemaIfNotExists(pool, schemaName, tenantId, businessName, userId) {
  logger.info(`Creating schema if not exists: ${schemaName} for tenant ${tenantId}`);
  
  // Acquire lock for creating the schema
  const lockId = uuidv4();
  if (!acquireSchemaLock(schemaName, 'create_schema')) {
    logger.warn(`Schema creation already in progress for ${schemaName}`);
    return {
      success: false,
      message: 'Schema creation already in progress',
      locked: true
    };
  }
  
  try {
    // First check if schema already exists
    const exists = await schemaExists(pool, schemaName);
    
    if (exists) {
      logger.info(`Schema ${schemaName} already exists, skipping creation`);
      
      // If schema exists but tenant doesn't have a proper name, try to update it
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
        message: 'Schema already exists',
        schemaName,
        tenantId,
        exists: true,
        created: false
      };
    }
    
    // Schema doesn't exist, create it
    logger.info(`Creating new schema: ${schemaName}`);
    
    // Begin a transaction for atomicity
    await pool.query('BEGIN');
    
    // Create the schema
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
    
    // Create tenant record only if we have a real business name
    let tenantResult = null;
    if (businessName) {
      tenantResult = await pool.query(`
        INSERT INTO custom_auth_tenant (
          id, name, owner_id, schema_name, created_at, updated_at,
          rls_enabled, rls_setup_date
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW(), true, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET name = EXCLUDED.name, 
            updated_at = NOW()
        RETURNING id, name, schema_name, owner_id, rls_enabled;
      `, [tenantId, businessName, userId, schemaName]);
    } else {
      // Without a business name, only create the schema - don't add to tenant table
      logger.warn(`Skipping tenant record creation for ${tenantId} - no business name provided`);
    }
    
    // Set up permissions
    await pool.query(`GRANT USAGE ON SCHEMA "${schemaName}" TO dott_admin;`);
    await pool.query(`GRANT ALL PRIVILEGES ON SCHEMA "${schemaName}" TO dott_admin;`);
    
    // Commit the transaction
    await pool.query('COMMIT');
    
    logger.info(`Successfully created schema ${schemaName} and tenant record`);
    
    return {
      success: true,
      message: 'Schema created successfully',
      schemaName,
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
    
    logger.error(`Error creating schema: ${error.message}`, error);
    
    return {
      success: false,
      message: `Failed to create schema: ${error.message}`,
      error: error.message
    };
  } finally {
    // Always release the lock
    releaseSchemaLock(schemaName, lockId);
  }
}

/**
 * Check if a schema exists without attempting to create it
 */
export async function GET(request) {
  cleanupExpiredLocks(); // Clean up any expired locks
  
  // Parse query parameters
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId');
  
  if (!tenantId || !isUUID(tenantId)) {
    return NextResponse.json(
      { error: 'Invalid or missing tenant ID' },
      { status: 400 }
    );
  }
  
  const schemaName = generateSchemaName(tenantId);
  
  try {
    const pool = await createPool();
    
    try {
      // Check if schema exists
      const exists = await schemaExists(pool, schemaName);
      
      // Also check if tenant record exists
      const tenantExists = await pool.query(`
        SELECT id, name, schema_name, owner_id, created_at, updated_at, rls_enabled
        FROM custom_auth_tenant
        WHERE id = $1
      `, [tenantId]);
      
      return NextResponse.json({
        success: true,
        schemaExists: exists,
        tenantExists: tenantExists.rows.length > 0,
        tenantInfo: tenantExists.rows.length > 0 ? tenantExists.rows[0] : null,
        schemaName,
        tenantId
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error(`Error checking schema existence: ${error.message}`, error);
    
    return NextResponse.json(
      { error: 'Failed to check schema existence', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Create a schema for a tenant
 */
export async function POST(request) {
  cleanupExpiredLocks(); // Clean up any expired locks
  
  try {
    // Get authentication information
    const auth = await getAuth();
    
    // Parse request body
    const body = await request.json();
    
    // Check whether to force create or not
    const forceCreate = body.forceCreate === true;
    
    // Get tenant ID from request or generate a new one
    let tenantId = body.tenantId;
    
    // If no tenant ID provided but user ID is available, generate deterministic tenant ID
    if (!tenantId && body.userId && forceCreate) {
      tenantId = generateTenantIdFromUserId(body.userId);
    } 
    // If still no tenant ID, use one from auth user
    else if (!tenantId && auth.user?.sub && forceCreate) {
      tenantId = generateTenantIdFromUserId(auth.user.sub);
    }
    // Last resort - generate a random UUID, but ONLY if forceCreate is true
    else if (!tenantId && forceCreate) {
      tenantId = uuidv4();
    }
    // If no tenant ID and forceCreate is false, return an error
    else if (!tenantId && !forceCreate) {
      logger.warn('No tenant ID provided and forceCreate is false, refusing to create a new tenant');
      return NextResponse.json({ 
        success: false, 
        message: 'No tenant ID provided and tenant creation not explicitly requested' 
      }, { status: 400 });
    }
    
    // Ensure tenant ID is valid
    tenantId = validateAndRepairUuid(tenantId);
    
    // Get user ID from request or auth
    const userId = body.userId || auth.user?.sub || null;
    
    // Get business name from request or auth - ONLY use real data, no defaults
    const businessName = body.businessName || auth.user?.businessName || null;
    
    // If no real business name is provided, log warning but continue with schema creation
    if (!businessName) {
      logger.warn(`No real business name provided for tenant ${tenantId}, schema will be created but tenant record may be incomplete`);
    }
    
    // Generate schema name
    const schemaName = generateSchemaName(tenantId);
    
    logger.info(`Processing schema creation request for tenant ${tenantId}, schema ${schemaName}`);
    
    // Create database pool
    const pool = await createPool();
    
    try {
      // Check if schema exists first
      const exists = await schemaExists(pool, schemaName);
      
      // If schema doesn't exist and forceCreate is false, return error
      if (!exists && !forceCreate) {
        logger.warn(`Schema ${schemaName} doesn't exist and forceCreate is false, refusing to create`);
        return NextResponse.json({ 
          success: false, 
          message: 'Schema does not exist and creation not explicitly requested',
          tenantId,
          schemaName,
          exists: false
        }, { status: 400 });
      }
      
      // Create schema if it doesn't exist (and we have permission to create it)
      const result = await createSchemaIfNotExists(
        pool, 
        schemaName, 
        tenantId, 
        businessName, 
        userId
      );
      
      // Check if operation is locked by another process
      if (!result.success && result.locked) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Schema creation already in progress',
            tenantId,
            schemaName 
          },
          { status: 409 } // Conflict
        );
      }
      
      // Return the result
      return NextResponse.json(result, { 
        status: result.success ? 200 : 500 
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error(`Error in schema creation endpoint: ${error.message}`, error);
    
    return NextResponse.json(
      { error: 'Schema creation failed', message: error.message },
      { status: 500 }
    );
  }
} 