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
    const billId = params.id;
    
    const db = await getDb();
    const query = `
      SELECT 
        b.*,
        v.vendor_name,
        v.vendor_number
      FROM purchases_bill b
      LEFT JOIN purchases_vendor v ON b.vendor_id = v.id AND v.tenant_id = $1
      WHERE b.id = $2 AND b.tenant_id = $1
    `;
    
    const result = await db.query(query, [tenantId, billId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ bill: result.rows[0] });
    
  } catch (error) {
    logger.error('Error fetching bill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill' },
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
    const billId = params.id;
    const data = await request.json();
    
    const db = await getDb();
    
    // Check if bill exists and belongs to tenant
    const checkResult = await db.query(
      'SELECT id FROM purchases_bill WHERE id = $1 AND tenant_id = $2',
      [billId, tenantId]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }
    
    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 0;
    
    const allowedFields = [
      'vendor_id', 'bill_date', 'due_date', 'totalAmount', 
      'currency', 'poso_number', 'notes', 'is_paid'
    ];
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        paramCount++;
        updateFields.push(`"${field === 'totalAmount' ? field : field}" = $${paramCount}`);
        values.push(data[field]);
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Add updated_at
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    
    // Add tenant_id and id to values
    values.push(tenantId, billId);
    
    const updateQuery = `
      UPDATE purchases_bill 
      SET ${updateFields.join(', ')}
      WHERE tenant_id = $${paramCount + 1} AND id = $${paramCount + 2}
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, values);
    
    // Fetch vendor info for response
    if (result.rows[0].vendor_id) {
      const vendorResult = await db.query(
        'SELECT vendor_name, vendor_number FROM purchases_vendor WHERE id = $1 AND tenant_id = $2',
        [result.rows[0].vendor_id, tenantId]
      );
      
      if (vendorResult.rows.length > 0) {
        result.rows[0].vendor_name = vendorResult.rows[0].vendor_name;
        result.rows[0].vendor_number = vendorResult.rows[0].vendor_number;
      }
    }
    
    return NextResponse.json({
      bill: result.rows[0],
      message: 'Bill updated successfully'
    });
    
  } catch (error) {
    logger.error('Error updating bill:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
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
    const billId = params.id;
    
    const db = await getDb();
    const result = await db.query(
      'DELETE FROM purchases_bill WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [billId, tenantId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Bill deleted successfully'
    });
    
  } catch (error) {
    logger.error('Error deleting bill:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
}