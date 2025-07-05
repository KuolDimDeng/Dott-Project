import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth';

export async function GET(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const { id } = params;
    
    const db = await getDb();
    const result = await db.query(
      'SELECT * FROM inventory_service WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    return NextResponse.json({ service: result.rows[0] });
    
  } catch (error) {
    logger.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const { id } = params;
    const data = await request.json();
    
    const db = await getDb();
    
    // Check if service exists
    const checkResult = await db.query(
      'SELECT id FROM inventory_service WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    // Update service
    const updateQuery = `
      UPDATE inventory_service SET
        name = $1,
        description = $2,
        price = $3,
        duration = $4,
        is_recurring = $5,
        is_for_sale = $6,
        is_for_rent = $7,
        salestax = $8,
        charge_period = $9,
        charge_amount = $10,
        height = $11,
        width = $12,
        height_unit = $13,
        width_unit = $14,
        weight = $15,
        weight_unit = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17 AND tenant_id = $18
      RETURNING *
    `;
    
    const values = [
      data.name,
      data.description || null,
      data.price || 0,
      data.duration || null,
      data.is_recurring || false,
      data.is_for_sale !== undefined ? data.is_for_sale : true,
      data.is_for_rent || false,
      data.salestax || 0,
      data.charge_period || 'day',
      data.charge_amount || 0,
      data.height || null,
      data.width || null,
      data.height_unit || 'cm',
      data.width_unit || 'cm',
      data.weight || null,
      data.weight_unit || 'kg',
      id,
      tenantId
    ];
    
    const result = await db.query(updateQuery, values);
    
    return NextResponse.json({
      service: result.rows[0],
      message: 'Service updated successfully'
    });
    
  } catch (error) {
    logger.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const { id } = params;
    
    const db = await getDb();
    
    // Delete service
    const result = await db.query(
      'DELETE FROM inventory_service WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Service deleted successfully' });
    
  } catch (error) {
    logger.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}