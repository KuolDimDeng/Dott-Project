import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { logger } from '@/utils/serverLogger';
import { v5 as uuidv5 } from 'uuid';
import { v4 as uuidv4 } from 'uuid';
import { createServerLogger } from '@/utils/serverLogger';
import { getDbConfig } from '@/config/database';

// Namespace for deterministic tenant ID generation
const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';

// Create server logger
const serverLogger = createServerLogger('tenant-api');

// In-memory tenant cache to prevent redundant operations
// Key: tenantId, Value: {timestamp, tenant}
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Create a database connection pool with optimized settings
 * @returns {Promise<Object>} Pool for database connections
 */
const createDbPool = async () => {
  try {
    // Only import pg when needed to avoid serverless issues
    const { Pool } = await import('pg');
    
    // Get DB configuration
    const config = getDbConfig();
    
    // Create a pool with optimized connection settings matching config property names
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username || config.user, // Support both property names
      password: config.password,
      ssl: config.ssl,
      // Optimized settings for serverless
      max: 3, // Reduced connection count
      idleTimeoutMillis: 5000, // Reduced idle timeout
      connectionTimeoutMillis: 3000, // Faster connection timeout
      // Query timeout settings
      statement_timeout: 5000 // 5 second query timeout
    });
    
    // Test connection to verify it's working
    await pool.query('SELECT NOW()');
    serverLogger.info('Database connection successful');
    
    return pool;
  } catch (error) {
    serverLogger.error('Error creating database pool:', error);
    throw error;
  }
};

/**
 * Specialized endpoint to ensure a tenant record exists in the database
 * This focuses solely on the database record, not the schema
 */
