import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth';

export async function POST(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const { billIds } = await request.json();
    
    if (!Array.isArray(billIds) || billIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid bill IDs provided' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Create parameterized query for bulk delete
    const placeholders = billIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      DELETE FROM purchases_bill 
      WHERE tenant_id = $1 
      AND id IN (${placeholders})
      RETURNING id
    `;
    
    const values = [tenantId, ...billIds];
    const result = await db.query(query, values);
    
    return NextResponse.json({
      message: `${result.rows.length} bills deleted successfully`,
      deletedCount: result.rows.length
    });
    
  } catch (error) {
    logger.error('Error bulk deleting bills:', error);
    return NextResponse.json(
      { error: 'Failed to delete bills' },
      { status: 500 }
    );
  }
}