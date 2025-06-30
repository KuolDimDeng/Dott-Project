import { NextResponse } from 'next/server';
import { getServerUser } from '@/utils/getServerUser';

export async function POST(request) {
  try {
    console.log('[api/taxes/export] Export request received');
    
    // Validate authentication
    const userResult = await getServerUser(request);
    if (!userResult.isAuthenticated || !userResult.user) {
      console.error('[api/taxes/export] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tenantId, exportFormat = 'json' } = body;
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }
    
    // Fetch tax configuration from backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/taxes/export/`;
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-User-Email': userResult.user.email
      },
      body: JSON.stringify({
        format: exportFormat,
        include_history: true,
        include_locations: true
      })
    });
    
    if (!backendResponse.ok) {
      throw new Error('Failed to export tax configuration');
    }
    
    const exportData = await backendResponse.json();
    
    // Add metadata
    exportData.metadata = {
      exportDate: new Date().toISOString(),
      exportedBy: userResult.user.email,
      version: '2.0', // Enhanced version with multi-location support
      tenantId
    };
    
    return NextResponse.json({
      success: true,
      data: exportData
    });
    
  } catch (error) {
    console.error('[api/taxes/export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export tax configuration' },
      { status: 500 }
    );
  }
}