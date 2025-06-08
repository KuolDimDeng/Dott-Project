import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { getCognitoUser } from '@/lib/cognito';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { validateTenantIdFormat } from '@/utils/tenantUtils';
import { isUUID } from '@/utils/uuid-helpers';
import { createServerLogger } from '@/utils/serverLogger';

// Create server logger for API routes
const logger = createServerLogger('TenantInit');

/**
 * Format tenant ID to be database-compatible
 * @param {string} tenantId - The tenant ID to format
 * @returns {string} - The formatted tenant ID
 */
function formatTenantId(tenantId) {
  if (!tenantId) return null;
  // For PostgreSQL UUID compatibility, we need to use hyphens, not underscores
  // If the ID has underscores, convert them to hyphens for UUID compatibility
  return tenantId.replace(/_/g, '-');
}

/**
 * Validate and repair a UUID string to ensure it's properly formatted
 * @param {string} uuid - The UUID string to validate/repair
 * @returns {string} - A valid UUID string or a new UUID if repair is impossible
 */
function validateAndRepairUuid(uuid) {
  if (!uuid) return uuidv4(); // Generate a new UUID if none provided
  
  // Standard UUID pattern: 8-4-4-4-12 characters with hyphens
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // If it's already a valid UUID, return it
  if (uuidPattern.test(uuid)) {
    return uuid;
  }
  
  // Try to repair common issues:
  let repairedUuid = uuid;
  
  // 1. Replace underscores with hyphens
  repairedUuid = repairedUuid.replace(/_/g, '-');
  
  // 2. Check if it's missing a character in the last segment
  if (repairedUuid.length === 35 && repairedUuid.charAt(23) === '-') {
    // Add a missing character at the end
    repairedUuid = repairedUuid + '0';
  }
  
  // 3. Add missing hyphens if they were omitted
  if (!repairedUuid.includes('-')) {
    if (repairedUuid.length === 32) {
      repairedUuid = 
        repairedUuid.substring(0, 8) + '-' + 
        repairedUuid.substring(8, 12) + '-' + 
        repairedUuid.substring(12, 16) + '-' + 
        repairedUuid.substring(16, 20) + '-' + 
        repairedUuid.substring(20);
    }
  }
  
  // Test again after repairs
  if (uuidPattern.test(repairedUuid)) {
    logger.info('Repaired UUID:', { original: uuid, repaired: repairedUuid });
    return repairedUuid;
  }
  
  // If repair failed, generate a new UUID
  const newUuid = uuidv4();
  logger.warn('Could not repair UUID, generated new one:', 
              { original: uuid, generated: newUuid });
  return newUuid;
}

/**
 * Ensure the custom_auth_user table exists in the public schema
 * @param {object} pool - Database connection pool
 * @returns {Promise<boolean>} Whether the table exists or was created successfully
 */
async function ensureCustomAuthUserTable(pool) {
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_auth_user'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      logger.info('custom_auth_user table already exists');
      return true;
    }
    
    // Create the table if it doesn't exist
    logger.warn('custom_auth_user table does not exist, creating it');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.custom_auth_user (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        tenant_id UUID,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    
    logger.info('Successfully created custom_auth_user table');
    return true;
  } catch (error) {
    logger.error('Error ensuring custom_auth_user table exists:', error);
    return false;
  }
}

/**
 * Ensure the custom_auth_tenant table exists in the public schema
 * @param {object} pool - Database connection pool
 * @returns {Promise<boolean>} Whether the table exists or was created successfully
 */
