import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantId } from '@/lib/tenantUtils';
import { axiosInstance } from '@/lib/axiosConfig';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const response = await axiosInstance.get('/api/hr/permissions/available/', {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching available permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available permissions' },
      { status: error.response?.status || 500 }
    );
  }
} 