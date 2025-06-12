import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth.server';

export async function GET(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    
    const db = await getDb();
    
    // Get service statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_for_sale = true THEN 1 END) as active,
        COUNT(CASE WHEN is_recurring = true THEN 1 END) as recurring,
        COALESCE(SUM(price), 0) as total_value
      FROM inventory_service
      WHERE tenant_id = $1
    `;
    
    const result = await db.query(statsQuery, [tenantId]);
    const stats = result.rows[0];
    
    return NextResponse.json({
      stats: {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        recurring: parseInt(stats.recurring) || 0,
        totalValue: parseFloat(stats.total_value) || 0
      }
    });
    
  } catch (error) {
    logger.error('Error fetching service stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service statistics' },
      { status: 500 }
    );
  }
}