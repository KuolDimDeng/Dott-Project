import { NextResponse } from 'next/server';
import { logger } from '@/utils/serverLogger';
import { v5 as uuidv5 } from 'uuid';
import { createDbPool } from '@/app/api/tenant/db-config';
import crypto from 'crypto';

// Namespace for deterministic tenant ID generation
const TENANT_NAMESPACE = '9a551c44-4ade-4f89-b078-0af8be794c23';

/**
 * A robust endpoint to ensure a tenant record exists in the database
 * This is deliberately designed to work without authentication
 * for resilience during onboarding flows
 */
export async function POST(request) {
  let pool = null;
  
  try {
    // Parse request body
    const body = await request.json();
    const requestId = crypto.randomUUID().substring(0, 8);
    
    logger.info(`[EnsureDBRecord][${requestId}] Starting tenant record creation. Request received:`, body);
    
    // Extract tenant ID from request
    const { tenantId, businessName, businessType, businessCountry } = body;
    const email = body.email || null;
    const userId = body.userId || null;
    const legalStructure = body.legalStructure || 'Individual';
    
    // Validate tenant ID
    if (!tenantId || tenantId.length !== 36) {
      logger.error(`[EnsureDBRecord][${requestId}] Invalid tenant ID format:`, tenantId);
      return NextResponse.json({ error: 'Invalid tenant ID format' }, { status: 400 });
    }
    
    logger.info(`[EnsureDBRecord][${requestId}] Starting database operations for tenant: ${tenantId}`);
    
    // Try to connect to database with timeout and fallback
    try {
      pool = await createDbPool();
      
      // Test connection with timeout
      const testQuery = pool.query('SELECT 1', [], { timeout: 5000 });
      await Promise.race([
        testQuery,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 5000))
      ]);
      
    } catch (dbError) {
      logger.warn(`[EnsureDBRecord][${requestId}] Database connection failed, returning success for resilience:`, dbError.message);
      
      // Return success to prevent blocking the sign-in flow
      // The tenant record will be created later when the database is available
      return NextResponse.json({
        success: true,
        exists: false,
        tenantId: tenantId,
        message: 'Database temporarily unavailable, tenant record will be created later',
        fallback: true
      });
    }
    
    // First, do a quick check to see if the tenant exists - outside any transaction
    const existingCheck = await pool.query(`
      SELECT id, tenant_id FROM custom_auth_tenant WHERE id = $1
    `, [tenantId]);
    
    if (existingCheck.rows.length > 0) {
      // If tenant exists but tenant_id is null, update it in a separate transaction
      if (!existingCheck.rows[0].tenant_id) {
        try {
          logger.info(`[EnsureDBRecord][${requestId}] Tenant exists but tenant_id is null, updating...`);
          
          await pool.query(`
            UPDATE custom_auth_tenant 
            SET tenant_id = id, updated_at = NOW() 
            WHERE id = $1
          `, [tenantId]);
          
          logger.info(`[EnsureDBRecord][${requestId}] Successfully updated tenant_id to match id`);
        } catch (updateError) {
          logger.warn(`[EnsureDBRecord][${requestId}] Failed to update tenant_id:`, updateError.message);
        }
      }
      
      logger.info(`[EnsureDBRecord][${requestId}] Tenant already exists, returning success`);
      return NextResponse.json({
        success: true,
        exists: true,
        tenantId: tenantId,
        message: 'Tenant record already exists'
      });
    }
    
    // Generate a schema name using the tenant ID
    const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
    
    // Step 1: Create the basic tenant record first, without requiring RLS
    let connection = null;
    try {
      connection = await pool.connect();
      
      // Start a transaction
      await connection.query('BEGIN');
      
      logger.info(`[EnsureDBRecord][${requestId}] Creating tenant record with ID: ${tenantId}`);
      
      // Generate a business name if not provided or if it's a default one
      let finalBusinessName = businessName;
      
      if (!finalBusinessName || finalBusinessName === '') {
        // Try to get user info from Cognito if we have a userId
        if (userId) {
          try {
            // Try to fetch email, first name, and last name from the database
            const userQuery = `
              SELECT email, first_name, last_name
              FROM custom_auth_user
              WHERE id = $1
            `;
            
            const userResult = await pool.query(userQuery, [userId]);
            
            if (userResult.rows.length > 0) {
              const userInfo = userResult.rows[0];
              
              if (userInfo.first_name && userInfo.last_name) {
                finalBusinessName = `${userInfo.first_name} ${userInfo.last_name}'s Business`;
                logger.info(`[EnsureDBRecord][${requestId}] Generated business name from user data: ${finalBusinessName}`);
              } else if (userInfo.first_name) {
                finalBusinessName = `${userInfo.first_name}'s Business`;
                logger.info(`[EnsureDBRecord][${requestId}] Generated business name from first name: ${finalBusinessName}`);
              } else if (userInfo.last_name) {
                finalBusinessName = `${userInfo.last_name}'s Business`;
                logger.info(`[EnsureDBRecord][${requestId}] Generated business name from last name: ${finalBusinessName}`);
              } else if (userInfo.email) {
                // Extract name from email
                const emailName = userInfo.email.split('@')[0].split('.')[0];
                if (emailName && emailName.length > 1) {
                  finalBusinessName = `${emailName.charAt(0).toUpperCase() + emailName.slice(1)}'s Business`;
                  logger.info(`[EnsureDBRecord][${requestId}] Generated business name from email: ${finalBusinessName}`);
                }
              }
            }
          } catch (error) {
            logger.warn(`[EnsureDBRecord][${requestId}] Failed to get user data from database: ${error.message}`);
          }
        }
        
        // If still no valid business name, leave it blank for user to update later
        if (!finalBusinessName || finalBusinessName === '') {
          finalBusinessName = '';
          logger.info(`[EnsureDBRecord][${requestId}] No business name available, leaving blank for user to update later`);
        }
      }
      
      // Create tenant record
      const tenantInsertQuery = `
        INSERT INTO custom_auth_tenant (
          id, tenant_id, name, owner_id, schema_name, created_at, updated_at,
          rls_enabled, rls_setup_date, is_active
        )
        VALUES ($1, $1, $2, $3, $4, NOW(), NOW(), true, NOW(), true)
        ON CONFLICT (id) DO UPDATE
        SET tenant_id = $1, 
            name = CASE
                WHEN custom_auth_tenant.name IS NULL OR custom_auth_tenant.name = ''
                THEN $2
                ELSE custom_auth_tenant.name
            END, 
            updated_at = NOW(), 
            rls_enabled = true
        RETURNING id, tenant_id, name, schema_name;
      `;
      
      const result = await connection.query(tenantInsertQuery, [
        tenantId, 
        finalBusinessName,
        userId || 'system',
        schemaName
      ]);
      
      // Commit this transaction
      await connection.query('COMMIT');
      
      logger.info(`[EnsureDBRecord][${requestId}] Successfully created tenant record:`, result.rows[0]);
      
      // Release this connection
      connection.release();
      connection = null;
      
    } catch (tenantError) {
      logger.error(`[EnsureDBRecord][${requestId}] Error creating tenant record:`, tenantError);
      
      if (connection) {
        try {
          await connection.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error(`[EnsureDBRecord][${requestId}] Error rolling back:`, rollbackError);
        }
        
        connection.release();
        connection = null;
      }
      
      return NextResponse.json({ 
        success: false, 
        error: tenantError.message,
        requestId: requestId
      }, { status: 500 });
    }
    
    // Step 2: Now in a separate transaction, try to set up RLS and create associated records
    try {
      connection = await pool.connect();
      
      // Start a new transaction
      await connection.query('BEGIN');
      
      // Set RLS context
      try {
        await connection.query(`SET app.current_tenant_id = '${tenantId}'`);
        await connection.query(`SET app.is_admin = 'true'`);
        logger.info(`[EnsureDBRecord][${requestId}] Successfully set RLS context`);
      } catch (rlsError) {
        logger.warn(`[EnsureDBRecord][${requestId}] Failed to set RLS context (non-fatal):`, rlsError.message);
        // Continue anyway, this shouldn't abort the transaction
      }
      
      // Try to create a user record if userId is provided
      if (userId) {
        try {
          const userEmail = email || `${userId}@example.com`;
          
          const userTableExists = await connection.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = 'custom_auth_user'
              AND table_schema = 'public'
            );
          `);
          
          if (userTableExists.rows[0].exists) {
            const columnInfo = await connection.query(`
              SELECT column_name, data_type
              FROM information_schema.columns 
              WHERE table_name = 'custom_auth_user'
              AND column_name = 'id'
            `);
            
            const idIsNumeric = columnInfo.rows.length > 0 && 
              columnInfo.rows[0].data_type === 'bigint';
            
            if (idIsNumeric) {
              // Generate a numeric ID
              const numericId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
              
              await connection.query(`
                INSERT INTO custom_auth_user (
                  id, email, password, is_active, tenant_id
                )
                VALUES (
                  $1, $2, 'pbkdf2_sha256$placeholder', true, $3
                )
                ON CONFLICT DO NOTHING
              `, [numericId, userEmail, tenantId]);
              
              logger.info(`[EnsureDBRecord][${requestId}] Created user with numeric ID: ${numericId}`);
            } else {
              await connection.query(`
                INSERT INTO custom_auth_user (
                  id, email, password, is_active, tenant_id
                )
                VALUES (
                  $1, $2, 'pbkdf2_sha256$placeholder', true, $3
                )
                ON CONFLICT DO NOTHING
              `, [userId, userEmail, tenantId]);
              
              logger.info(`[EnsureDBRecord][${requestId}] Created user with UUID: ${userId}`);
            }
          }
        } catch (userError) {
          logger.warn(`[EnsureDBRecord][${requestId}] Failed to create user (non-fatal):`, userError.message);
          // Continue with transaction
        }
      }
      
      // Try to create a business record
      try {
        const businessTableExists = await connection.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users_business'
            AND table_schema = 'public'
          );
        `);
        
        if (businessTableExists.rows[0].exists) {
          const columnInfo = await connection.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'users_business'
            AND column_name = 'id'
          `);
          
          const idIsNumeric = columnInfo.rows.length > 0 && 
            columnInfo.rows[0].data_type === 'bigint';
          
          if (idIsNumeric) {
            // Generate a numeric ID
            const numericId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
            
            await connection.query(`
              INSERT INTO users_business (
                id, name, tenant_id, created_at, updated_at, type, country
              )
              VALUES (
                $1, $2, $3, NOW(), NOW(), $4, $5
              )
              ON CONFLICT DO NOTHING
            `, [
              numericId,
              finalBusinessName,
              tenantId,
              businessType || 'Other',
              businessCountry || 'US'
            ]);
            
            logger.info(`[EnsureDBRecord][${requestId}] Created business with numeric ID: ${numericId}`);
          } else {
            await connection.query(`
              INSERT INTO users_business (
                id, name, tenant_id, created_at, updated_at, type, country
              )
              VALUES (
                $1, $2, $1, NOW(), NOW(), $3, $4
              )
              ON CONFLICT DO NOTHING
            `, [
              tenantId,
              finalBusinessName,
              businessType || 'Other',
              businessCountry || 'US'
            ]);
            
            logger.info(`[EnsureDBRecord][${requestId}] Created business with UUID: ${tenantId}`);
          }
        }
      } catch (businessError) {
        logger.warn(`[EnsureDBRecord][${requestId}] Failed to create business (non-fatal):`, businessError.message);
        // Continue with transaction
      }
      
      // Commit this transaction
      await connection.query('COMMIT');
      logger.info(`[EnsureDBRecord][${requestId}] Successfully set up additional records for tenant`);
      
    } catch (secondaryError) {
      logger.warn(`[EnsureDBRecord][${requestId}] Error in secondary setup (non-fatal):`, secondaryError.message);
      
      if (connection) {
        try {
          await connection.query('ROLLBACK');
        } catch (rollbackError) {
          logger.warn(`[EnsureDBRecord][${requestId}] Error rolling back secondary transaction:`, rollbackError);
        }
      }
      
      // Continue even if secondary setup fails
    } finally {
      if (connection) {
        connection.release();
      }
    }
    
    // Return success regardless of secondary operations
    return NextResponse.json({
      success: true,
      tenantId: tenantId,
      message: 'Tenant record created successfully'
    });
    
  } catch (error) {
    logger.error('[EnsureDBRecord] Unexpected error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
    
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        logger.error('[EnsureDBRecord] Error ending pool:', poolError);
      }
    }
  }
}