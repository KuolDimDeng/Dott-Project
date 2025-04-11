import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTenantId } from '@/lib/tenantUtils';
import { serverAxiosInstance } from '@/lib/axiosConfig';
import { validateServerSession } from '@/utils/serverUtils';

export async function GET(request) {
  try {
    // Validate the session and get tokens
    let session;
    try {
      session = await validateServerSession();
      if (!session || !session.tokens || !session.tokens.accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    // Get tenant ID from request or session
    const tenantId = await getTenantId(request) || session.user?.attributes?.['custom:businessid'];
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const response = await serverAxiosInstance.get(`${API_URL}/api/hr/employees/?q=${query}`, {
      headers: {
        'Authorization': `Bearer ${session.tokens.accessToken}`,
        'X-Id-Token': session.tokens.idToken,
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
        'X-Business-ID': tenantId,
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
    // Validate the session and get tokens
    let session;
    try {
      session = await validateServerSession();
      if (!session || !session.tokens || !session.tokens.accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    // Get tenant ID from request or session
    const tenantId = await getTenantId(request) || session.user?.attributes?.['custom:businessid'];
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const response = await serverAxiosInstance.post(`${API_URL}/api/hr/employees/create/`, body, {
      headers: {
        'Authorization': `Bearer ${session.tokens.accessToken}`,
        'X-Id-Token': session.tokens.idToken,
        'X-Tenant-ID': tenantId,
        'X-Schema-Name': `tenant_${tenantId.replace(/-/g, '_')}`,
        'X-Business-ID': tenantId,
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