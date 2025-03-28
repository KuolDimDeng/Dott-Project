import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Get authenticated user
    const auth = await getAuth();
    if (!auth.user) {
      logger.error('[TenantCreate] User not authenticated');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Extract user ID
    const userId = auth.user.id;
    
    // Call backend API to create schema
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const apiUrl = `${backendUrl}/api/tenant/create/`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`
      },
      body: JSON.stringify({
        user_id: userId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('[TenantCreate] Error from backend API', { error });
      
      return NextResponse.json(
        { error: 'Failed to create tenant schema' },
        { status: response.status }
      );
    }

    const data = await response.json();
    logger.info('[TenantCreate] Successfully created tenant schema', { data });
    
    return NextResponse.json({
      success: true,
      tenant_id: data.tenant_id,
      schema_name: data.schema_name,
      message: 'Tenant schema created successfully'
    });
  } catch (error) {
    logger.error('[TenantCreate] Error creating tenant schema', { error: error.message });
    
    return NextResponse.json(
      { error: 'Failed to create tenant schema', message: error.message },
      { status: 500 }
    );
  }
} 