async function ensureCustomAuthTenantTable(pool) {
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'custom_auth_tenant'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      logger.info('custom_auth_tenant table already exists');
      return true;
    }
    
    // Create the table if it doesn't exist
    logger.warn('custom_auth_tenant table does not exist, creating it');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.custom_auth_tenant (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_id VARCHAR(255),
        schema_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        rls_enabled BOOLEAN DEFAULT TRUE,
        rls_setup_date TIMESTAMP WITH TIME ZONE NULL,
        is_active BOOLEAN DEFAULT TRUE,
        tenant_id UUID
      );
    `);
    
    logger.info('Successfully created custom_auth_tenant table');
    return true;
  } catch (error) {
    logger.error('Error ensuring custom_auth_tenant table exists:', error);
    return false;
  }
}

/**
 * Find user by email in the database
 * @param {object} pool - Database connection pool
 * @param {string} email - User email to search for
 * @returns {Promise<object|null>} User object or null if not found
 */
async function findUserByEmail(pool, email) {
  if (!email) return null;
  
  try {
    // First ensure the custom_auth_user table exists
    const tableReady = await ensureCustomAuthUserTable(pool);
    
    if (!tableReady) {
      logger.warn('Could not ensure custom_auth_user table, skipping user lookup');
      return null;
    }
    
    try {
      const query = `
        SELECT id, email, tenant_id
        FROM custom_auth_user
        WHERE email = $1
        LIMIT 1;
      `;
      
      const result = await pool.query(query, [email]);
      
      if (result.rows && result.rows.length > 0) {
        logger.info('Found existing user by email:', result.rows[0]);
        return result.rows[0];
      }
    } catch (queryError) {
      logger.error('Error executing query on custom_auth_user:', queryError);
      // Return null instead of letting the error propagate
      return null;
    }
    
    return null;
  } catch (error) {
    logger.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Find all tenants associated with a user ID in the database
 * @param {object} pool - Database connection pool
 * @param {string} userId - The user ID to search for
 * @returns {Promise<Array>} Array of tenant objects or empty array if none found
 */
async function findTenantsByUserId(pool, userId) {
  if (!userId) return [];
  
  try {
    // First ensure the custom_auth_tenant table exists
    const tableReady = await ensureCustomAuthTenantTable(pool);
    
    if (!tableReady) {
      logger.warn('Could not ensure custom_auth_tenant table, skipping tenant lookup by user ID');
      return [];
    }
    
    const query = `
      SELECT id, name, owner_id, schema_name, tenant_id
      FROM custom_auth_tenant
      WHERE owner_id = $1
      LIMIT 5;
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows && result.rows.length > 0) {
      logger.info(`Found ${result.rows.length} tenants associated with user ID ${userId}`);
      return result.rows;
    }
    
    return [];
  } catch (error) {
    logger.error('Error finding tenants by user ID:', error);
    return [];
  }
}

/**
 * Find tenant by ID in the database
 * @param {object} pool - Database connection pool
 * @param {string} tenantId - Tenant ID to search for
 * @returns {Promise<object|null>} Tenant object or null if not found
 */
async function findTenantById(pool, tenantId) {
  if (!tenantId) return null;
  
  try {
    // First ensure the custom_auth_tenant table exists
    const tableReady = await ensureCustomAuthTenantTable(pool);
    
    if (!tableReady) {
      logger.warn('Could not ensure custom_auth_tenant table, skipping tenant lookup');
      return null;
    }
    
    const formattedTenantId = formatTenantId(tenantId);
    
    const query = `
      SELECT id, name, owner_id, schema_name, tenant_id
      FROM custom_auth_tenant
      WHERE id = $1 OR tenant_id = $1
      LIMIT 1;
    `;
    
    const result = await pool.query(query, [formattedTenantId]);
    
    if (result.rows && result.rows.length > 0) {
      logger.info('Found existing tenant by ID:', result.rows[0]);
      return result.rows[0];
    }
    
    logger.info(`No tenant found with ID: ${formattedTenantId}`);
    return null;
  } catch (error) {
    logger.error('Error finding tenant by ID:', error);
    return null;
  }
}

/**
 * Creates or gets an existing tenant record for the given tenant ID
 * Enhanced to check for and prioritize existing tenants
 */
