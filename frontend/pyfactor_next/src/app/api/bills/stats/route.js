import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth';

export async function GET(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const db = await getDb();
    
    // Get bill statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_paid = false THEN 1 END) as unpaid,
        COUNT(CASE WHEN is_paid = false AND due_date < CURRENT_DATE THEN 1 END) as overdue,
        COALESCE(SUM("totalAmount"), 0) as total_amount,
        COALESCE(SUM(CASE WHEN is_paid = false THEN "totalAmount" END), 0) as unpaid_amount
      FROM purchases_bill
      WHERE tenant_id = $1
    `;
    
    const result = await db.query(statsQuery, [tenantId]);
    const stats = result.rows[0];
    
    return NextResponse.json({
      stats: {
        total: parseInt(stats.total) || 0,
        unpaid: parseInt(stats.unpaid) || 0,
        overdue: parseInt(stats.overdue) || 0,
        totalAmount: parseFloat(stats.total_amount) || 0,
        unpaidAmount: parseFloat(stats.unpaid_amount) || 0
      }
    });
    
  } catch (error) {
    logger.error('Error fetching bill stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill statistics' },
      { status: 500 }
    );
  }
}