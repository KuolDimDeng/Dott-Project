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
      'SELECT id, name FROM custom_auth_tenant WHERE id = $1',
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
          exists: true,
          duration: Date.now() - startTime
        });
      }
      
      // If forceCreate is true, continue to update the tenant
      serverLogger.info(`Updating existing tenant due to forceCreate flag: ${tenantId}`);
    }
    
    // Create or update tenant record - now we don't include schema_name
    
    // Generate a business name if not provided
    let finalBusinessName = businessName;
    
    if (!finalBusinessName || finalBusinessName === '') {
      // Try to get user info from Cognito if we have a userId
      if (userId) {
        try {
          // Import AWS SDK
          const { CognitoIdentityProviderClient, AdminGetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
          
          // Get Cognito credentials from environment variables
          const client = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
          });
          
          // Try to get user attributes from Cognito
          const command = new AdminGetUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: userId
          });
          
          const cognitoUser = await client.send(command);
          
          // Extract business name from user attributes
          if (cognitoUser.UserAttributes) {
            for (const attr of cognitoUser.UserAttributes) {
              if (attr.Name === 'custom:businessname' && attr.Value && attr.Value !== '') {
                finalBusinessName = attr.Value;
                serverLogger.info(`Using business name from Cognito: ${finalBusinessName}`);
                break;
              }
            }
            
            // If still no business name, try to create one from user attributes
            if (!finalBusinessName || finalBusinessName === '') {
              let firstName = '';
              let lastName = '';
              let email = '';
              
              for (const attr of cognitoUser.UserAttributes) {
                if (attr.Name === 'given_name' || attr.Name === 'name') {
                  firstName = attr.Value;
                } else if (attr.Name === 'family_name') {
                  lastName = attr.Value;
                } else if (attr.Name === 'email') {
                  email = attr.Value;
                }
              }
              
              if (firstName && lastName) {
                finalBusinessName = `${firstName} ${lastName}'s Business`;
              } else if (firstName) {
                finalBusinessName = `${firstName}'s Business`;
              } else if (lastName) {
                finalBusinessName = `${lastName}'s Business`;
              } else if (email) {
                // Extract name from email
                const emailName = email.split('@')[0].split('.')[0];
                if (emailName && emailName.length > 1) {
                  finalBusinessName = `${emailName.charAt(0).toUpperCase() + emailName.slice(1)}'s Business`;
                }
              }
              
              if (finalBusinessName && finalBusinessName !== '') {
                serverLogger.info(`Generated business name from user attributes: ${finalBusinessName}`);
              }
            }
          }
        } catch (error) {
          serverLogger.warn(`Failed to get user data from Cognito: ${error.message}`);
        }
      }
      
      // If still no business name, leave blank for user to complete later
      if (!finalBusinessName || finalBusinessName === '') {
        finalBusinessName = '';
        serverLogger.info('No business name available, leaving blank for user to update later');
      }
    }
    
    const result = await pool.query(
      `INSERT INTO custom_auth_tenant (id, name, owner_id, created_at, updated_at, rls_enabled, rls_setup_date, is_active)
       VALUES ($1, $2, $3, NOW(), NOW(), true, NOW(), true)
       ON CONFLICT (id) DO UPDATE 
       SET name = CASE
                  WHEN custom_auth_tenant.name IS NULL OR custom_auth_tenant.name = ''
                  THEN COALESCE($2, custom_auth_tenant.name)
                  ELSE custom_auth_tenant.name
                END, 
           updated_at = NOW(),
           owner_id = COALESCE($3, custom_auth_tenant.owner_id),
           rls_enabled = true
       RETURNING id, name, owner_id`,
      [tenantId, finalBusinessName, userId || null]
    );
    
    // No need to create schema - we're using RLS only now
    
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