export async function POST(request) {
  let pool = null;
  let client = null;
  
  try {
    const body = await request.json();
    const { tenantId: rawTenantId, forceCreate, userId, checkExisting } = body;
    
    // Get the formatted and validated tenant ID
    const tenantId = validateAndRepairUuid(rawTenantId);
    
    logger.info('Tenant init request:', { 
      tenantId, 
      forceCreate, 
      userId,
      checkExisting,
      rawTenantId
    });
    
    // Import the database pool at runtime to avoid issues with Next.js edge functions
    const { createDbPool } = await import('@/app/api/tenant/db-config');
    pool = await createDbPool();
    
    // If checkExisting is true and userId is provided, search for existing tenants first
    if (checkExisting && userId) {
      logger.info(`Checking for existing tenants associated with user ID ${userId}`);
      
      // Search for existing tenants by user ID
      const existingTenants = await findTenantsByUserId(pool, userId);
      
      if (existingTenants.length > 0) {
        // Use the first active tenant from the list
        const existingTenant = existingTenants[0];
        
        logger.info('Using existing tenant from user associations:', existingTenant);
        
        // Return the existing tenant information
        return NextResponse.json({
          success: true,
          message: 'Using existing tenant',
          tenantId: existingTenant.id,
          name: existingTenant.name,
          exists: true,
          direct_db: true
        });
      }
    }
    
    // Check if tenant already exists by ID
    const existingTenant = await findTenantById(pool, tenantId);
    
    if (existingTenant) {
      logger.info('Tenant already exists with ID:', existingTenant);
      
      // Return the existing tenant information
      return NextResponse.json({
        success: true,
        message: 'Tenant already exists',
        tenantId: existingTenant.id,
        name: existingTenant.name,
        exists: true,
        direct_db: true
      });
    }
    
    // If we get here, we need to create a new tenant
    
    // Proceed with tenant creation only if forceCreate is true or tenant doesn't exist
    if (!forceCreate) {
      logger.info('Tenant does not exist and forceCreate=false');
      
      return NextResponse.json({
        success: false,
        message: 'Tenant does not exist and forceCreate=false',
        tenantId,
        exists: false,
        direct_db: true
      });
    }
    
    // Generate schema name based on tenant ID to ensure consistency
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Get a client from the pool for transaction
    client = await pool.connect();
    
    // Create the tenant record
    const result = await client.query(`
      INSERT INTO custom_auth_tenant (
        id, tenant_id, name, schema_name, owner_id, created_at, updated_at, 
        rls_enabled, rls_setup_date, is_active
      )
      VALUES (
        $1, $1, 'Default Tenant', $2, $3, NOW(), NOW(), 
        TRUE, NOW(), TRUE
      )
      ON CONFLICT (id) DO UPDATE 
      SET updated_at = NOW(), rls_enabled = TRUE
      RETURNING id, name, schema_name;
    `, [tenantId, schemaName, userId || 'system']);
    
    logger.info(`Created or updated tenant: ${tenantId}`);
    
    // Set the tenant context for the database session
    await client.query(`SET app.current_tenant_id = $1;`, [tenantId]);
    
    // Success response
    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      message: 'Tenant initialized successfully via tenant manager',
      direct_db: true
    });
    
  } catch (error) {
    logger.error('Error in tenant init:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message,
      direct_db: true
    }, { status: 500 });
    
  } finally {
    // Release client connection if we have one
    if (client) {
      try {
        client.release();
        logger.info('Released database client connection');
      } catch (e) {
        logger.error('Error releasing client connection:', e);
      }
    }
    
    // NOTE: We no longer call pool.end() here to avoid closing the global pool
  }
}

// Add a simple GET handler for minimal dependency tenant init 
export async function GET(request) {
  try {
    // Get tenant ID from cookies
    let tenantId = null;
    try {
      const cookieStore = await cookies();
      const businessIdCookie = cookieStore.get('businessid');
      const tenantIdCookie = cookieStore.get('tenantId');
      
      tenantId = businessIdCookie?.value || tenantIdCookie?.value;
      
      logger.info('Checked cookies for tenant ID:', { 
        businessIdCookie: businessIdCookie?.value ? 'found' : 'missing',
        tenantIdCookie: tenantIdCookie?.value ? 'found' : 'missing',
        tenantId
      });
    } catch (cookieError) {
      logger.warn('Error accessing cookies:', cookieError.message);
    }
    
    // If no tenant ID found, generate a new one as fallback
    if (!tenantId || !validateTenantIdFormat(tenantId)) {
      tenantId = uuidv4();
      logger.info('Generated new tenant ID:', tenantId);
      
      // Store in cookies
      try {
        const cookieStore = await cookies();
        await cookieStore.set('tenantId', tenantId, {
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
        await cookieStore.set('businessid', tenantId, {
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
      } catch (cookieSetError) {
        logger.error('Error setting cookies:', cookieSetError);
      }
    }
    
    // Return the tenant ID without database verification
    // This is a lightweight fallback that doesn't require DB access
    return NextResponse.json({
      success: true,
      tenantId,
      isVerified: false,
      message: 'Minimal tenant initialization complete'
    });
  } catch (error) {
    logger.error('Error in minimal tenant init:', error);
    
    // Generate emergency fallback tenant ID
    const fallbackTenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    // Return fallback response with proper headers
    return new NextResponse(
      JSON.stringify({
        success: true,
        tenantId: fallbackTenantId,
        isVerified: false,
        isFallback: true,
        message: 'Using emergency fallback tenant ID due to error'
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 