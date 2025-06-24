import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request) {
  try {
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const { searchParams } = new URL(request.url);
    
    // Forward all query parameters to the backend
    const queryString = searchParams.toString();
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/audit/logs${queryString ? '?' + queryString : ''}`;
    
    // Get session cookie for authentication
    const cookieHeader = headersList.get('cookie') || '';
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'X-Tenant-ID': tenantId || '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}