import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantId } from '@/lib/tenantUtils';
import { serverAxiosInstance } from '@/lib/axiosConfig';

export async function GET(request, { params }) {
  try {
    // For now, we'll skip auth check and assume the request is authenticated
    // In a production environment, you would verify the session/token here
    
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const employeeId = params.id;
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const response = await serverAxiosInstance.get(`/api/taxes/forms/employee/${employeeId}/`, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching employee tax forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee tax forms' },
      { status: error.response?.status || 500 }
    );
  }
}