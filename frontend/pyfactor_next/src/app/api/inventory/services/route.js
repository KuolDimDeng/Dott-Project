import { NextResponse } from 'next/server';
import { getPool } from '@/utils/dbConnect';
import logger from '@/utils/logger';
import { getTenantId } from '@/utils/tenantUtils';
import { getAuth } from '@/lib/auth';

/**
 * GET handler for fetching all services
 */
export async function GET(request) {
  const pool = await getPool();
  const requestId = Math.floor(Math.random() * 10000);

  try {
    logger.info(`[Services][${requestId}] GET request received`);
    
    // Get tenant ID either from auth context, query parameters, or cookies
    let tenantId = await getTenantId();
    
    // Check if table exists first
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'services'
      );
    `;
    
    const tableExistsResult = await pool.query(tableExistsQuery);
    
    if (!tableExistsResult.rows[0].exists) {
      logger.warn(`[Services][${requestId}] Services table doesn't exist, creating it`);
      
      // Create the services table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.services (
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
      
      await pool.query(createTableQuery);
      
      // Return empty array since the table was just created
      logger.info(`[Services][${requestId}] Table created, returning empty list`);
      return NextResponse.json([]);
    }
    
    // Get all services for the tenant
    const query = `
      SELECT * FROM services 
      ${tenantId ? 'WHERE tenant_id = $1' : ''}
      ORDER BY created_at DESC;
    `;
    
    const params = tenantId ? [tenantId] : [];
    const result = await pool.query(query, params);
    
    logger.info(`[Services][${requestId}] Returning ${result.rows.length} services`);
    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error(`[Services][${requestId}] Error fetching services: ${error.message}`, error);
    return NextResponse.json(
      { error: 'Failed to fetch services', message: error.message },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * POST handler for creating a new service
 */
export async function POST(request) {
  const pool = await getPool();
  const requestId = Math.floor(Math.random() * 10000);
  
  try {
    logger.info(`[Services][${requestId}] POST request received`);
    
    // Get request body
    const body = await request.json();
    
    // Get tenant ID from auth context
    const tenantId = await getTenantId();
    
    // Insert new service
    const query = `
      INSERT INTO services (
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
    
    const result = await pool.query(query, values);
    
    logger.info(`[Services][${requestId}] Service created with ID: ${result.rows[0].id}`);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error(`[Services][${requestId}] Error creating service: ${error.message}`, error);
    return NextResponse.json(
      { error: 'Failed to create service', message: error.message },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
} 