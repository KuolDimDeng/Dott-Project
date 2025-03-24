import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantId } from '@/lib/tenantUtils';
import { axiosInstance } from '@/lib/axiosConfig';

export async function GET(request) {
  try {
    // For now, we'll skip auth check and assume the request is authenticated
    // In a production environment, you would verify the session/token here
    
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const response = await axiosInstance.get(`/api/hr/employees/?q=${query}`, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    // For now, we'll skip auth check and assume the request is authenticated
    // In a production environment, you would verify the session/token here
    
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const response = await axiosInstance.post('/api/hr/employees/create/', body, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: error.response?.status || 500 }
    );
  }
} 