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
    const { estimateIds } = await request.json();
    
    if (!Array.isArray(estimateIds) || estimateIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid estimate IDs provided' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Delete items for all estimates first
      const itemPlaceholders = estimateIds.map((_, index) => `$${index + 1}`).join(',');
      await db.query(
        `DELETE FROM sales_estimateitem WHERE estimate_id IN (${itemPlaceholders})`,
        estimateIds
      );
      
      // Delete estimates
      const placeholders = estimateIds.map((_, index) => `$${index + 2}`).join(',');
      const query = `
        DELETE FROM sales_estimate 
        WHERE tenant_id = $1 
        AND id IN (${placeholders})
        RETURNING id
      `;
      
      const values = [tenantId, ...estimateIds];
      const result = await db.query(query, values);
      
      // Commit transaction
      await db.query('COMMIT');
      
      return NextResponse.json({
        message: `${result.rows.length} estimates deleted successfully`,
        deletedCount: result.rows.length
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    logger.error('Error bulk deleting estimates:', error);
    return NextResponse.json(
      { error: 'Failed to delete estimates' },
      { status: 500 }
    );
  }
}