'use server';

import { NextResponse } from 'next/server';
import { extractTenantId } from '@/utils/auth/tenant';
import * as db from '@/utils/db/rls-database';

export async function GET(request) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  
  try {
    // Extract tenant info
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId || 
      request.nextUrl.searchParams.get('tenantId');
    
    if (!finalTenantId) {
      return NextResponse.json({
        error: 'No tenant ID found',
        message: 'Please provide a tenant ID in the request',
        tenantInfo
      }, { status: 400 });
    }
    
    console.log(`[${requestId}] Initializing RLS for tenant: ${finalTenantId}`);
    
    // Initialize RLS and create the tables
    await db.initializeRLS({
      debug: true,
      requestId
    });
    
    // Create a test product for the tenant to verify RLS is working
    const client = await db.getClient();
    
    try {
      // Set the tenant context for RLS
      await db.setTenantContext(client, finalTenantId, { debug: true, requestId });
      
      // Start a transaction
      await client.query('BEGIN');
      
      // Insert a test product for this tenant
      const insertQuery = `
        INSERT INTO public.inventory_product (
          id, tenant_id, name, description, price, cost, stock_quantity, 
          reorder_level, for_sale, for_rent, created_at, updated_at, is_active
        ) VALUES (
          gen_random_uuid(), $1, 'Test Product', 'Created with RLS', 19.99, 
          9.99, 100, 10, true, false, NOW(), NOW(), true
        ) ON CONFLICT DO NOTHING
        RETURNING id, name, tenant_id
      `;
      
      const result = await client.query(insertQuery, [finalTenantId]);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      console.log(`[${requestId}] Test product created for tenant: ${finalTenantId}`);
      
      // Check that RLS is working by verifying we can only see this tenant's products
      const verifyQuery = `
        SELECT id, name, tenant_id FROM public.inventory_product
      `;
      
      const verifyResult = await client.query(verifyQuery);
      
      console.log(`[${requestId}] Retrieved ${verifyResult.rowCount} products for tenant: ${finalTenantId}`);
      
      // Verify that all returned products have the correct tenant ID
      const validRLS = verifyResult.rows.every(row => row.tenant_id === finalTenantId);
      
      // Check current tenant setting in DB
      const settingQuery = `SELECT current_setting('app.current_tenant_id', true) as current_tenant`;
      const settingResult = await client.query(settingQuery);
      const currentTenant = settingResult.rows[0]?.current_tenant;
      
      return NextResponse.json({
        message: 'RLS initialized successfully',
        tenantId: finalTenantId,
        rlsVerified: validRLS,
        testProductCreated: result.rowCount > 0,
        visibleProducts: verifyResult.rowCount,
        currentTenant,
        tables: [
          'public.inventory_product',
          'public.sales_product'
        ]
      });
      
    } catch (error) {
      // Rollback any transaction on error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(`[${requestId}] Error during rollback:`, rollbackError);
      }
      
      console.error(`[${requestId}] Error during test product creation:`, error);
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error in initialize-rls API:`, error);
    
    return NextResponse.json({
      error: 'Failed to initialize RLS',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 