'use server';

import { NextResponse } from 'next/server';
import { extractTenantId } from '@/utils/auth/tenant';
import * as db from '@/utils/db/rls-database';
import { logger } from '@/utils/logger';

/**
 * POST handler to initialize RLS tables and policies
 * Useful for ensuring database is ready before performing product operations
 */
export async function POST(request) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  try {
    logger.info(`[${requestId}] POST /api/inventory/initialize - Start initializing RLS`);
    
    // Extract tenant info
    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
    
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = 
      body.tenantId || 
      tenantInfo.tenantId || 
      tenantInfo.businessId || 
      tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request`);
      return NextResponse.json(
        { 
          error: 'Tenant ID is required', 
          message: 'No tenant ID found in request',
          sources: tenantInfo
        },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Initializing RLS for tenant: ${finalTenantId}`);
    
    // Initialize RLS policies and tables
    await db.initializeRLS({
      debug: true,
      requestId
    });
    
    // Verify RLS setup with a simple test query
    const client = await db.getClient();
    
    try {
      // Set tenant context
      await db.setTenantContext(client, finalTenantId, { debug: true, requestId });
      
      // Check that tables exist
      const tableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_product'
        ) as inventory_exists;
      `;
      
      const tableResult = await client.query(tableQuery);
      const inventoryExists = tableResult.rows[0]?.inventory_exists;
      
      // Check current tenant setting
      const settingQuery = `SELECT current_setting('app.current_tenant_id', true) as current_tenant`;
      const settingResult = await client.query(settingQuery);
      const currentTenant = settingResult.rows[0]?.current_tenant;
      
      logger.info(`[${requestId}] RLS initialization complete for tenant: ${finalTenantId}`);
      
      return NextResponse.json({
        success: true,
        message: 'RLS initialized successfully',
        tenantId: finalTenantId,
        inventoryTableExists: inventoryExists,
        currentTenant: currentTenant
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`[${requestId}] Error initializing RLS: ${error.message}`, error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to initialize RLS', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 