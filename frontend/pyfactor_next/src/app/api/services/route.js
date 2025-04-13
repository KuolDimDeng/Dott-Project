'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { extractTenantId } from '@/utils/auth/tenant';
import * as db from '@/utils/db/rls-database';

// Fix logger import and add fallback
const logger = {
  info: function(message, ...args) {
    console.log(message, ...args);
  },
  error: function(message, ...args) {
    console.error(message, ...args);
  },
  warn: function(message, ...args) {
    console.warn(message, ...args);
  }
};

/**
 * GET handler for service listing with tenant-aware RLS
 */
export async function GET(request) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    logger.info(`[${requestId}] GET /api/services - Start processing request`);
    
    // Extract tenant info from various sources
    const tenantInfo = await extractTenantId(request);
    const finalTenantId = tenantInfo.tenantId || tenantInfo.businessId || tenantInfo.tokenTenantId;
    
    if (!finalTenantId) {
      logger.error(`[${requestId}] No tenant ID found in request, headers:`, {
        'x-tenant-id': request.headers.get('x-tenant-id'),
        'x-business-id': request.headers.get('x-business-id'),
        referer: request.headers.get('referer'),
        cookie: request.headers.get('cookie')?.substring(0, 50) + '...' // Log partial cookie for debugging
      });
      
      return NextResponse.json(
        { 
          error: 'Tenant ID is required',
          message: 'No tenant ID found in request headers, cookies, or JWT',
          sources: tenantInfo
        },
        { status: 400 }
      );
    }
    
    logger.info(`[${requestId}] Fetching services for tenant ${finalTenantId}`);
    
    // Get search and filter parameters from URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Ensure tables and RLS policies exist
    try {
      await ensureInventoryServiceTable({
        debug: true,
        requestId
      });
    } catch (tableError) {
      logger.error(`[${requestId}] Error ensuring inventory_service table: ${tableError.message}`);
      return NextResponse.json(
        { 
          error: 'Database table initialization failed', 
          message: tableError.message 
        },
        { status: 500 }
      );
    }
    
    // Query services with RLS
    // Note: No need to filter by tenant_id in the query - RLS will handle that
    const query = `
      SELECT * FROM public.inventory_service
      WHERE ($1 = '' OR name ILIKE $2 OR description ILIKE $2)
      ORDER BY ${sortBy} ${sortDir === 'asc' ? 'ASC' : 'DESC'}
      LIMIT $3 OFFSET $4
    `;
    
    const params = [
      search,
      `%${search}%`,
      limit,
      offset
    ];
    
    // Execute the query with tenant context for RLS
    let result;
    try {
      result = await db.query(query, params, {
        signal: controller.signal,
        requestId,
        tenantId: finalTenantId,
        debug: true
      });
    } catch (dbError) {
      logger.error(`[${requestId}] Database error fetching services: ${dbError.message}`);
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: dbError.message,
          details: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        },
        { status: 500 }
      );
    }
    
    logger.info(`[${requestId}] Found ${result.rows.length} services for tenant ${finalTenantId}`);
    
    return NextResponse.json({
      data: result.rows,
      meta: {
        total: result.rows.length,
        limit,
        offset,
        tenant: finalTenantId.substring(0, 8) + '...' // Include partial tenant ID for debugging
      }
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error retrieving services: ${error.message}`, error);
    
    // If this is an abort error from the timeout
    if (error.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        message: 'Request timed out',
        error: 'Database request timed out after 15 seconds'
      }, { status: 504 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Error retrieving services',
      error: error.message
    }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST handler for creating a new service with tenant-aware RLS
 */
export async function POST(request) {
  const requestId = crypto.randomUUID();

  try {
    // Parse request body
    const requestData = await request.json();
    
    // Extract tenant info from various sources
    const tenantId = requestData.tenant_id || 
                    requestData.tenantId || 
                    request.headers.get('x-tenant-id') ||
                    request.headers.get('tenant-id') ||
                    request.headers.get('x-business-id');
    
    if (!tenantId) {
      logger.error(`[${requestId}] No tenant ID found in request headers or body`);
      return NextResponse.json({
        success: false,
        message: 'Tenant ID is required'
      }, { status: 400 });
    }
    
    logger.info(`[${requestId}] Creating service for tenant: ${tenantId}`);
    
    // Ensure inventory_service table exists with RLS
    await ensureInventoryServiceTable({
      debug: true,
      requestId
    });
    
    // Validate required service data
    const { name, service_name } = requestData;
    const finalName = name || service_name;
    
    if (!finalName) {
      return NextResponse.json({
        success: false,
        message: 'Service name is required'
      }, { status: 400 });
    }
    
    // Generate a UUID for the service
    const serviceId = uuidv4();
    
    // Insert the new service using RLS-aware query
    const query = `
      INSERT INTO public.inventory_service (
        id, 
        tenant_id, 
        name, 
        description, 
        service_code,
        price, 
        unit,
        is_for_sale,
        is_recurring,
        salestax,
        duration,
        billing_cycle,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const params = [
      serviceId,
      tenantId,
      finalName,
      requestData.description || '',
      requestData.service_code || `SRV-${Date.now()}`,
      parseFloat(requestData.price) || 0,
      requestData.unit || '',
      requestData.is_for_sale === true || requestData.isForSale === true,
      requestData.is_recurring === true || requestData.isRecurring === true,
      parseFloat(requestData.salestax) || 0,
      requestData.duration || '',
      requestData.billing_cycle || 'monthly'
    ];
    
    logger.info(`[${requestId}] Executing service insert with tenant context: ${tenantId}`);
    
    const result = await db.query(query, params, {
      requestId,
      tenantId, // Pass tenant ID for RLS context
      debug: true
    });
    
    const newService = result.rows[0];
    
    logger.info(`[${requestId}] Service created successfully: ${newService.id}`);
    
    return NextResponse.json({
      success: true,
      service: newService,
      message: 'Service created successfully'
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error creating service: ${error.message}`, error);
    
    return NextResponse.json({
      success: false,
      message: 'Error creating service',
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Helper function to ensure the inventory_service table exists
 */
async function ensureInventoryServiceTable({ debug = false, requestId = 'system' } = {}) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS public.inventory_service (
      id UUID PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      service_code VARCHAR(100),
      price DECIMAL(10, 2) DEFAULT 0,
      unit VARCHAR(100),
      is_for_sale BOOLEAN DEFAULT true,
      is_recurring BOOLEAN DEFAULT false,
      salestax DECIMAL(10, 2) DEFAULT 0,
      duration VARCHAR(100),
      billing_cycle VARCHAR(50) DEFAULT 'monthly',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create an RLS policy if it doesn't already exist
    ALTER TABLE public.inventory_service ENABLE ROW LEVEL SECURITY;

    -- Drop any existing policies
    DROP POLICY IF EXISTS inventory_service_tenant_isolation ON public.inventory_service;

    -- Create new policy
    CREATE POLICY inventory_service_tenant_isolation 
      ON public.inventory_service
      USING (tenant_id = current_setting('app.current_tenant_id')::VARCHAR);
  `;

  if (debug) {
    logger.info(`[${requestId}] Ensuring inventory_service table exists`);
  }

  try {
    await db.query(createTableQuery, [], { requestId });
    if (debug) {
      logger.info(`[${requestId}] inventory_service table initialized successfully`);
    }
  } catch (error) {
    logger.error(`[${requestId}] Error initializing inventory_service table: ${error.message}`);
    throw error;
  }
} 