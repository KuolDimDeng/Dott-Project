import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantId } from '@/lib/tenantUtils';
import { serverAxiosInstance } from '@/lib/axiosConfig';

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

    const response = await serverAxiosInstance.get(`/api/taxes/forms/?q=${query}`, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching tax forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax forms' },
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

    const formData = await request.formData();
    
    const response = await serverAxiosInstance.post('/api/taxes/forms/', formData, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error creating tax form:', error);
    return NextResponse.json(
      { error: 'Failed to create tax form' },
      { status: error.response?.status || 500 }
    );
  }
}