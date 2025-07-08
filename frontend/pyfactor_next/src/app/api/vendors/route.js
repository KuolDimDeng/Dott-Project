import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateTenantAccess } from '@/utils/auth.server';

export async function GET(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (searchParams.get('page')) queryParams.append('page', searchParams.get('page'));
    if (searchParams.get('limit')) queryParams.append('limit', searchParams.get('limit'));
    if (searchParams.get('search')) queryParams.append('search', searchParams.get('search'));
    if (searchParams.get('sortBy')) queryParams.append('sortBy', searchParams.get('sortBy'));
    if (searchParams.get('sortOrder')) queryParams.append('sortOrder', searchParams.get('sortOrder'));
    if (searchParams.get('state')) queryParams.append('state', searchParams.get('state'));
    if (searchParams.get('city')) queryParams.append('city', searchParams.get('city'));
    
    // Call backend endpoint
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/purchases/api/vendors/?${queryParams.toString()}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization'),
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to fetch vendors' },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Validate tenant access
    const tenantValidation = await validateTenantAccess(request);
    if (!tenantValidation.success) {
      return NextResponse.json({ error: tenantValidation.error }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Call backend create endpoint
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/purchases/api/vendors/create/`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to create vendor' },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}