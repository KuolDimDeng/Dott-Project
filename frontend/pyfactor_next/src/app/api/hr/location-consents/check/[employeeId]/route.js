import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
  try {
    // Get session ID from sid cookie
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = params;
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Forward to Django backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dott-api-y26w.onrender.com';
    const response = await fetch(`${API_URL}/api/hr/location-consents/check/${employeeId}/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('[LocationConsent] Check failed:', { status: response.status, error });
      
      // Return default if not found
      if (response.status === 404) {
        return NextResponse.json({
          has_consented: false,
          tracking_enabled: false,
          employee_id: employeeId,
        });
      }
      
      return NextResponse.json({ error: 'Failed to check consent' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('[LocationConsent] Check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}