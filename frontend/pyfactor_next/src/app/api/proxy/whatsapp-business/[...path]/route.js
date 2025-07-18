import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Get the backend URL based on environment
const getBackendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_API_URL || 'https://api.dottapps.com';
  }
  return process.env.BACKEND_API_URL || 'https://127.0.0.1:8000';
};

// Helper function to get auth headers
async function getAuthHeaders() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value || cookieStore.get('sid')?.value;
  
  if (!sessionToken) {
    throw new Error('No session token found');
  }
  
  return {
    'Content-Type': 'application/json',
    'X-Session-Token': sessionToken,
    'Cookie': `sid=${sessionToken}; session_token=${sessionToken}`
  };
}

// Helper function to handle API requests
async function handleRequest(method, path, body = null) {
  try {
    const authHeaders = await getAuthHeaders();
    const backendUrl = getBackendUrl();
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    const url = `${backendUrl}/api/whatsapp-business/${apiPath}`;
    
    console.log(`[WhatsApp Proxy] ${method} ${url}`);
    
    const options = {
      method,
      headers: authHeaders,
    };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    // Handle empty responses
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const data = await response.json();
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`[WhatsApp Proxy] Error:`, error);
    
    if (error.message === 'No session token found') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to connect to WhatsApp Business API',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  return handleRequest('GET', params.path);
}

export async function POST(request, { params }) {
  const body = await request.json();
  return handleRequest('POST', params.path, body);
}

export async function PUT(request, { params }) {
  const body = await request.json();
  return handleRequest('PUT', params.path, body);
}

export async function PATCH(request, { params }) {
  const body = await request.json();
  return handleRequest('PATCH', params.path, body);
}

export async function DELETE(request, { params }) {
  return handleRequest('DELETE', params.path);
}