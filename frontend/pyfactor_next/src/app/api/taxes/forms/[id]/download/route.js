import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantId } from '@/lib/tenantUtils';
import { axiosInstance } from '@/lib/axiosConfig';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const formId = params.id;
    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
    }

    const response = await axiosInstance.get(`/api/taxes/forms/${formId}/download/`, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
      },
      responseType: 'arraybuffer',
    });

    // Create a NextResponse with the file data
    const taxFormFile = new Blob([response.data], { type: response.headers['content-type'] });
    const fileName = response.headers['content-disposition']?.split('filename=')[1] || `tax_form_${formId}.pdf`;
    
    return new NextResponse(taxFormFile, {
      headers: {
        'Content-Type': response.headers['content-type'],
        'Content-Disposition': `attachment; filename=${fileName}`,
      },
    });
  } catch (error) {
    console.error('Error downloading tax form:', error);
    return NextResponse.json(
      { error: 'Failed to download tax form' },
      { status: error.response?.status || 500 }
    );
  }
}