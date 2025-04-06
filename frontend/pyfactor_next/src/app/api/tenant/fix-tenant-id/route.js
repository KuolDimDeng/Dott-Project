import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';

/**
 * Endpoint to fix tenant ID issues
 * This finds or creates a valid tenant ID and updates the client state
 */
export async function POST(request) {
  let pool = null;
  
  try {
    // Get current tenant ID from request
    const body = await request.json();
    let { currentTenantId } = body;
    
    console.log(`[fix-tenant-id] Request received with current ID: ${currentTenantId}`);
    
    // Connect to database
    pool = await createDbPool();
    
    // If current tenant ID is invalid, try to find or create a valid one
    let validTenantId = null;
    let createdNewId = false;
    
    // First check if the current tenant ID is valid
    if (currentTenantId && currentTenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      validTenantId = currentTenantId;
      console.log(`[fix-tenant-id] Current tenant ID is valid: ${validTenantId}`);
    } else {
      // Try to find existing tenant records
      console.log('[fix-tenant-id] Looking for existing tenant records');
      
      try {
        // First check if there's a tenant_users table that might have the ID
        const userQuery = await pool.query(`
          SELECT tenant_id FROM public.tenant_users 
          LIMIT 1
        `).catch(() => ({ rows: [] }));
        
        if (userQuery.rows && userQuery.rows.length > 0 && userQuery.rows[0].tenant_id) {
          validTenantId = userQuery.rows[0].tenant_id;
          console.log(`[fix-tenant-id] Found tenant ID in tenant_users: ${validTenantId}`);
        }
        
        // If not found, try the tenants table
        if (!validTenantId) {
          const tenantQuery = await pool.query(`
            SELECT id FROM public.tenants 
            LIMIT 1
          `).catch(() => ({ rows: [] }));
          
          if (tenantQuery.rows && tenantQuery.rows.length > 0 && tenantQuery.rows[0].id) {
            validTenantId = tenantQuery.rows[0].id;
            console.log(`[fix-tenant-id] Found tenant ID in tenants table: ${validTenantId}`);
          }
        }
        
        // If still not found, check existing schemas
        if (!validTenantId) {
          const schemasQuery = await pool.query(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name LIKE 'tenant_%'
            ORDER BY schema_name
          `);
          
          if (schemasQuery.rows && schemasQuery.rows.length > 0) {
            // Extract tenant ID from schema name
            const schemaPrefix = 'tenant_';
            const schemaName = schemasQuery.rows[0].schema_name;
            
            if (schemaName.startsWith(schemaPrefix)) {
              const schemaId = schemaName.substring(schemaPrefix.length);
              validTenantId = schemaId.replace(/_/g, '-');
              console.log(`[fix-tenant-id] Extracted tenant ID from schema: ${validTenantId}`);
            }
          }
        }
      } catch (findError) {
        console.error('[fix-tenant-id] Error finding existing tenant ID:', findError);
      }
      
      // If no valid tenant ID found, create a new one
      if (!validTenantId) {
        // Generate a proper UUID
        const crypto = require('crypto');
        validTenantId = crypto.randomUUID();
        createdNewId = true;
        console.log(`[fix-tenant-id] Generated new tenant ID: ${validTenantId}`);
        
        // Create schema with this new ID
        const schemaName = `tenant_${validTenantId.replace(/-/g, '_')}`;
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        console.log(`[fix-tenant-id] Created schema for new tenant ID: ${schemaName}`);
      }
    }
    
    // Return the valid tenant ID
    return NextResponse.json({
      success: true,
      message: createdNewId ? 'Created new tenant ID' : 'Found valid tenant ID',
      tenantId: validTenantId,
      previousId: currentTenantId,
      corrected: currentTenantId !== validTenantId,
      created: createdNewId
    });
    
  } catch (error) {
    console.error('[fix-tenant-id] Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fix tenant ID',
      error: error.message
    }, { status: 500 });
  } finally {
    if (pool) await pool.end();
  }
} 