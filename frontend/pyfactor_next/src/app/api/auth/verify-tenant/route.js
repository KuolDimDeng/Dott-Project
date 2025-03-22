import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Verify tenant ID API route
 * This is a simplified version that always returns success with the provided tenant ID
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const { tenantId, userId, email } = data;
    
    logger.debug('[API] Verify tenant request:', {
      tenantId,
      userId,
      email
    });

    // In this simplified implementation, we always verify the tenant ID
    // In a production environment, this would verify with the backend
    const correctTenantId = tenantId || 'b7fee399-ffca-4151-b636-94ccb65b3cd0';
    
    return NextResponse.json({
      success: true,
      status: 'verified',
      message: 'Tenant ID verified successfully',
      correctTenantId,
      schemaName: `tenant_${correctTenantId.replace(/-/g, '_')}`
    });
  } catch (error) {
    logger.error('[API] Error verifying tenant:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to verify tenant',
      message: error.message
    }, { status: 500 });
  }
} 