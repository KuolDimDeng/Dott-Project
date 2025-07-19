// Employee detail API v2 proxy route
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';

async function makeBackendRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle 204 No Content response
  if (response.status === 204) {
    return { response, data: null };
  }

  // Handle non-JSON responses
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      data = { error: 'Invalid JSON response' };
    }
  } else {
    // For non-JSON responses, get text
    data = { error: await response.text() };
  }
  
  return { response, data };
}

export async function GET(request, { params }) {
  try {
    const { employeeId } = params;
    logger.info(`[HR v2 Proxy] GET /api/hr/v2/employees/${employeeId}`);

    // Get session from cookies - await is required in Next.js 15
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      );
    }

    // Get tenant ID from headers
    const tenantId = request.headers.get('X-Tenant-ID');
    
    // Build headers for backend request
    const headers = {
      'Authorization': `Session ${sessionId.value}`,
      'Cookie': `session_token=${sessionId.value}`,
    };
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    // Make request to Django backend
    const backendUrl = `${BACKEND_URL}/api/hr/v2/employees/${employeeId}/`;
    const { response, data } = await makeBackendRequest(backendUrl, {
      method: 'GET',
      headers,
    });

    logger.info(`[HR v2 Proxy] Backend response: ${response.status}`);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    logger.error('[HR v2 Proxy] GET detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { employeeId } = params;
    logger.info(`[HR v2 Proxy] PUT /api/hr/v2/employees/${employeeId}`);

    // Get session from cookies - await is required in Next.js 15
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();

    // Get tenant ID from headers
    const tenantId = request.headers.get('X-Tenant-ID');
    
    // Build headers for backend request
    const headers = {
      'Authorization': `Session ${sessionId.value}`,
      'Cookie': `session_token=${sessionId.value}`,
    };
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    // Make request to Django backend
    const backendUrl = `${BACKEND_URL}/api/hr/v2/employees/${employeeId}/`;
    const { response, data } = await makeBackendRequest(backendUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    logger.info(`[HR v2 Proxy] Backend response: ${response.status}`);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    logger.error('[HR v2 Proxy] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { employeeId } = params;
    logger.info(`[HR v2 Proxy] DELETE /api/hr/v2/employees/${employeeId}`);

    // Get session from cookies - await is required in Next.js 15
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized - No session' },
        { status: 401 }
      );
    }

    // Get tenant ID from headers
    const tenantId = request.headers.get('X-Tenant-ID');
    
    // Build headers for backend request
    const headers = {
      'Authorization': `Session ${sessionId.value}`,
      'Cookie': `session_token=${sessionId.value}`,
    };
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    // Make request to Django backend
    const backendUrl = `${BACKEND_URL}/api/hr/v2/employees/${employeeId}/`;
    const { response, data } = await makeBackendRequest(backendUrl, {
      method: 'DELETE',
      headers,
    });

    logger.info(`[HR v2 Proxy] Backend response: ${response.status}`);
    
    // Return appropriate response
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    return NextResponse.json(data || { success: true }, { status: response.status });
    
  } catch (error) {
    logger.error('[HR v2 Proxy] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}