import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    // Get authenticated user
    const auth = await getAuth();
    if (!auth.user) {
      logger.error('[TenantVerify] User not authenticated');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Extract tenant ID from user
    const userId = auth.user.id;
    const tenantId = auth.user.tenant_id;

    if (!tenantId) {
      logger.error('[TenantVerify] User has no tenant_id', { userId });
      return NextResponse.json(
        { error: 'No tenant associated with user', schema_exists: false },
        { status: 200 }
      );
    }

    // Call backend API to verify schema existence
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/tenant/verify/`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('[TenantVerify] Error from backend API', { error });
      
      return NextResponse.json(
        { 
          error: 'Failed to verify tenant schema', 
          schema_exists: false,
          tenant_id: tenantId
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    logger.debug('[TenantVerify] Response from backend', { data });
    
    return NextResponse.json({
      tenant_id: tenantId,
      schema_name: data.schema_name,
      schema_exists: data.schema_exists,
      message: data.message || 'Tenant schema verified'
    });
  } catch (error) {
    logger.error('[TenantVerify] Error verifying tenant schema', { error: error.message });
    
    return NextResponse.json(
      { 
        error: 'Failed to verify tenant schema', 
        message: error.message,
        schema_exists: false
      },
      { status: 500 }
    );
  }
} 