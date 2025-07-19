import { NextResponse } from 'next/server';

/**
 * Endpoint to sync a repaired tenant ID with the system 
 * - Updates cookies with the new tenant ID
 * - Ensures all systems use the same fixed UUID
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { originalId, repairedId } = body;
    
    if (!originalId || !repairedId) {
      return NextResponse.json(
        { error: 'Original and repaired tenant IDs are required' },
        { status: 400 }
      );
    }
    
    console.log(`[SyncTenantId] Syncing tenant ID: ${originalId} → ${repairedId}`);
    
    // Update tenant schema mapping in the database if needed
    try {
      // If we have database connection details, update the tenant schema mapping
      const { createDbPool } = require('../db-config');
      
      // Create a database pool with shared configuration
      console.log('[SyncTenantId] Updating tenant schema mapping in database');
      const pool = await createDbPool();
      
      try {
        // Check if original ID exists and update to repaired ID
        const checkQuery = `
          SELECT id, schema_name FROM custom_auth_tenant WHERE id = $1;
        `;
        
        const checkResult = await pool.query(checkQuery, [originalId]);
        
        if (checkResult.rows && checkResult.rows.length > 0) {
          // Existing tenant record found with the original ID
          console.log(`[SyncTenantId] Found tenant record for original ID: ${originalId}`);
          
          // Generate the repaired schema name
          const oldSchemaName = checkResult.rows[0].schema_name;
          const newSchemaName = `tenant_${repairedId.replace(/-/g, '_')}`;
          
          // Update the tenant record with the repaired ID and schema name
          const updateQuery = `
            UPDATE custom_auth_tenant 
            SET id = $1, schema_name = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, schema_name;
          `;
          
          const updateResult = await pool.query(updateQuery, [repairedId, newSchemaName, originalId]);
          
          if (updateResult.rows && updateResult.rows.length > 0) {
            console.log(`[SyncTenantId] Updated tenant record: ${originalId} → ${repairedId}`);
            
            // Try to rename the schema if it exists
            try {
              const renameSchemaQuery = `
                ALTER SCHEMA ${oldSchemaName} RENAME TO ${newSchemaName};
              `;
              
              await pool.query(renameSchemaQuery);
              console.log(`[SyncTenantId] Renamed schema: ${oldSchemaName} → ${newSchemaName}`);
            } catch (schemaError) {
              console.warn(`[SyncTenantId] Could not rename schema: ${schemaError.message}`);
              // Continue anyway - the schema might not exist yet
            }
          }
        } else {
          // No tenant record with original ID, check if repaired ID exists
          const checkRepairedQuery = `
            SELECT id, schema_name FROM custom_auth_tenant WHERE id = $1;
          `;
          
          const checkRepairedResult = await pool.query(checkRepairedQuery, [repairedId]);
          
          if (checkRepairedResult.rows && checkRepairedResult.rows.length > 0) {
            console.log(`[SyncTenantId] Tenant record already exists for repaired ID: ${repairedId}`);
          } else {
            // Neither original nor repaired ID exists, create a new record
            console.log(`[SyncTenantId] No tenant record found for either ID, creating new record`);
            
            // Generate schema name from the repaired ID
            const schemaName = `tenant_${repairedId.replace(/-/g, '_')}`;
            
            // Insert a new tenant record
            const insertQuery = `
              INSERT INTO custom_auth_tenant (id, name, schema_name, created_at, updated_at, rls_enabled, rls_setup_date)
              VALUES ($1, $2, $3, NOW(), NOW(), true, NOW())
              ON CONFLICT (id) DO NOTHING
              RETURNING id, name, schema_name, created_at, updated_at, rls_enabled, rls_setup_date;
            `;
            
            const insertResult = await pool.query(insertQuery, [repairedId, '', schemaName]);
            
            if (insertResult.rows && insertResult.rows.length > 0) {
              console.log(`[SyncTenantId] Created new tenant record for repaired ID: ${repairedId}`);
            }
          }
        }
      } finally {
        // Close the database pool
        await pool.end();
      }
    } catch (dbError) {
      console.error(`[SyncTenantId] Database error: ${dbError.message}`);
      // Continue anyway - cookie update is most important
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      tenantId: repairedId,
      message: `Successfully synced tenant ID: ${originalId} → ${repairedId}`
    });
    
    // Set cookies with the corrected tenant ID
    const cookieOptions = {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    };
    
    // Set the main tenantId cookie
    response.cookies.set('tenantId', repairedId, cookieOptions);
    
    // Set the businessid cookie as well (used by some parts of the system)
    response.cookies.set('businessid', repairedId, cookieOptions);
    
    return response;
  } catch (error) {
    console.error(`[SyncTenantId] Error: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to sync tenant ID', message: error.message },
      { status: 500 }
    );
  }
} 