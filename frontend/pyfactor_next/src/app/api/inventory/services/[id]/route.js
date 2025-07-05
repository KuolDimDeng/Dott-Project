import { NextResponse } from 'next/server';
import { getPool } from '@/utils/dbConnect';
import { serverLogger as logger } from '@/utils/logger';
import { getTenantId } from '@/lib/tenantUtils';
import { isUUID } from '@/utils/uuid-helpers';

/**
 * GET handler for fetching a specific service by ID
 */
export async function GET(request, { params }) {
  const pool = await getPool();
  const requestId = Math.floor(Math.random() * 10000);
  const { id } = params;
  
  try {
    logger.info(`[Services][${requestId}] GET request received for service ID: ${id}`);
    
    // Validate ID format
    if (!isUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid service ID format' },
        { status: 400 }
      );
    }
    
    // Get tenant ID
    const tenantId = await getTenantId();
    
    // Get the service
    const query = `
      SELECT * FROM services WHERE id = $1 ${tenantId ? 'AND tenant_id = $2' : ''};
    `;
    
    const params = tenantId ? [id, tenantId] : [id];
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      logger.warn(`[Services][${requestId}] Service not found: ${id}`);
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    logger.info(`[Services][${requestId}] Returning service: ${id}`);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error(`[Services][${requestId}] Error fetching service: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to fetch service', message: error.message },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * PUT handler for updating a service
 */
export async function PUT(request, { params }) {
  const pool = await getPool();
  const requestId = Math.floor(Math.random() * 10000);
  const { id } = params;
  
  try {
    logger.info(`[Services][${requestId}] PUT request received for service ID: ${id}`);
    
    // Validate ID format
    if (!isUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid service ID format' },
        { status: 400 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Get tenant ID
    const tenantId = await getTenantId();
    
    // Check if service exists and belongs to the tenant
    const checkQuery = `
      SELECT * FROM services WHERE id = $1 ${tenantId ? 'AND tenant_id = $2' : ''};
    `;
    
    const checkParams = tenantId ? [id, tenantId] : [id];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      logger.warn(`[Services][${requestId}] Service not found or access denied: ${id}`);
      return NextResponse.json(
        { error: 'Service not found or access denied' },
        { status: 404 }
      );
    }
    
    // Update the service
    const updateQuery = `
      UPDATE services
      SET 
        name = $1,
        description = $2,
        price = $3,
        is_for_sale = $4,
        is_recurring = $5,
        salestax = $6,
        duration = $7,
        billing_cycle = $8,
        unit = $9,
        updated_at = NOW()
      WHERE id = $10 ${tenantId ? 'AND tenant_id = $11' : ''}
      RETURNING *;
    `;
    
    const updateValues = [
      body.name,
      body.description,
      body.price || 0,
      body.is_for_sale !== undefined ? body.is_for_sale : true,
      body.is_recurring !== undefined ? body.is_recurring : false,
      body.salestax || 0,
      body.duration || '',
      body.billing_cycle || 'monthly',
      body.unit || '',
      id,
      ...(tenantId ? [tenantId] : [])
    ];
    
    const updateResult = await pool.query(updateQuery, updateValues);
    
    logger.info(`[Services][${requestId}] Service updated: ${id}`);
    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    logger.error(`[Services][${requestId}] Error updating service: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to update service', message: error.message },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}

/**
 * DELETE handler for deleting a service
 */
export async function DELETE(request, { params }) {
  const pool = await getPool();
  const requestId = Math.floor(Math.random() * 10000);
  const { id } = params;
  
  try {
    logger.info(`[Services][${requestId}] DELETE request received for service ID: ${id}`);
    
    // Validate ID format
    if (!isUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid service ID format' },
        { status: 400 }
      );
    }
    
    // Get tenant ID
    const tenantId = await getTenantId();
    
    // Check if service exists and belongs to the tenant
    const checkQuery = `
      SELECT * FROM services WHERE id = $1 ${tenantId ? 'AND tenant_id = $2' : ''};
    `;
    
    const checkParams = tenantId ? [id, tenantId] : [id];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      logger.warn(`[Services][${requestId}] Service not found or access denied: ${id}`);
      return NextResponse.json(
        { error: 'Service not found or access denied' },
        { status: 404 }
      );
    }
    
    // Delete the service
    const deleteQuery = `
      DELETE FROM services WHERE id = $1 ${tenantId ? 'AND tenant_id = $2' : ''}
      RETURNING id;
    `;
    
    const deleteParams = tenantId ? [id, tenantId] : [id];
    const deleteResult = await pool.query(deleteQuery, deleteParams);
    
    logger.info(`[Services][${requestId}] Service deleted: ${id}`);
    return NextResponse.json({ 
      id: deleteResult.rows[0].id,
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    logger.error(`[Services][${requestId}] Error deleting service: ${error.message}`);
    return NextResponse.json(
      { error: 'Failed to delete service', message: error.message },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
} 