export async function POST(request) {
  const startTime = Date.now();
  let pool = null;
  
  try {
    // Get authentication info (but don't fail if it's not available)
    let auth = { user: null, accessToken: null, idToken: null };
    try {
      auth = await getAuth();
    } catch (authError) {
      serverLogger.warn('[CreateTenantRecord] Auth error, proceeding with unauthenticated flow:', authError.message);
      // Continue without auth - we'll use body parameters instead
    }
    
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      serverLogger.warn('[CreateTenantRecord] Failed to parse request body:', parseError);
      body = {};
    }
    
    // Extract user ID either from auth or body or generate a placeholder
    const userId = auth.user?.id || body.userId || body.user_id || 
                  `anonymous_${Date.now()}`;
    
    // For flexibility, allow continuing even without a real user ID
    serverLogger.info('[CreateTenantRecord] Using user ID:', userId);
    
    // Extract tenant ID from all possible sources
    let tenantId = body.tenantId || body.tenant_id || auth.user?.tenantId;
    
    // Extract from authorization headers if present
    const authHeader = request.headers.get('authorization');
    if (!tenantId && authHeader) {
      try {
        // Try to extract tenant ID from JWT if it exists
        const token = authHeader.replace('Bearer ', '');
        const tokenData = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        );
        tenantId = tokenData['custom:businessid'] || tokenData.businessid;
        if (tenantId) {
          serverLogger.info('[CreateTenantRecord] Extracted tenant ID from token:', tenantId);
        }
      } catch (tokenError) {
        serverLogger.debug('[CreateTenantRecord] Could not extract tenant ID from token:', tokenError.message);
      }
    }
    
    // Check cookies for tenant ID as another source
    const cookies = request.cookies;
    if (!tenantId && cookies) {
      try {
        tenantId = cookies.get('tenantId')?.value || 
                 cookies.get('businessid')?.value || 
                 cookies.get('custom:businessid')?.value;
        
        if (tenantId) {
          serverLogger.info('[CreateTenantRecord] Found tenant ID in cookies:', tenantId);
        }
      } catch (cookieError) {
        serverLogger.debug('[CreateTenantRecord] Error reading cookies:', cookieError.message);
      }
    }
    
    // Generate deterministic tenant ID if we still don't have one
    if (!tenantId && userId) {
      try {
        tenantId = uuidv5(userId, TENANT_NAMESPACE);
        serverLogger.info('[CreateTenantRecord] Generated deterministic tenant ID:', tenantId);
      } catch (uuidError) {
        serverLogger.error('[CreateTenantRecord] Error generating UUID:', uuidError);
      }
    }
    
    // Use a deterministic or generated UUID if we still don't have a tenant ID
    if (!tenantId) {
      // Generate a new unique UUID instead of using a hardcoded value
      tenantId = uuidv4();
      serverLogger.warn('[CreateTenantRecord] Generated new tenant ID:', tenantId);
    }
    
    // Extract business name
    const businessName = body.businessName || auth.user?.businessName;
    
    // Format schema name with underscore replacement
    const schema_name = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Check tenant cache first to avoid database hit
    if (tenantCache.has(tenantId) && !body.forceCreate) {
      const cached = tenantCache.get(tenantId);
      if (cached.timestamp > Date.now() - CACHE_TTL) {
        serverLogger.info(`Using cached tenant: ${tenantId}`, {
          duration: Date.now() - startTime,
          source: 'cache'
        });
        return NextResponse.json({
          success: true,
          tenant_id: tenantId,
          schema_name,
          source: 'cache',
          cached: true,
          duration: Date.now() - startTime
        });
      } else {
        // Expired cache entry, remove it
        tenantCache.delete(tenantId);
      }
    }
    
    // Create database connection
    pool = await createDbPool();
    
    // Check if tenant already exists
    const existsResult = await pool.query(
      'SELECT id, name, schema_name FROM custom_auth_tenant WHERE id = $1',
      [tenantId]
    );
    
    // Flag to track whether tenant is new or existing
    let isExistingTenant = false;
    let tenant;
    
    // Check if tenant already exists
    if (existsResult.rows.length > 0) {
      isExistingTenant = true;
      tenant = existsResult.rows[0];
      
      // Update cache
      tenantCache.set(tenantId, {
        timestamp: Date.now(),
        tenant: tenant
      });
      
      serverLogger.info(`Tenant found in database: ${tenantId}`, {
        duration: Date.now() - startTime,
        source: 'database'
      });
      
      // If force create is false, return existing tenant without changes
      if (!body.forceCreate) {
        return NextResponse.json({
          success: true,
          tenant_id: tenant.id,
          name: tenant.name,
          schema_name: tenant.schema_name,
          exists: true,
          duration: Date.now() - startTime
        });
      }
      
      // If forceCreate is true, continue to update the tenant
      serverLogger.info(`Updating existing tenant due to forceCreate flag: ${tenantId}`);
    }
    
    // Create or update tenant record
    const result = await pool.query(
      `INSERT INTO custom_auth_tenant (id, name, owner_id, schema_name, created_at, updated_at, rls_enabled, is_active)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), true, true)
       ON CONFLICT (id) DO UPDATE 
       SET name = $2, 
           updated_at = NOW(),
           owner_id = COALESCE($3, custom_auth_tenant.owner_id)
       RETURNING id, name, schema_name, owner_id`,
      [tenantId, businessName || 'Default Business', userId || null, schema_name]
    );
    
    // Create the schema if it doesn't exist
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`);
    
    // Add to cache
    tenantCache.set(tenantId, {
      timestamp: Date.now(),
      tenant: result.rows[0]
    });
    
    // Log appropriately based on whether tenant was new or updated
    if (isExistingTenant) {
      serverLogger.info(`Tenant updated: ${tenantId}`, {
        duration: Date.now() - startTime,
        source: 'database'
      });
    } else {
      serverLogger.info(`Tenant created: ${tenantId}`, {
        duration: Date.now() - startTime,
        source: 'database'
      });
    }
    
    return NextResponse.json({
      success: true,
      tenant_id: result.rows[0].id,
      name: result.rows[0].name,
      schema_name: result.rows[0].schema_name,
      owner_id: result.rows[0].owner_id,
      created: true,
      duration: Date.now() - startTime
    });
  } catch (error) {
    serverLogger.error(`Error creating tenant: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }, { status: 500 });
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (closeError) {
        serverLogger.warn('Error closing database pool:', closeError);
      }
    }
  }
}