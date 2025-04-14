import { NextResponse } from 'next/server';
import { getPool } from '@/utils/dbConnect';
// import { serverLogger as logger } from '@/utils/logger';
import { getTenantId } from '@/utils/serverTenantUtils';
import { getAuth } from '@/lib/auth';

/**
 * GET handler for fetching all services
 */
export async function GET(request) {
  const pool = await getPool();
  const requestId = Math.floor(Math.random() * 10000);
  let client = null;
  
  try {
    console.info(`[Services][${requestId}] GET request received`);
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Get tenant ID either from auth context, query parameters, or cookies
    let tenantId = null;
    try {
      tenantId = await getTenantId(request);
      console.info(`[Services][${requestId}] Using tenant ID: ${tenantId || 'none'}`);
    } catch (tenantError) {
      console.warn(`[Services][${requestId}] Error getting tenant ID: ${tenantError.message}`);
    }
    
    // Check if table exists first
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_service'
      );
    `;
    
    const tableExistsResult = await client.query(tableExistsQuery);
    
    if (!tableExistsResult.rows[0].exists) {
      console.warn(`[Services][${requestId}] inventory_service table doesn't exist, creating it`);
      
      // Create the services table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.inventory_service (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) DEFAULT 0,
          is_for_sale BOOLEAN DEFAULT TRUE,
          is_recurring BOOLEAN DEFAULT FALSE,
          salestax DECIMAL(10, 2) DEFAULT 0,
          duration VARCHAR(100),
          billing_cycle VARCHAR(50) DEFAULT 'monthly',
          unit VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          tenant_id UUID,
          created_by VARCHAR(255),
          updated_by VARCHAR(255)
        );
      `;
      
      await client.query(createTableQuery);
      
      // Return empty array since the table was just created
      console.info(`[Services][${requestId}] Table created, returning empty list`);
      return NextResponse.json([]);
    }
    
    // Get all services for the tenant
    const query = `
      SELECT * FROM inventory_service 
      ${tenantId ? 'WHERE tenant_id = $1' : ''}
      ORDER BY created_at DESC;
    `;
    
    const params = tenantId ? [tenantId] : [];
    console.info(`[Services][${requestId}] Executing query with tenant filter: ${tenantId ? 'Yes' : 'No'}`);
    
    const result = await client.query(query, params);
    
    console.info(`[Services][${requestId}] Returning ${result.rows.length} services`);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(`[Services][${requestId}] Error fetching services: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to fetch services', message: error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * POST handler for creating a new service
 */
export async function POST(request) {
  const pool = await getPool();
  const requestId = Math.floor(Math.random() * 10000);
  let client = null;
  
  try {
    console.info(`[Services][${requestId}] POST request received`);
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Get request body
    const body = await request.json();
    
    // Get tenant ID from auth context
    let tenantId = null;
    try {
      tenantId = await getTenantId(request);
      
      if (!tenantId) {
        // Try to get from request body as fallback
        tenantId = body.tenant_id || body.tenantId;
      }
      
      console.info(`[Services][${requestId}] Using tenant ID: ${tenantId || 'none'}`);
      
      if (!tenantId) {
        console.warn(`[Services][${requestId}] No tenant ID available, service will be created without tenant association`);
      }
    } catch (tenantError) {
      console.warn(`[Services][${requestId}] Error getting tenant ID: ${tenantError.message}`);
    }
    
    // Check if table exists first
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'inventory_service'
      );
    `;
    
    const tableExistsResult = await client.query(tableExistsQuery);
    
    if (!tableExistsResult.rows[0].exists) {
      console.warn(`[Services][${requestId}] inventory_service table doesn't exist, creating it`);
      
      // Create the services table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.inventory_service (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) DEFAULT 0,
          is_for_sale BOOLEAN DEFAULT TRUE,
          is_recurring BOOLEAN DEFAULT FALSE,
          salestax DECIMAL(10, 2) DEFAULT 0,
          duration VARCHAR(100),
          billing_cycle VARCHAR(50) DEFAULT 'monthly',
          unit VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          tenant_id UUID,
          created_by VARCHAR(255),
          updated_by VARCHAR(255)
        );
      `;
      
      await client.query(createTableQuery);
      console.info(`[Services][${requestId}] Table created successfully`);
    }
    
    // Insert new service
    const query = `
      INSERT INTO inventory_service (
        name, description, price, is_for_sale, is_recurring, 
        salestax, duration, billing_cycle, unit, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    
    const values = [
      body.name,
      body.description,
      body.price || 0,
      body.is_for_sale !== undefined ? body.is_for_sale : true,
      body.is_recurring !== undefined ? body.is_recurring : false,
      body.salestax || 0,
      body.duration || '',
      body.billing_cycle || 'monthly',
      body.unit || '',
      tenantId
    ];
    
    const result = await client.query(query, values);
    
    console.info(`[Services][${requestId}] Service created with ID: ${result.rows[0].id}`);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(`[Services][${requestId}] Error creating service: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to create service', message: error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
} 