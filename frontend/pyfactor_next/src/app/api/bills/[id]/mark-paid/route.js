import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth';

export async function POST(request, { params }) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const billId = params.id;
    
    const db = await getDb();
    
    // Update bill to mark as paid
    const updateQuery = `
      UPDATE purchases_bill 
      SET is_paid = true, 
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [billId, tenantId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }
    
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
      message: 'Bill marked as paid successfully'
    });
    
  } catch (error) {
    logger.error('Error marking bill as paid:', error);
    return NextResponse.json(
      { error: 'Failed to mark bill as paid' },
      { status: 500 }
    );
  }
}