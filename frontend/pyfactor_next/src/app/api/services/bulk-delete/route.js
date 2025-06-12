import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth.server';

export async function POST(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { tenantId } = tenantValidation;
    const { serviceIds } = await request.json();
    
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Service IDs array is required' },
        { status: 400 }
      );
    }
    
    const db = await getDb();
    
    // Create placeholders for the query
    const placeholders = serviceIds.map((_, index) => `$${index + 2}`).join(',');
    
    // Delete services
    const result = await db.query(
      `DELETE FROM inventory_service 
       WHERE tenant_id = $1 
       AND id IN (${placeholders})
       RETURNING id`,
      [tenantId, ...serviceIds]
    );
    
    return NextResponse.json({
      message: `${result.rows.length} services deleted successfully`,
      deletedCount: result.rows.length
    });
    
  } catch (error) {
    logger.error('Error bulk deleting services:', error);
    return NextResponse.json(
      { error: 'Failed to delete services' },
      { status: 500 }
    );
  }
}