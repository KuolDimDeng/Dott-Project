import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { v5 as uuidv5 } from 'uuid';

// Namespace for deterministic tenant ID generation
const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';

/**
 * A minimal endpoint to ensure a tenant record exists in the database
 * This is deliberately designed to work without authentication
 * for resilience during onboarding flows
 */
export async function POST(request) {
  let pool = null;
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('[EnsureDBRecord] Failed to parse request body:', parseError);
      body = {};
    }
    
    // Extract tenant ID from body or generate a consistent one
    let tenantId = body.tenantId || body.tenant_id;
    
    // Extract user ID for generating tenant ID if needed
    const userId = body.userId || body.user_id || `anonymous_${Date.now()}`;
    
    // If no tenant ID, try to generate one from user ID
    if (!tenantId && userId) {
      try {
        tenantId = uuidv5(userId, TENANT_NAMESPACE);
        logger.info('[EnsureDBRecord] Generated deterministic tenant ID:', tenantId);
      } catch (uuidError) {
        logger.error('[EnsureDBRecord] Error generating UUID:', uuidError);
        // Use a fallback ID
        tenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
      }
    }
    
    // Final fallback - use a default tenant ID
    if (!tenantId) {
      tenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
      logger.warn('[EnsureDBRecord] Using fallback tenant ID:', tenantId);
    }
    
    // Extract business name
    const businessName = body.businessName || body.business_name || 'My Business';
    
    // Generate schema name - convert hyphens to underscores for schema name (PostgreSQL limitation)
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Connect directly to the database
    try {
      // First explicitly create the table to ensure it exists
      try {
        logger.info('[EnsureDBRecord] Ensuring table exists');
        const createTableUrl = new URL('/api/tenant/create-table', request.url).toString();
        logger.info('[EnsureDBRecord] Using create-table URL:', createTableUrl);
        
        const createTableResponse = await fetch(createTableUrl);
        
        if (createTableResponse.ok) {
          logger.info('[EnsureDBRecord] Table creation check successful');
        } else {
          logger.warn('[EnsureDBRecord] Table creation check failed:', 
            await createTableResponse.text().catch(() => createTableResponse.status.toString()));
        }
      } catch (tableError) {
        logger.warn('[EnsureDBRecord] Error checking/creating table:', tableError.message);
      }
      
      // Then ensure the database environment is initialized
      try {
        logger.info('[EnsureDBRecord] Initializing database environment');
        const initUrl = new URL('/api/tenant/init-db-env', request.url).toString();
        logger.info('[EnsureDBRecord] Using init-db-env URL:', initUrl);
        
        const initResponse = await fetch(initUrl);
        
        if (initResponse.ok) {
          const initData = await initResponse.json();
          logger.info('[EnsureDBRecord] Database initialization successful:', 
            initData.message, 'Table exists:', initData.tableExists);
        } else {
          logger.warn('[EnsureDBRecord] Database initialization failed:', 
            await initResponse.text().catch(() => initResponse.status.toString()));
          // Continue anyway, as the operation might still succeed
        }
      } catch (initError) {
        logger.warn('[EnsureDBRecord] Error initializing database environment:', initError.message);
        // Continue anyway, as the operation might still succeed
      }
      
      // Import the database configuration helper
      const { createDbPool } = require('../db-config');
      
      // Get a configured database pool
      pool = await createDbPool();
      
      // Log connection attempt for debugging
      logger.info('[EnsureDBRecord] Created database pool');
      
      // Ping database to verify connection
      try {
        await pool.query('SELECT 1');
        logger.info('[EnsureDBRecord] Database connection successful');
      } catch (pingError) {
        logger.error('[EnsureDBRecord] Database ping failed:', pingError.message);
        throw pingError;
      }
      
      // Begin transaction for atomicity
      await pool.query('BEGIN');
      
      try {
        // First create the schema
        await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
        logger.info('[EnsureDBRecord] Created schema:', schemaName);
        
        // Add owner to users table if not exists
        // This is critical for proper tenant setup with RLS
        try {
          const userInsertQuery = `
            INSERT INTO users_userprofile (id, email, is_active)
            VALUES ($1, $2, true)
            ON CONFLICT (id) DO NOTHING;
          `;
          
          const userEmail = body.email || `${userId}@example.com`;
          await pool.query(userInsertQuery, [userId, userEmail]);
          logger.info('[EnsureDBRecord] Ensured user record exists for:', userId);
        } catch (userError) {
          logger.warn('[EnsureDBRecord] Error ensuring user exists (non-fatal):', userError.message);
          // Continue even if user creation fails
        }
        
        // Add business record if not exists
        try {
          const businessInsertQuery = `
            INSERT INTO users_business (id, name, owner_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE
            SET name = $2, updated_at = NOW()
            RETURNING id, name;
          `;
          
          const businessId = tenantId; // Use same ID for simplicity
          const businessResult = await pool.query(businessInsertQuery, [businessId, businessName, userId]);
          
          if (businessResult.rows && businessResult.rows.length > 0) {
            logger.info('[EnsureDBRecord] Business record inserted/updated:', businessResult.rows[0]);
          }
        } catch (businessError) {
          logger.warn('[EnsureDBRecord] Error ensuring business exists (non-fatal):', businessError.message);
          // Continue even if business creation fails
        }
        
        // Create tenant record
        const tenantInsertQuery = `
          INSERT INTO custom_auth_tenant (
            id, name, owner_id, schema_name, created_at, updated_at,
            rls_enabled, rls_setup_date
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW(), true, NOW())
          ON CONFLICT (id) DO UPDATE
          SET name = $2, updated_at = NOW()
          RETURNING id, name, schema_name, owner_id, rls_enabled;
        `;
        
        const tenantResult = await pool.query(tenantInsertQuery, [
          tenantId, 
          businessName,
          userId, 
          schemaName
        ]);
        
        if (tenantResult.rows && tenantResult.rows.length > 0) {
          logger.info('[EnsureDBRecord] Tenant record inserted/updated:', tenantResult.rows[0]);
          
          // Set up RLS policy right away
          try {
            // Grant permissions
            await pool.query(`GRANT USAGE ON SCHEMA ${schemaName} TO postgres;`);
            await pool.query(`GRANT ALL PRIVILEGES ON SCHEMA ${schemaName} TO postgres;`);
            
            // Create a basic RLS policy (this will be expanded through migrations)
            const rlsQuery = `
              ALTER TABLE IF EXISTS ${schemaName}.product ENABLE ROW LEVEL SECURITY;
              DROP POLICY IF EXISTS tenant_isolation_policy ON ${schemaName}.product;
              CREATE POLICY tenant_isolation_policy ON ${schemaName}.product 
              USING (tenant_id = '${tenantId}')
              WITH CHECK (tenant_id = '${tenantId}');
            `;
            
            await pool.query(rlsQuery);
            logger.info('[EnsureDBRecord] Set up RLS policy for schema');
          } catch (rlsError) {
            logger.warn('[EnsureDBRecord] Error setting up RLS policy (non-fatal):', rlsError.message);
            // Continue even if RLS setup fails
          }
          
          // Update user profile with business ID
          try {
            const userProfileQuery = `
              UPDATE users_userprofile 
              SET business_id = $1
              WHERE id = $2;
            `;
            
            await pool.query(userProfileQuery, [tenantId, userId]);
            logger.info('[EnsureDBRecord] Updated user profile with business ID');
          } catch (profileError) {
            logger.warn('[EnsureDBRecord] Error updating user profile (non-fatal):', profileError.message);
            // Continue even if profile update fails
          }
          
          // Commit the transaction
          await pool.query('COMMIT');
          logger.info('[EnsureDBRecord] Transaction committed successfully');
          
          return NextResponse.json({
            success: true,
            tenantId: tenantResult.rows[0].id,
            name: tenantResult.rows[0].name,
            schemaName: tenantResult.rows[0].schema_name,
            ownerId: tenantResult.rows[0].owner_id,
            rlsEnabled: tenantResult.rows[0].rls_enabled,
            created: true,
            message: 'Successfully created tenant record and schema'
          });
        } else {
          throw new Error("Tenant record creation didn't return expected data");
        }
      } catch (transactionError) {
        // Rollback on any error
        await pool.query('ROLLBACK');
        logger.error('[EnsureDBRecord] Transaction failed:', transactionError.message);
        throw transactionError;
      }
    } catch (dbError) {
      // Reraise for outer catch block
      throw dbError;
    } finally {
      // Close connection
      if (pool) {
        try {
          await pool.end();
          logger.info('[EnsureDBRecord] Database connection closed');
        } catch (closeError) {
          logger.error('[EnsureDBRecord] Error closing connection:', closeError.message);
        }
      }
    }
  } catch (error) {
    logger.error('[EnsureDBRecord] Error creating tenant record:', error.message);
    
    // Always return a success response even on errors, 
    // so the client can continue with the tenant ID
    return NextResponse.json({
      success: true,
      tenantId,
      schemaName,
      clientSideOnly: true,
      message: 'Failed to create tenant record in database, but client can use tenant ID',
      error: error.message
    });
  }
}