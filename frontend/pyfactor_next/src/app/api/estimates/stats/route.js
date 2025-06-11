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
    
    // Get estimate statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN (status IS NULL OR status = 'draft') AND valid_until >= CURRENT_DATE THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'sent' AND valid_until >= CURRENT_DATE THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN valid_until < CURRENT_DATE THEN 1 END) as expired,
        COALESCE(SUM("totalAmount"), 0) as total_value,
        COALESCE(SUM(CASE WHEN status = 'accepted' THEN "totalAmount" END), 0) as accepted_value
      FROM sales_estimate
      WHERE tenant_id = $1
    `;
    
    const result = await db.query(statsQuery, [tenantId]);
    const stats = result.rows[0];
    
    // Calculate acceptance rate
    const sent = parseInt(stats.sent) + parseInt(stats.accepted) + parseInt(stats.rejected);
    const acceptanceRate = sent > 0 ? (parseInt(stats.accepted) / sent) * 100 : 0;
    
    return NextResponse.json({
      stats: {
        total: parseInt(stats.total) || 0,
        draft: parseInt(stats.draft) || 0,
        sent: parseInt(stats.sent) || 0,
        accepted: parseInt(stats.accepted) || 0,
        rejected: parseInt(stats.rejected) || 0,
        expired: parseInt(stats.expired) || 0,
        totalValue: parseFloat(stats.total_value) || 0,
        acceptanceRate: Math.round(acceptanceRate)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching estimate stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch estimate statistics' },
      { status: 500 }
    );
  }
}