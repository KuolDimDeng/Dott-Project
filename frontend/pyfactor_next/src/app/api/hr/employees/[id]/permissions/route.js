import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantId } from '@/lib/tenantUtils';
import { axiosInstance } from '@/lib/axiosConfig';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const { id } = params;
    const body = await request.json();

    const response = await axiosInstance.post(`/api/hr/employees/${id}/permissions/`, body, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating employee permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update employee permissions' },
      { status: error.response?.status || 500 }
    );
  }
} 